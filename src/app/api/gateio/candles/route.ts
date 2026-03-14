import { NextRequest, NextResponse } from 'next/server';

const GATEIO_API_BASE = 'https://api.gateio.ws';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC_USDT';
    const interval = searchParams.get('interval') || '1h'; // default 1 hour
    const limit = searchParams.get('limit') || '100';

    // Gate.io interval format: 10s, 1m, 5m, 15m, 30m, 1h, 4h, 8h, 1d, 7d
    const apiInterval = interval === '1hour' ? '1h' : interval;

    const response = await fetch(
      `${GATEIO_API_BASE}/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=${apiInterval}&limit=${limit}`,
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

    const rawData = await response.json();

    // Transform Gate.io format to unified format
    // Gate.io: [timestamp, volume, close, high, low, open, amount]
    const candles = rawData.map((k: string[]) => ({
      time: parseInt(k[0]),
      open: parseFloat(k[5]),
      close: parseFloat(k[2]),
      high: parseFloat(k[3]),
      low: parseFloat(k[4]),
      volume: parseFloat(k[1]),
    }));

    return NextResponse.json({
      success: true,
      data: candles,
    });
  } catch (error) {
    console.error('[Gate.io Candles API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch Gate.io candle data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
