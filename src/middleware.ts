import { NextRequest, NextResponse } from 'next/server';

const LOGIN_URL = 'https://worldstreetgold.com/login';

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/auth',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
  '/worldstreet-logo',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow API routes that aren't auth-related (streams, webhooks, etc.)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check for access token or refresh token
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // If neither token exists, redirect to external login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(LOGIN_URL);
  }

  // If tokens exist, let the request through.
  // The client-side AuthProvider will handle actual verification
  // and token refresh via the /api/auth/verify route.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|images|worldstreet-logo).*)',
  ],
};
