import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'solana';

    // TODO: Implement actual market data fetching from protocol
    // This is a placeholder response
    const markets = [
      {
        id: 'btc-perp',
        symbol: 'BTC-PERP',
        baseAsset: 'BTC',
        quoteAsset: 'USD',
        markPrice: 45000.00,
        indexPrice: 45010.00,
        fundingRate: 0.0001,
        nextFundingTime: Date.now() + 3600000,
        volume24h: 1250000000,
        priceChange24h: 2.5,
      },
      {
        id: 'eth-perp',
        symbol: 'ETH-PERP',
        baseAsset: 'ETH',
        quoteAsset: 'USD',
        markPrice: 2500.00,
        indexPrice: 2502.00,
        fundingRate: 0.00008,
        nextFundingTime: Date.now() + 3600000,
        volume24h: 850000000,
        priceChange24h: 1.8,
      },
      {
        id: 'sol-perp',
        symbol: 'SOL-PERP',
        baseAsset: 'SOL',
        quoteAsset: 'USD',
        markPrice: 100.00,
        indexPrice: 100.50,
        fundingRate: 0.00012,
        nextFundingTime: Date.now() + 3600000,
        volume24h: 320000000,
        priceChange24h: -0.5,
      },
    ];

    return NextResponse.json({ markets, chain });
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
