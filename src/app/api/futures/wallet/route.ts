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
      `${BASE_API_URL}/api/futures/wallet?userId=${userId}&chain=${chain}`
    );

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      throw new Error('Failed to fetch wallet');
    }

    const data = await response.json();
    return NextResponse.json({
      address: data.public_address,
      chain: data.chain,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
