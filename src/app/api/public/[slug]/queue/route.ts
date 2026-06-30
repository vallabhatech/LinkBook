import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queueTokenSchema } from '@/lib/validations';
import { format } from 'date-fns';

type RouteParams = { params: Promise<{ slug: string }> };

const AVERAGE_SERVICE_TIME = 15; // minutes per customer

// Get queue status (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const tokenId = url.searchParams.get('tokenId');

    const provider = await prisma.serviceProvider.findUnique({
      where: { slug },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!provider.queueEnabled) {
      return NextResponse.json(
        { error: 'Queue is not enabled for this provider' },
        { status: 400 }
      );
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all tokens for today
    const tokens = await prisma.queueToken.findMany({
      where: {
        serviceProviderId: provider.id,
        date: today,
      },
      orderBy: { tokenNumber: 'asc' },
    });

    const servingToken = tokens.find(t => t.status === 'serving');
    const waitingTokens = tokens.filter(t => t.status === 'waiting');

    // If a specific token is requested, return its position
    if (tokenId) {
      const myToken = tokens.find(t => t.id === tokenId);
      if (!myToken) {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        );
      }

      let position = 0;
      let estimatedWaitTime = 0;

      if (myToken.status === 'waiting') {
        position = waitingTokens.findIndex(t => t.id === tokenId) + 1;
        estimatedWaitTime = position * AVERAGE_SERVICE_TIME;
      } else if (myToken.status === 'serving') {
        position = 0;
        estimatedWaitTime = 0;
      }

      return NextResponse.json({
        token: {
          id: myToken.id,
          tokenNumber: myToken.tokenNumber,
          status: myToken.status,
          position,
          estimatedWaitTime,
        },
        currentlyServing: servingToken?.tokenNumber || null,
        totalWaiting: waitingTokens.length,
      });
    }

    // Return general queue status
    return NextResponse.json({
      currentlyServing: servingToken?.tokenNumber || null,
      totalWaiting: waitingTokens.length,
      estimatedWaitTime: waitingTokens.length * AVERAGE_SERVICE_TIME,
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

// Get a new queue token
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    const validatedData = queueTokenSchema.parse(body);

    const provider = await prisma.serviceProvider.findUnique({
      where: { slug },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!provider.queueEnabled) {
      return NextResponse.json(
        { error: 'Queue is not enabled for this provider' },
        { status: 400 }
      );
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get the last token number for today
    const lastToken = await prisma.queueToken.findFirst({
      where: {
        serviceProviderId: provider.id,
        date: today,
      },
      orderBy: { tokenNumber: 'desc' },
    });

    const newTokenNumber = (lastToken?.tokenNumber || 0) + 1;

    // Count waiting tokens for estimated wait time
    const waitingCount = await prisma.queueToken.count({
      where: {
        serviceProviderId: provider.id,
        date: today,
        status: 'waiting',
      },
    });

    const estimatedWaitTime = waitingCount * AVERAGE_SERVICE_TIME;

    // Create new token
    const token = await prisma.queueToken.create({
      data: {
        serviceProviderId: provider.id,
        tokenNumber: newTokenNumber,
        customerName: validatedData.customerName || null,
        customerPhone: validatedData.customerPhone || null,
        status: 'waiting',
        estimatedWaitTime,
        date: today,
      },
    });

    return NextResponse.json({
      token: {
        id: token.id,
        tokenNumber: token.tokenNumber,
        status: token.status,
        estimatedWaitTime,
        position: waitingCount + 1,
      },
      message: `You are #${token.tokenNumber}. Estimated wait time: ${estimatedWaitTime} minutes.`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    console.error('Create queue token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
