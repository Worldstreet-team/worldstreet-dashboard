import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';
import { createAuthorizationContext } from '@/lib/privy/authorization';
import { privyClient } from '@/lib/privy/client';

/**
 * POST /api/privy/initialize-futures-wallet
 * 
 * Initializes the futures wallet for Hyperliquid trading
 * This includes setting up the wallet for margin trading and position management
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Clerk JWT for authorization
    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ error: 'Failed to get authorization token' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    console.log('[FuturesWallet] Initializing futures wallet for user:', clerkUserId);

    // Find user wallet record
    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet?.futuresWallet?.walletId) {
      return NextResponse.json(
        { error: 'Futures wallet not found. Please setup futures wallet first.' },
        { status: 404 }
      );
    }

    // Check if already initialized
    if (userWallet.futuresWallet.initialized) {
      console.log('[FuturesWallet] Futures wallet already initialized');
      return NextResponse.json({
        success: true,
        message: 'Futures wallet already initialized',
        futuresWallet: {
          walletId: userWallet.futuresWallet.walletId,
          address: userWallet.futuresWallet.address,
          initialized: true,
        },
      });
    }

    // Create authorization context
    const authContext = await createAuthorizationContext(clerkJwt);

    // Initialize Hyperliquid trading wallet
    try {
      // Import Hyperliquid service dynamically
      const { HyperliquidService } = await import('@/lib/hyperliquid/service');
      
      const hlService = new HyperliquidService({
        privyClient,
        walletId: userWallet.futuresWallet.walletId,
        walletAddress: userWallet.futuresWallet.address,
        authorizationContext: authContext,
      });

      // Initialize the trading account
      const initResult = await hlService.initializeTradingAccount();

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize Hyperliquid account');
      }

      // Mark as initialized
      userWallet.futuresWallet.initialized = true;
      userWallet.futuresWallet.timestamp = new Date();
      await userWallet.save();

      console.log('[FuturesWallet] Futures wallet initialized successfully');

      return NextResponse.json({
        success: true,
        message: 'Futures wallet initialized successfully',
        futuresWallet: {
          walletId: userWallet.futuresWallet.walletId,
          address: userWallet.futuresWallet.address,
          initialized: true,
        },
      });

    } catch (initError: any) {
      console.error('[FuturesWallet] Initialization error:', initError);
      
      return NextResponse.json(
        { 
          error: 'Failed to initialize futures wallet for trading',
          details: initError.message,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[FuturesWallet] Initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize futures wallet', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}