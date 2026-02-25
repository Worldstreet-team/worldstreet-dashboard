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

    // Call backend API to get wallet balance
    const response = await fetch(
      `${BASE_API_URL}/api/futures/wallet/balance?userId=${userId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Futures wallet not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch wallet balance');
    }

    const data = await response.json();
    
    return NextResponse.json({
      balance: data.balance || 0,
      usdtBalance: data.balance || 0, // Alias for compatibility
      solBalance: 0, // SOL balance not provided by this endpoint
      walletAddress: data.walletAddress,
      tokenAccount: data.tokenAccount,
      exists: data.exists,
    });
  } catch (error) {
    console.error('Wallet balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
