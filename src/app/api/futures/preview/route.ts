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
    const { chain, market, side, size, leverage, entryPrice } = body;

    // Validate required fields
    if (!chain || !market || !side || !size || !leverage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestBody: any = {
      userId,
      chain,
      market,
      side: side.toUpperCase(),
      size: size.toString(),
      leverage,
    };

    if (entryPrice) {
      requestBody.entryPrice = entryPrice.toString();
    }

    const response = await fetch(`${BASE_API_URL}/api/futures/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to preview trade' },
        { status: response.status }
      );
    }

    // Transform backend response to frontend format
    const preview = data.preview || {};
    
    return NextResponse.json({
      market: preview.market,
      marketIndex: preview.marketIndex,
      side: preview.side,
      size: parseFloat(preview.size || size),
      leverage: parseFloat(preview.leverage || leverage),
      entryPrice: parseFloat(preview.entryPrice || 0),
      markPrice: parseFloat(preview.markPrice || 0),
      notionalValue: parseFloat(preview.notionalValue || 0),
      requiredMargin: parseFloat(preview.requiredMargin || 0),
      estimatedFees: parseFloat(preview.estimatedFees || preview.estimatedFee || 0),
      estimatedFee: parseFloat(preview.estimatedFee || preview.estimatedFees || 0),
      totalCost: parseFloat(preview.totalCost || 0),
      // New margin validation fields
      totalRequired: parseFloat(preview.totalRequired || preview.totalCost || 0),
      freeCollateral: parseFloat(preview.freeCollateral || 0),
      marginCheckPassed: preview.marginCheckPassed ?? true,
      // Liquidation
      liquidationPrice: parseFloat(preview.liquidationPrice || 0),
      estimatedLiquidationPrice: parseFloat(preview.liquidationPrice || 0),
      maintenanceMargin: parseFloat(preview.maintenanceMargin || 0),
      // Leverage and ratios
      maxLeverageAllowed: parseFloat(preview.maxLeverageAllowed || 10),
      marginRatio: parseFloat(preview.marginRatio || 0),
      maintenanceMarginRatio: parseFloat(preview.maintenanceMarginRatio || 0.05),
      // Other
      priceImpact: parseFloat(preview.priceImpact || 0),
      estimatedFundingImpact: parseFloat(preview.fundingImpact || 0),
      fundingImpact: parseFloat(preview.fundingImpact || 0),
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
