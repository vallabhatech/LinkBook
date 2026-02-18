import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { serviceProviderSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

// Get a service provider by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const provider = await prisma.serviceProvider.findUnique({
      where: { id },
      include: {
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        services: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
        staff: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Get provider error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a service provider
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
    const validatedData = serviceProviderSchema.partial().parse(body);

    // If slug is being changed, check if it's already taken
    if (validatedData.slug && validatedData.slug !== provider.slug) {
      const slugExists = await prisma.serviceProvider.findUnique({
        where: { slug: validatedData.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'This slug is already taken' },
          { status: 400 }
        );
      }
    }

    const updatedProvider = await prisma.serviceProvider.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ provider: updatedProvider });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Update provider error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
