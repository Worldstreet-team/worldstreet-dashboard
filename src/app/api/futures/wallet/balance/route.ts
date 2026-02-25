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
      `${BASE_API_URL}/api/futures/wallet/balance?userId=${userId}&chain=solana`
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
    
    // Parse the nested balance structure
    const usdtBalance = data.balances?.USDT?.balance || 0;
    const solBalance = data.balances?.SOL?.balance || 0;
    const usdtTokenAccount = data.balances?.USDT?.tokenAccount || null;
    
    return NextResponse.json({
      balance: usdtBalance,
      usdtBalance: usdtBalance,
      solBalance: solBalance,
      walletAddress: data.walletAddress,
      tokenAccount: usdtTokenAccount,
      exists: data.balances?.USDT?.exists || false,
      // Include full balances object for future use
      balances: data.balances,
    });
  } catch (error) {
    console.error('Wallet balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
