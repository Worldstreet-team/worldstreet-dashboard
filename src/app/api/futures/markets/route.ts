import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'solana';

    const response = await fetch(
      `${BASE_API_URL}/api/futures/markets?chain=${chain}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch markets');
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const markets = data.markets.map((market: any) => ({
      id: market.symbol.toLowerCase().replace('-perp', '-perp'),
      symbol: market.symbol,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset || 'USD',
      markPrice: market.markPrice || 0,
      indexPrice: market.indexPrice || market.markPrice || 0,
      fundingRate: market.fundingRate || 0,
      nextFundingTime: market.nextFundingTime || Date.now() + 3600000,
      volume24h: market.volume24h || 0,
      priceChange24h: market.priceChange24h || 0,
    }));

    return NextResponse.json({ markets, chain: data.chain });
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
