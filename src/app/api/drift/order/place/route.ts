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
    const { marketIndex, direction, baseAmount, price, postOnly, reduceOnly } = body;

    // Validate required fields
    if (marketIndex === undefined || !direction || !baseAmount || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: marketIndex, direction, baseAmount, price' },
        { status: 400 }
      );
    }

    // Call Drift backend API
    const response = await fetch(`${BACKEND_URL}/api/drift/order/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authUser.userId,
        marketIndex,
        direction,
        baseAmount,
        price,
        postOnly: postOnly || false,
        reduceOnly: reduceOnly || false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to place order' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Drift Place Order] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
