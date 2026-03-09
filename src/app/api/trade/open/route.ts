import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * POST /api/trade/open
 * Opens a new spot trade position
 * 
 * Request body:
 * {
 *   "chain": "ETH" | "SOL",
 *   "tokenIn": "USDT",
 *   "tokenOut": "ETH",
 *   "amountIn": "1000000000000000000", // smallest unit (18 decimals)
 *   "side": "BUY" | "SELL",
 *   "slippage": 0.005 // optional, default 0.5%
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
    const { chain, tokenIn, tokenOut, amountIn, side, slippage = 0.005 } = body;

    // Validate required fields
    if (!chain || !tokenIn || !tokenOut || !amountIn || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: chain, tokenIn, tokenOut, amountIn, side' },
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

    console.log('[Trade Open API] Opening trade:', {
      userId,
      chain,
      tokenIn,
      tokenOut,
      amountIn,
      side,
      slippage
    });

    const response = await fetch(
      `${BACKEND_URL}/api/trade/open`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chain,
          tokenIn,
          tokenOut,
          amountIn,
          side,
          slippage
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Trade Open API] Backend error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to open trade', message: data.message },
        { status: response.status }
      );
    }

    console.log('[Trade Open API] Trade opened successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trade Open API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
