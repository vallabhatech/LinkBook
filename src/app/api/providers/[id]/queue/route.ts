import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { format } from 'date-fns';

type RouteParams = { params: Promise<{ id: string }> };

// Get queue for a provider
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
        { error: 'Not authorized to view queue for this provider' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const tokens = await prisma.queueToken.findMany({
      where: {
        serviceProviderId: id,
        date,
      },
      orderBy: { tokenNumber: 'asc' },
    });

    // Find current serving token
    const servingToken = tokens.find(t => t.status === 'serving');
    const waitingTokens = tokens.filter(t => t.status === 'waiting');
    const completedTokens = tokens.filter(t => t.status === 'completed');

    return NextResponse.json({
      tokens,
      currentToken: servingToken?.tokenNumber || null,
      waitingCount: waitingTokens.length,
      completedCount: completedTokens.length,
      queueEnabled: provider.queueEnabled,
    });
  } catch (error) {
    console.error('Get queue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Toggle queue enabled/disabled
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
        { error: 'Not authorized to update queue for this provider' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { queueEnabled } = body;

    const updatedProvider = await prisma.serviceProvider.update({
      where: { id },
      data: { queueEnabled },
    });

    return NextResponse.json({ queueEnabled: updatedProvider.queueEnabled });
  } catch (error) {
    console.error('Update queue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
