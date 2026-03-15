import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { UserWallet } from '@/models/UserWallet';

/**
 * POST /api/debug/reset-futures-wallet
 * Reset futures wallet data for testing (removes chains.arbitrum field)
 */
export async function POST(request: NextRequest) {
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
    
    // Find and update user wallet to remove arbitrum chain data
    const result = await UserWallet.findOneAndUpdate(
      { clerkUserId: userId },
      { 
        $unset: { 
          'chains.arbitrum': 1 
        } 
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Futures wallet data reset successfully',
      debug: {
        clerkUserId: userId,
        walletFound: !!result,
        remainingChains: result?.chains || null
      }
    });

  } catch (error: any) {
    console.error('[Reset Futures Wallet] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to reset futures wallet",
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message
        }
      },
      { status: 500 }
    );
  }
}