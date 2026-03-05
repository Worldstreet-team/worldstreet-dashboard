import { NextRequest, NextResponse } from 'next/server';

const KUCOIN_API_BASE = 'https://api.kucoin.com';

/**
 * GET /api/kucoin/orderbook
 * 
 * Fetches order book data from KuCoin REST API
 * Query params:
 * - symbol: Trading pair (e.g., BTC-USDT)
 * 
 * Returns 50-level order book data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Fetch order book from KuCoin
    const response = await fetch(
      `${KUCOIN_API_BASE}/api/v1/market/orderbook/level2_50?symbol=${symbol}`,
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
      throw new Error(`KuCoin API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== '200000') {
      throw new Error(`KuCoin API returned error code: ${data.code}`);
    }

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
