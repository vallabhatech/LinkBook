import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { queueStatusSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

// Update queue token status
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

    // Find the queue token
    const queueToken = await prisma.queueToken.findUnique({
      where: { id },
      include: {
        serviceProvider: true,
      },
    });

    if (!queueToken) {
      return NextResponse.json(
        { error: 'Queue token not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (queueToken.serviceProvider.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this queue token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = queueStatusSchema.parse(body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status: validatedData.status,
    };

    // Set served at time when status changes to serving
    if (validatedData.status === 'serving' && queueToken.status !== 'serving') {
      updateData.servedAt = new Date();
    }

    // Set completed at time when status changes to completed
    if (validatedData.status === 'completed' && queueToken.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ token: updatedToken });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Update queue token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
