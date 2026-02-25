import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || '1m';

    // Forward request to backend
    const response = await fetch(
      `${BASE_API_URL}/api/market/${symbol}/klines?type=${type}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch klines data');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Klines API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch klines data' },
      { status: 500 }
    );
  }
}
