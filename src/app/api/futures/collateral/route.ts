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

    const response = await fetch(
      `${BASE_API_URL}/api/futures/collateral?userId=${userId}&chain=${chain}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch collateral');
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const collateral = {
      total: parseFloat(data.collateral?.total || 0),
      used: parseFloat(data.collateral?.used || 0),
      free: parseFloat(data.collateral?.free || 0),
      marginRatio: parseFloat(data.collateral?.marginRatio || 1),
      totalUnrealizedPnL: parseFloat(data.collateral?.totalUnrealizedPnL || 0),
      fundingAccrued: parseFloat(data.collateral?.fundingAccrued || 0),
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
