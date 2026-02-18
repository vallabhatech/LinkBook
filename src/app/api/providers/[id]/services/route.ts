import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { serviceSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

// Get services for a provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const services = await prisma.service.findMany({
      where: {
        serviceProviderId: id,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new service
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
        { error: 'Not authorized to add services to this provider' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        serviceProviderId: id,
        name: validatedData.name,
        description: validatedData.description || null,
        price: validatedData.price,
        durationMinutes: validatedData.durationMinutes,
        active: validatedData.active ?? true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
