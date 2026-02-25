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

    // Call backend API
    const response = await fetch(
      `${BASE_API_URL}/api/futures/market/${symbol}/klines?interval=${interval}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Futures klines API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch futures klines data' },
      { status: 500 }
    );
  }
}
