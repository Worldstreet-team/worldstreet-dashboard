import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { chain, market, side, size, leverage, orderType, limitPrice } = body;

    if (!chain || !market || !side || !size || !leverage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get entry price (use limitPrice or fetch current market price)
    let entryPrice = limitPrice;
    if (!entryPrice) {
      // Fetch current market price
      const marketsResponse = await fetch(
        `${BASE_API_URL}/api/futures/markets?chain=${chain}`
      );
      if (marketsResponse.ok) {
        const marketsData = await marketsResponse.json();
        const marketData = marketsData.markets.find(
          (m: any) => m.symbol === market || m.symbol.toLowerCase() === market.toLowerCase()
        );
        entryPrice = marketData?.markPrice || 0;
      }
    }

    if (!entryPrice) {
      return NextResponse.json(
        { error: 'Could not determine entry price' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BASE_API_URL}/api/futures/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        chain,
        market,
        side: side.toUpperCase(),
        size: size.toString(),
        leverage,
        entryPrice: entryPrice.toString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to preview trade' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const preview = data.preview || {};
    return NextResponse.json({
      requiredMargin: parseFloat(preview.requiredMargin || 0),
      estimatedLiquidationPrice: parseFloat(preview.estimatedLiquidationPrice || 0),
      estimatedFee: parseFloat(preview.estimatedFee || 0),
      maxLeverageAllowed: parseInt(preview.maxLeverageAllowed || 20),
      estimatedFundingImpact: parseFloat(preview.estimatedFundingImpact || 0),
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
