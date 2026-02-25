import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') || 'solana';
    const status = searchParams.get('status') || 'OPEN';

    const response = await fetch(
      `${BASE_API_URL}/api/futures/positions?userId=${userId}&chain=${chain}&status=${status}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const positions = Array.isArray(data) ? data.map((pos: any) => ({
      id: pos.id,
      market: pos.symbol,
      side: pos.side.toLowerCase(),
      size: parseFloat(pos.size),
      entryPrice: parseFloat(pos.entry_price),
      markPrice: parseFloat(pos.mark_price || pos.entry_price),
      leverage: parseFloat(pos.leverage),
      liquidationPrice: parseFloat(pos.liquidation_price || 0),
      unrealizedPnL: parseFloat(pos.unrealized_pnl || 0),
      marginRatio: parseFloat(pos.margin_ratio || 0),
      margin: parseFloat(pos.margin),
    })) : [];

    return NextResponse.json({ positions, chain });
  } catch (error) {
    console.error('Positions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
