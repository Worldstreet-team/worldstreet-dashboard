import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = 'https://trading.watchup.site';

// Fallback markets data in case external API fails
const FALLBACK_MARKETS = [
  {
    id: 'sol-perp',
    symbol: 'SOL-PERP',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    markPrice: 0,
    indexPrice: 0,
    fundingRate: 0,
    nextFundingTime: Date.now() + 3600000,
    volume24h: 0,
    priceChange24h: 0,
  },
  {
    id: 'btc-perp',
    symbol: 'BTC-PERP',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    markPrice: 0,
    indexPrice: 0,
    fundingRate: 0,
    nextFundingTime: Date.now() + 3600000,
    volume24h: 0,
    priceChange24h: 0,
  },
  {
    id: 'eth-perp',
    symbol: 'ETH-PERP',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    markPrice: 0,
    indexPrice: 0,
    fundingRate: 0,
    nextFundingTime: Date.now() + 3600000,
    volume24h: 0,
    priceChange24h: 0,
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'solana';

    try {
      const response = await fetch(
        `${BASE_API_URL}/api/futures/markets?chain=${chain}`,
        { 
          next: { revalidate: 60 }, // Cache for 60 seconds
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`External API returned ${response.status}`);
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
    } catch (fetchError) {
      console.warn('External markets API failed, using fallback:', fetchError);
      
      // Return fallback markets
      return NextResponse.json({ 
        markets: FALLBACK_MARKETS, 
        chain,
        fallback: true 
      });
    }
  } catch (error) {
    console.error('Markets API error:', error);
    
    // Return fallback even on error
    return NextResponse.json({ 
      markets: FALLBACK_MARKETS, 
      chain: 'solana',
      fallback: true 
    });
  }
}
