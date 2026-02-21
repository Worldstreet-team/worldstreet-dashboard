import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, asset, amount, direction } = body;

    // Validate required fields
    if (!userId || !asset || !amount || !direction) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, asset, amount, direction' },
        { status: 400 }
      );
    }

    // Validate direction
    if (direction !== 'main-to-spot' && direction !== 'spot-to-main') {
      return NextResponse.json(
        { error: 'Invalid direction. Must be "main-to-spot" or "spot-to-main"' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    console.log('Transfer request:', { userId, asset, amount, direction });

    // Call backend API
    const response = await fetch('https://trading.watchup.site/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        asset,
        amount,
        direction,
      }),
    });

    const data = await response.json();

    console.log('Backend response:', {
      status: response.status,
      data,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Transfer failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: 'Transfer completed successfully',
      ...data,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
