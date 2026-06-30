import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { workingHoursSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

// Get working hours for a provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const workingHours = await prisma.workingHours.findMany({
      where: { serviceProviderId: id },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({ workingHours });
  } catch (error) {
    console.error('Get working hours error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update working hours
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Not authorized to update this provider' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Body can be a single working hours object or an array
    const workingHoursArray = Array.isArray(body) ? body : [body];
    
    const results = [];
    
    for (const wh of workingHoursArray) {
      const validatedData = workingHoursSchema.parse(wh);
      
      // Upsert working hours
      const result = await prisma.workingHours.upsert({
        where: {
          serviceProviderId_dayOfWeek: {
            serviceProviderId: id,
            dayOfWeek: validatedData.dayOfWeek,
          },
        },
        update: {
          isOpen: validatedData.isOpen,
          openTime: validatedData.openTime,
          closeTime: validatedData.closeTime,
          breakStart: validatedData.breakStart || null,
          breakEnd: validatedData.breakEnd || null,
        },
        create: {
          serviceProviderId: id,
          dayOfWeek: validatedData.dayOfWeek,
          isOpen: validatedData.isOpen,
          openTime: validatedData.openTime,
          closeTime: validatedData.closeTime,
          breakStart: validatedData.breakStart || null,
          breakEnd: validatedData.breakEnd || null,
        },
      });
      
      results.push(result);
    }

    return NextResponse.json({ workingHours: results }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Create working hours error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
