import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || '1min';
    const startAt = searchParams.get('startAt');
    const endAt = searchParams.get('endAt');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams({
      type,
      ...(startAt && { startAt }),
      ...(endAt && { endAt }),
    });

    const response = await fetch(
      `${BASE_API_URL}/api/spot/market/${symbol}/klines?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch klines data');
    }

    const data = await response.json();
    
    // Return the data as-is from backend
    return NextResponse.json(data);
  } catch (error) {
    console.error('Klines API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch klines data' },
      { status: 500 }
    );
  }
}
