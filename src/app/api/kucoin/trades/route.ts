import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Convert from our format (BTC-USDT) to KuCoin format (BTCUSDT)
    const kucoinSymbol = symbol.replace('-', '');

    const response = await fetch(
      `https://api.kucoin.com/api/v1/market/histories?symbol=${kucoinSymbol}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`KuCoin API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching KuCoin trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade history' },
      { status: 500 }
    );
  }
}
