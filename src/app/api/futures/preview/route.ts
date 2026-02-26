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
        { error: 'Missing required fields: chain, market, side, size, leverage' },
        { status: 400 }
      );
    }

    // Prepare request body for backend API
    const requestBody: any = {
      userId,
      chain,
      market,
      side: side.toUpperCase(),
      size: size.toString(),
      leverage: parseInt(leverage.toString()),
    };

    // Add optional entryPrice if provided
    if (entryPrice) {
      requestBody.entryPrice = entryPrice.toString();
    }

    // Call backend preview API
    const response = await fetch(`${BASE_API_URL}/api/futures/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      // Return detailed error with full message from backend
      return NextResponse.json(
        { 
          error: data.error || 'Failed to preview trade',
          message: data.message || data.error || 'Failed to preview trade',
          details: data.details || {}
        },
        { status: response.status }
      );
    }

    // Backend returns: { userId, chain, preview: {...} }
    const preview = data.preview || {};
    
    // Return the preview data with all margin validation fields
    return NextResponse.json({
      // Market info
      market: preview.market,
      side: preview.side,
      size: parseFloat(preview.size || size),
      leverage: parseInt(preview.leverage || leverage),
      entryPrice: parseFloat(preview.entryPrice || 0),
      
      // Position value
      notionalValue: parseFloat(preview.notionalValue || 0),
      
      // Margin requirements
      requiredMargin: parseFloat(preview.requiredMargin || 0),
      estimatedFee: parseFloat(preview.estimatedFee || 0),
      totalRequired: parseFloat(preview.totalRequired || 0),
      
      // User's collateral
      userCollateral: parseFloat(preview.userCollateral || 0),
      freeCollateral: parseFloat(preview.freeCollateral || 0),
      marginCheckPassed: preview.marginCheckPassed ?? true,
      
      // Risk metrics
      liquidationPrice: parseFloat(preview.liquidationPrice || 0),
      estimatedLiquidationPrice: parseFloat(preview.liquidationPrice || 0),
      maintenanceMargin: parseFloat(preview.maintenanceMargin || 0),
      
      // Funding
      fundingImpact: parseFloat(preview.fundingImpact || 0),
      estimatedFundingImpact: parseFloat(preview.fundingImpact || 0),
      
      // Additional fields for compatibility
      maxLeverageAllowed: 10,
      isPlaceholder: preview.isPlaceholder ?? false,
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
