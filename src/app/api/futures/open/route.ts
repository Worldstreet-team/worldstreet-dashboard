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
    const { chain, marketIndex, market, side, size, leverage, limitPrice } = body;

    // Validate required fields
    if (!chain || marketIndex === undefined || !market || !side || !size || !leverage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare request body
    const requestBody: any = {
      userId,
      chain,
      marketIndex,
      market,
      side: side.toUpperCase(),
      size: size.toString(),
      leverage,
    };

    // Add limit price if provided
    if (limitPrice) {
      requestBody.limitPrice = limitPrice.toString();
    }

    console.log('Opening position:', requestBody);

    const response = await fetch(`${BASE_API_URL}/api/futures/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to open position' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: data.message || 'Position opened successfully',
      positionId: data.positionId,
      txHash: data.txHash,
      entryPrice: data.entryPrice,
      liquidationPrice: data.liquidationPrice,
      margin: data.margin,
    }, { status: 201 });
  } catch (error) {
    console.error('Open position API error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
