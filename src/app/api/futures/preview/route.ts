import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chain, market, side, size, leverage, orderType, limitPrice } = body;

    // TODO: Implement actual preview calculation from protocol
    // This should call the backend to get accurate preview data
    
    // Placeholder calculation
    const mockMarkPrice = 45000; // Should come from market data
    const notionalValue = size * mockMarkPrice;
    const requiredMargin = notionalValue / leverage;
    const feeRate = 0.0006; // 0.06%
    const estimatedFee = notionalValue * feeRate;
    
    // Simplified liquidation price calculation
    const maintenanceMarginRate = 0.05; // 5%
    const liquidationBuffer = notionalValue * maintenanceMarginRate;
    const estimatedLiquidationPrice = side === 'long'
      ? mockMarkPrice - (liquidationBuffer / size)
      : mockMarkPrice + (liquidationBuffer / size);

    const previewData = {
      requiredMargin,
      estimatedLiquidationPrice,
      estimatedFee,
      maxLeverageAllowed: 20,
      estimatedFundingImpact: 0.0001 * notionalValue, // Simplified
    };

    return NextResponse.json(previewData);
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
