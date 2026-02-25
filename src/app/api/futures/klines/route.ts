import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '1min';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Convert symbol format: BTC-USDT -> BTC-PERP for futures
    const futuresSymbol = symbol.replace('-USDT', '-PERP');

    // Call backend API
    const response = await fetch(
      `${BASE_API_URL}/api/futures/market/${futuresSymbol}/klines?interval=${interval}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);
      throw new Error(`Backend API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Backend returns: [{"time":1772055960,"open":69084.5,"close":69000.9,"high":69087.9,"low":68925,"volume":1800955,"turnover":12425281.20623}, ...]
    return NextResponse.json(data);
  } catch (error) {
    console.error('Futures klines API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch futures klines data' },
      { status: 500 }
    );
  }
}
