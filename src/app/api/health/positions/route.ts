import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/health/positions
 * Health check for position system (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/health/positions`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { status: 'unhealthy', error: errorData.error || 'Backend health check failed' },
        { status: response.status }
      );
    }

    const health = await response.json();
    return NextResponse.json(health);
  } catch (error) {
    console.error('[Health Check API] Error:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
