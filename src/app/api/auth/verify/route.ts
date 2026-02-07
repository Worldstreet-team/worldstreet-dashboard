import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, refreshTokens } from '@/lib/auth-service';

/**
 * GET /api/auth/verify
 * Reads accessToken from cookies, verifies with external auth service.
 * If expired, attempts refresh using refreshToken cookie.
 * Returns user data on success.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // No access token at all
  if (!accessToken) {
    // Try refresh if we have a refresh token
    if (refreshToken) {
      return await attemptRefresh(refreshToken);
    }
    return NextResponse.json(
      { success: false, message: 'No authentication tokens found' },
      { status: 401 }
    );
  }

  // Verify the access token with the auth service
  try {
    const result = await verifyToken(accessToken);

    if (result.success && result.data?.user) {
      return NextResponse.json({
        success: true,
        user: result.data.user,
      });
    }

    // Access token invalid/expired — try refresh
    if (refreshToken) {
      return await attemptRefresh(refreshToken);
    }

    return NextResponse.json(
      { success: false, message: 'Token verification failed' },
      { status: 401 }
    );
  } catch (error) {
    // Network error talking to auth service — try refresh
    if (refreshToken) {
      return await attemptRefresh(refreshToken);
    }
    return NextResponse.json(
      { success: false, message: 'Auth service unavailable' },
      { status: 503 }
    );
  }
}

/**
 * Attempt to refresh tokens and verify the new access token.
 */
async function attemptRefresh(refreshToken: string): Promise<NextResponse> {
  try {
    const refreshResult = await refreshTokens(refreshToken);

    if (
      refreshResult.success &&
      refreshResult.data?.tokens?.accessToken &&
      refreshResult.data?.tokens?.refreshToken
    ) {
      const newAccessToken = refreshResult.data.tokens.accessToken;
      const newRefreshToken = refreshResult.data.tokens.refreshToken;

      // Verify the new access token to get user data
      const verifyResult = await verifyToken(newAccessToken);

      if (verifyResult.success && verifyResult.data?.user) {
        const response = NextResponse.json({
          success: true,
          refreshed: true,
          user: verifyResult.data.user,
        });

        // Set the new tokens as cookies
        response.cookies.set('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60, // 15 minutes
        });

        response.cookies.set('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
      }
    }

    return NextResponse.json(
      { success: false, message: 'Token refresh failed' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Token refresh failed' },
      { status: 401 }
    );
  }
}
