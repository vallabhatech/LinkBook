import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ slug: string }> };

// Get public provider profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const provider = await prisma.serviceProvider.findUnique({
      where: { slug },
      include: {
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        services: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Return public-safe data only
    return NextResponse.json({
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        category: provider.category,
        description: provider.description,
        address: provider.address,
        phone: provider.phone,
        email: provider.email,
        logoUrl: provider.logoUrl,
        slug: provider.slug,
        queueEnabled: provider.queueEnabled,
        workingHours: provider.workingHours,
        services: provider.services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          durationMinutes: s.durationMinutes,
        })),
      },
    });
  } catch (error) {
    console.error('Get public provider error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
