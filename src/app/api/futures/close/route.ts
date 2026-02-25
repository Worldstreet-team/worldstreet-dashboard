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
    const { chain, positionId, size } = body;

    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BASE_API_URL}/api/futures/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        positionId,
        size: size ? size.toString() : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to close position' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      { 
        message: data.message,
        positionId: data.positionId,
        closedSize: data.closedSize,
        remainingSize: data.remainingSize,
        txHash: data.txHash,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Close position API error:', error);
    return NextResponse.json(
      { error: 'Failed to close position' },
      { status: 500 }
    );
  }
}
