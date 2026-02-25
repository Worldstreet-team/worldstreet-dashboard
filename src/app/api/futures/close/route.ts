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
    const { positionId, size } = body;

    // Validate required fields
    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    // Prepare request body
    const requestBody: any = {
      userId,
      positionId,
    };

    // Add size if partial close
    if (size) {
      requestBody.size = size.toString();
    }

    console.log('Closing position:', requestBody);

    const response = await fetch(`${BASE_API_URL}/api/futures/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to close position' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: data.message || 'Position closed successfully',
      positionId: data.positionId,
      closedSize: data.closedSize,
      remainingSize: data.remainingSize,
      txHash: data.txHash,
      realizedPnL: data.realizedPnL,
    });
  } catch (error) {
    console.error('Close position API error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
