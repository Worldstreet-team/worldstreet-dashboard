import { NextRequest, NextResponse } from 'next/server';

const GATEIO_API_BASE = 'https://api.gateio.ws';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC_USDT';

    const response = await fetch(
      `${GATEIO_API_BASE}/api/v4/spot/order_book?currency_pair=${symbol}&limit=50&with_id=true`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Gate.io API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[OrderBook API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch order book data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
