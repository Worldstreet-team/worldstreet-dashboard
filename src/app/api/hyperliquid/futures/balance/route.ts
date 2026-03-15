import { NextRequest, NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";

/**
 * GET /api/hyperliquid/futures/balance
 * Get Hyperliquid futures account balance and positions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Clerk authentication using server-side auth
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }
    
    console.log('[Hyperliquid Futures Balance] Fetching balance for user:', userId);

    // Connect to database and get user's wallet
    await connectDB();
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });

    if (!userWallet || !userWallet.chains?.arbitrum?.address) {
      return NextResponse.json(
        { error: 'No Arbitrum wallet found for user. Please set up futures wallet first.' },
        { status: 404 }
      );
    }

    const address = userWallet.chains.arbitrum.address;
    console.log('[Hyperliquid Futures Balance] Using wallet address:', address);

    // Get account state from Hyperliquid
    const accountState = await hyperliquidFutures.getAccount(address) as any;

    // Extract margin summary and positions
    const marginSummary = accountState?.marginSummary || {};
    const crossMarginSummary = accountState?.crossMarginSummary || {};
    const positions = accountState?.assetPositions || [];
    const withdrawable = accountState?.withdrawable || "0";

    // Parse balance data
    const accountValue = parseFloat(crossMarginSummary.accountValue || "0");
    const totalMarginUsed = parseFloat(crossMarginSummary.totalMarginUsed || "0");
    const totalNtlPos = parseFloat(crossMarginSummary.totalNtlPos || "0");
    const totalRawUsd = parseFloat(crossMarginSummary.totalRawUsd || "0");

    // Parse positions
    const parsedPositions = positions.map((position: any) => ({
      coin: position.position?.coin || 'Unknown',
      szi: parseFloat(position.position?.szi || "0"),
      entryPx: parseFloat(position.position?.entryPx || "0"),
      positionValue: parseFloat(position.position?.positionValue || "0"),
      returnOnEquity: parseFloat(position.position?.returnOnEquity || "0"),
      unrealizedPnl: parseFloat(position.position?.unrealizedPnl || "0"),
      marginUsed: parseFloat(position.position?.marginUsed || "0")
    }));

    return NextResponse.json({
      success: true,
      data: {
        address,
        accountValue,
        totalMarginUsed,
        totalNtlPos,
        totalRawUsd,
        withdrawable: parseFloat(withdrawable),
        availableMargin: accountValue - totalMarginUsed,
        positions: parsedPositions,
        positionCount: parsedPositions.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Futures Balance] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch futures balance",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}