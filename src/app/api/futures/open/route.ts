import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

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
    const { chain, market, marketIndex, side, size, leverage, orderType, limitPrice } = body;

    if (!chain || !market || !side || !size || !leverage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Determine marketIndex if not provided
    let finalMarketIndex = marketIndex;
    if (finalMarketIndex === undefined) {
      // Try to extract from market symbol or default to 0
      finalMarketIndex = 0;
    }

    const response = await fetch(`${BASE_API_URL}/api/futures/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        chain,
        marketIndex: finalMarketIndex,
        market,
        side: side.toUpperCase(),
        size: size.toString(),
        leverage,
        limitPrice: limitPrice ? limitPrice.toString() : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to open position' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      { 
        message: data.message,
        positionId: data.positionId,
        txHash: data.txHash,
        entryPrice: data.entryPrice,
        liquidationPrice: data.liquidationPrice,
        margin: data.margin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Open position API error:', error);
    return NextResponse.json(
      { error: 'Failed to open position' },
      { status: 500 }
    );
  }
}
