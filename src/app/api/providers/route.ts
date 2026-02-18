import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { serviceProviderSchema } from '@/lib/validations';

// Create a new service provider
export async function POST(request: NextRequest) {
  try {
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

    // Check if user already has a service provider
    const existingProvider = await prisma.serviceProvider.findUnique({
      where: { userId: payload.userId },
    });

    if (existingProvider) {
      return NextResponse.json(
        { error: 'User already has a service provider' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = serviceProviderSchema.parse(body);

    // Check if slug is already taken
    const slugExists = await prisma.serviceProvider.findUnique({
      where: { slug: validatedData.slug },
    });

    if (slugExists) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 400 }
      );
    }

    // Create service provider
    const provider = await prisma.serviceProvider.create({
      data: {
        userId: payload.userId,
        businessName: validatedData.businessName,
        category: validatedData.category,
        description: validatedData.description || null,
        address: validatedData.address || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        slug: validatedData.slug,
      },
    });

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Create provider error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get current user's service provider
export async function GET(request: NextRequest) {
  try {
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

    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: payload.userId },
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
