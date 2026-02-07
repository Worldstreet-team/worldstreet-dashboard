import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth-service';

/**
 * POST /api/auth/logout
 * Reads refreshToken from cookies, calls auth service to revoke it,
 * then clears both cookies.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Call the auth service to revoke the refresh token
  if (refreshToken) {
    try {
      await logoutUser(refreshToken);
    } catch {
      // Even if the auth service call fails, we still clear cookies
    }
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear both cookies
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
