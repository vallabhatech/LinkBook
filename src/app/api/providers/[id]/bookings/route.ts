import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

type RouteParams = { params: Promise<{ id: string }> };

// Get bookings for a provider
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
        { error: 'Not authorized to view bookings for this provider' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      serviceProviderId: id,
    };

    if (date) {
      where.date = date;
    } else if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        staff: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
