import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'solana';

    // TODO: Implement actual collateral fetching from protocol
    // This is a placeholder response
    const collateral = {
      total: 10000.00,
      used: 2000.00,
      free: 8000.00,
      marginRatio: 0.80,
      totalUnrealizedPnL: 150.00,
      fundingAccrued: -5.25,
    };

    return NextResponse.json(collateral);
  } catch (error) {
    console.error('Collateral API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collateral' },
      { status: 500 }
    );
  }
}
