import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { bookingStatusSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

// Update booking status
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        serviceProvider: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (booking.serviceProvider.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this booking' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = bookingStatusSchema.parse(body);

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: validatedData.status },
      include: {
        service: true,
        staff: true,
      },
    });

    // In a real app, send notification to customer here
    console.log(`Booking ${id} status updated to ${validatedData.status} - Notification would be sent to customer`);

    return NextResponse.json({ booking: updatedBooking });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Update booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get a single booking
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

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
        staff: true,
        serviceProvider: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (booking.serviceProvider.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Not authorized to view this booking' },
        { status: 403 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
