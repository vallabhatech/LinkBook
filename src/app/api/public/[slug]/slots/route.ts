import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTimeSlots, getDayOfWeek } from '@/lib/slots';

type RouteParams = { params: Promise<{ slug: string }> };

// Get available slots for a provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const serviceId = url.searchParams.get('serviceId');
    const date = url.searchParams.get('date');

    if (!serviceId || !date) {
      return NextResponse.json(
        { error: 'serviceId and date are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const provider = await prisma.serviceProvider.findUnique({
      where: { slug },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get the service
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        serviceProviderId: provider.id,
        active: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Get working hours for the day
    const dayOfWeek = getDayOfWeek(date);
    const workingHours = await prisma.workingHours.findFirst({
      where: {
        serviceProviderId: provider.id,
        dayOfWeek,
      },
    });

    if (!workingHours || !workingHours.isOpen) {
      return NextResponse.json({
        slots: [],
        message: 'Provider is closed on this day',
      });
    }

    // Get existing bookings for the date
    const existingBookings = await prisma.booking.findMany({
      where: {
        serviceProviderId: provider.id,
        date,
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    // Generate available slots
    const slots = generateTimeSlots(
      {
        dayOfWeek: workingHours.dayOfWeek,
        isOpen: workingHours.isOpen,
        openTime: workingHours.openTime,
        closeTime: workingHours.closeTime,
        breakStart: workingHours.breakStart,
        breakEnd: workingHours.breakEnd,
      },
      service.durationMinutes,
      existingBookings
    );

    // Filter to only available slots
    const availableSlots = slots.filter(slot => slot.available);

    return NextResponse.json({
      slots: availableSlots,
      serviceDuration: service.durationMinutes,
    });
  } catch (error) {
    console.error('Get slots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
