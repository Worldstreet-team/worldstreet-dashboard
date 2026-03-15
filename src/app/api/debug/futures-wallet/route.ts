import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { UserWallet } from '@/models/UserWallet';

/**
 * GET /api/debug/futures-wallet
 * Debug endpoint to check futures wallet persistence
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Clerk authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();
    
    // Find user wallet
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });

    return NextResponse.json({
      success: true,
      debug: {
        clerkUserId: userId,
        userWalletExists: !!userWallet,
        userWalletId: userWallet?._id,
        privyUserId: userWallet?.privyUserId,
        hasChains: !!userWallet?.chains,
        hasArbitrum: !!userWallet?.chains?.arbitrum,
        arbitrumWallet: userWallet?.chains?.arbitrum || null,
        fullWallet: userWallet || null
      }
    });

  } catch (error: any) {
    console.error('[Debug Futures Wallet] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to debug futures wallet",
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message
        }
      },
      { status: 500 }
    );
  }
}