import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export async function PUT(req: Request) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ message: 'Refresh token is required' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.userId !== payload.sub) {
      return NextResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const newAccessToken = generateAccessToken(storedToken.user.id, storedToken.user.email, storedToken.user.role);
    const newRefreshToken = generateRefreshToken(storedToken.user.id);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
