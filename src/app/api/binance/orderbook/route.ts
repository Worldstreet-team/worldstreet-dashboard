import { NextRequest, NextResponse } from 'next/server';

const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * GET /api/binance/orderbook
 * 
 * Fetches order book data from Binance REST API
 * Query params:
 * - symbol: Trading pair (e.g., BTCUSDT, ETHUSDT)
 * - limit: Number of levels (default: 20, max: 5000)
 * 
 * Returns order book with bids and asks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = searchParams.get('limit') || '20';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Fetch order book from Binance
    const response = await fetch(
      `${BINANCE_API_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Disable caching to get fresh data
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Binance OrderBook API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch order book data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
