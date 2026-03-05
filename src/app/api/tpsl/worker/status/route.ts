import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/tpsl/worker/status
 * Get TP/SL worker status (public endpoint for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/tpsl/worker/status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch worker status' },
        { status: response.status }
      );
    }

    const status = await response.json();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[TP/SL Worker Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
