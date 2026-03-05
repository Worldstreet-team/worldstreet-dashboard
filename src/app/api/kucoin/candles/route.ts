import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || '1hour';
    const limit = searchParams.get('limit') || '100';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}&type=${type}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Kucoin API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Kucoin data format
    // Kucoin returns: [time, open, close, high, low, volume, turnover]
    if (data.data && Array.isArray(data.data)) {
      const candles = data.data.map((kline: string[]) => ({
        time: Math.floor(parseInt(kline[0]) / 1000), // Convert ms to seconds
        open: parseFloat(kline[1]),
        close: parseFloat(kline[2]),
        high: parseFloat(kline[3]),
        low: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        turnover: parseFloat(kline[6]),
      }));

      return NextResponse.json({
        code: '200000',
        data: candles,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Kucoin candles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
