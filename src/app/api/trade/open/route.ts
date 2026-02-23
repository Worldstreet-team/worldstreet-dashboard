import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const BACKEND_URL = 'https://trading.watchup.site';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      chain,
      tokenIn,
      tokenOut,
      amountIn,
      side,
      slippage = 0.005
    } = body;

    // Validation
    if (!chain || !tokenIn || !tokenOut || !amountIn || !side) {
      return NextResponse.json(
        { error: 'Missing required fields', details: ['chain, tokenIn, tokenOut, amountIn, and side are required'] },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid side', details: ['side must be BUY or SELL'] },
        { status: 400 }
      );
    }

    if (typeof slippage !== 'number' || slippage < 0 || slippage > 0.5) {
      return NextResponse.json(
        { error: 'Invalid slippage', details: ['slippage must be between 0 and 0.5'] },
        { status: 400 }
      );
    }

    console.log('[Open Trade] Request:', {
      userId: authUser.userId,
      chain,
      tokenIn,
      tokenOut,
      amountIn,
      side,
      slippage
    });

    // Call backend
    const response = await fetch(`${BACKEND_URL}/api/trade/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authUser.userId,
        chain,
        tokenIn,
        tokenOut,
        amountIn,
        side: side.toUpperCase(),
        slippage
      })
    });

    const data = await response.json();

    console.log('[Open Trade] Backend response:', {
      status: response.status,
      success: response.ok,
      tradeId: data.trade?.id
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error || 'Failed to open trade',
          message: data.message,
          details: data.details
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Open Trade] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
