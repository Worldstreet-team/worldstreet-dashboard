import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * POST /api/trade/close
 * Closes an existing open trade position
 * 
 * Request body:
 * {
 *   "tradeId": "uuid-here",
 *   "slippage": 0.005 // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tradeId, slippage = 0.005 } = body;

    // Validate required fields
    if (!tradeId) {
      return NextResponse.json(
        { error: 'Missing required field: tradeId' },
        { status: 400 }
      );
    }

    // Validate slippage
    if (slippage < 0 || slippage > 0.5) {
      return NextResponse.json(
        { error: 'Slippage must be between 0 and 0.5 (0-50%)' },
        { status: 400 }
      );
    }

    console.log('[Trade Close API] Closing trade:', {
      userId,
      tradeId,
      slippage
    });

    const response = await fetch(
      `${BACKEND_URL}/api/trade/close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tradeId,
          slippage
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Trade Close API] Backend error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to close trade', message: data.message },
        { status: response.status }
      );
    }

    console.log('[Trade Close API] Trade closed successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trade Close API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
