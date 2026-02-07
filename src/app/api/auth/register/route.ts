import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-service';

/**
 * POST /api/auth/register
 * Proxies registration to the external auth service and sets tokens as HttpOnly cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    const result = await registerUser(email, password, firstName, lastName);

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
        maxAge: 15 * 60,
      });

      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: result.message || 'Registration failed' },
      { status: result.message?.includes('already') ? 409 : 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Auth service unavailable' },
      { status: 503 }
    );
  }
}
