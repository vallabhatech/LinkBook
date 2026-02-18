import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { calculateEndTime, isValidBookingTime, getDayOfWeek } from '@/lib/slots';

type RouteParams = { params: Promise<{ slug: string }> };

// Create a booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

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
        id: validatedData.serviceId,
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

    // Calculate end time
    const endTime = calculateEndTime(validatedData.startTime, service.durationMinutes);

    // Get working hours for the day
    const dayOfWeek = getDayOfWeek(validatedData.date);
    const workingHours = await prisma.workingHours.findFirst({
      where: {
        serviceProviderId: provider.id,
        dayOfWeek,
      },
    });

    // Validate booking time against working hours
    if (!workingHours || !isValidBookingTime(
      {
        dayOfWeek: workingHours.dayOfWeek,
        isOpen: workingHours.isOpen,
        openTime: workingHours.openTime,
        closeTime: workingHours.closeTime,
        breakStart: workingHours.breakStart,
        breakEnd: workingHours.breakEnd,
      },
      validatedData.startTime,
      endTime
    )) {
      return NextResponse.json(
        { error: 'Selected time is not within working hours' },
        { status: 400 }
      );
    }

    // Check for conflicting bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        serviceProviderId: provider.id,
        date: validatedData.date,
        status: {
          in: ['pending', 'confirmed'],
        },
        OR: [
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: validatedData.startTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        serviceProviderId: provider.id,
        serviceId: validatedData.serviceId,
        staffId: validatedData.staffId || null,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || null,
        notes: validatedData.notes || null,
        date: validatedData.date,
        startTime: validatedData.startTime,
        endTime,
        status: 'pending',
      },
      include: {
        service: true,
      },
    });

    // In a real app, send notification here
    console.log(`Booking created: ${booking.id} - Notification would be sent to provider`);

    return NextResponse.json({
      booking: {
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        service: {
          name: booking.service.name,
          price: booking.service.price,
          duration: booking.service.durationMinutes,
        },
      },
      message: 'Booking created successfully. You will receive a confirmation soon.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Create booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
