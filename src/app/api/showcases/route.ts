import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const whereClause = search
      ? { title: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [showcases, total] = await Promise.all([
      prisma.showcaseItem.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          showcase: {
            include: {
              user: { select: { id: true, username: true, email: true } },
            },
          },
          tags: { select: { nameTag: true } },
        },
      }),
      prisma.showcaseItem.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: showcases,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Fetch showcases error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
