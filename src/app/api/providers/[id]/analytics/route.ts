import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type RouteParams = { params: Promise<{ id: string }> };

// Get analytics for a provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify ownership
    const provider = await prisma.serviceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      );
    }

    if (provider.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Not authorized to view analytics for this provider' },
        { status: 403 }
      );
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(today), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    const last7Days = format(subDays(today, 7), 'yyyy-MM-dd');

    // Total bookings by status
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      where: { serviceProviderId: id },
      _count: { id: true },
    });

    // Today's bookings count
    const todaysBookings = await prisma.booking.count({
      where: {
        serviceProviderId: id,
        date: todayStr,
      },
    });

    // This week's bookings count
    const thisWeekBookings = await prisma.booking.count({
      where: {
        serviceProviderId: id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // This month's bookings count
    const thisMonthBookings = await prisma.booking.count({
      where: {
        serviceProviderId: id,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Top services (most booked)
    const topServices = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { serviceProviderId: id },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Get service names
    const serviceIds = topServices.map(s => s.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    const topServicesWithNames = topServices.map(s => ({
      serviceId: s.serviceId,
      serviceName: services.find(svc => svc.id === s.serviceId)?.name || 'Unknown',
      count: s._count.id,
    }));

    // Peak hours (bookings per hour)
    const allBookings = await prisma.booking.findMany({
      where: { serviceProviderId: id },
      select: { startTime: true },
    });

    const hourlyDistribution: Record<number, number> = {};
    allBookings.forEach(booking => {
      const hour = parseInt(booking.startTime.split(':')[0], 10);
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Find peak hours
    const peakHours = Object.entries(hourlyDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }));

    // Bookings per day (last 7 days)
    const last7DaysBookings = await prisma.booking.groupBy({
      by: ['date'],
      where: {
        serviceProviderId: id,
        date: {
          gte: last7Days,
          lte: todayStr,
        },
      },
      _count: { id: true },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      summary: {
        today: todaysBookings,
        thisWeek: thisWeekBookings,
        thisMonth: thisMonthBookings,
      },
      bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      topServices: topServicesWithNames,
      peakHours,
      dailyBookings: last7DaysBookings.map(d => ({
        date: d.date,
        count: d._count.id,
      })),
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
