import { NextRequest, NextResponse } from 'next/server';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/privy/get-wallet-by-clerk?clerkUserId=user_xxx
 * Get wallets for a user by Clerk user ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkUserId = searchParams.get('clerkUserId');

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing clerkUserId parameter' },
        { status: 400 }
      );
    }

    console.log('[Privy] Fetching wallets for Clerk user:', clerkUserId);

    // Connect to database
    await connectDB();

    // Find user by Clerk ID
    const userWallet = await UserWallet.findOne({ clerkUserId });
    
    if (!userWallet) {
      return NextResponse.json(
        { error: 'User wallets not found' },
        { status: 404 }
      );
    }

    console.log('[Privy] Wallets found for user');

    return NextResponse.json({
      success: true,
      privyUserId: userWallet.privyUserId,
      email: userWallet.email,
      wallets: userWallet.wallets
    });
  } catch (error: any) {
    console.error('[Privy] Error fetching wallets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch wallets',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
