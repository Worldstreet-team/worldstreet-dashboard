import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth-service';

/**
 * POST /api/auth/login
 * Proxies login to the external auth service and sets tokens as HttpOnly cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    if (result.success && result.data?.tokens && result.data?.user) {
      const { accessToken, refreshToken } = result.data.tokens;

      const response = NextResponse.json({
        success: true,
        message: result.message,
        user: result.data.user,
      });

      // Set tokens as HttpOnly cookies
      response.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60, // 15 minutes
      });

      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: result.message || 'Login failed' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Auth service unavailable' },
      { status: 503 }
    );
  }
}
