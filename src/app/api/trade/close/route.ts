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
    const { tradeId, slippage = 0.005 } = body;

    // Validation
    if (!tradeId) {
      return NextResponse.json(
        { error: 'Missing required fields', details: ['tradeId is required'] },
        { status: 400 }
      );
    }

    if (typeof slippage !== 'number' || slippage < 0 || slippage > 0.5) {
      return NextResponse.json(
        { error: 'Invalid slippage', details: ['slippage must be between 0 and 0.5'] },
        { status: 400 }
      );
    }

    console.log('[Close Trade] Request:', {
      userId: authUser.userId,
      tradeId,
      slippage
    });

    // Call backend
    const response = await fetch(`${BACKEND_URL}/api/trade/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authUser.userId,
        tradeId,
        slippage
      })
    });

    const data = await response.json();

    console.log('[Close Trade] Backend response:', {
      status: response.status,
      success: response.ok,
      pnl: data.trade?.pnl_realized
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error || 'Failed to close trade',
          message: data.message,
          details: data.details
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Close Trade] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
