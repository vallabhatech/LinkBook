import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import QRCode from 'qrcode';

type RouteParams = { params: Promise<{ id: string }> };

// Generate QR code for provider's booking page
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
        { error: 'Not authorized to generate QR code for this provider' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'booking'; // booking or queue

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const targetUrl = type === 'queue'
      ? `${appUrl}/queue/${provider.slug}`
      : `${appUrl}/book/${provider.slug}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      url: targetUrl,
      type,
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
