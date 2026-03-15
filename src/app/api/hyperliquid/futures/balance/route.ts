import { NextRequest, NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";
import { privyClient } from "@/lib/privy/client";

/**
 * GET /api/hyperliquid/futures/balance?userId={clerkUserId}
 * Get Hyperliquid futures account balance and positions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Hyperliquid Futures Balance] Fetching balance for user:', userId);

    // Get user's Ethereum wallet from Privy
    const user = await (privyClient as any).users().get(userId);
    const accounts = (user as any).linked_accounts || [];
    const ethereumWallet = accounts.find(
      (account: any) => account.type === 'wallet' && account.chain_type === 'ethereum'
    );

    if (!ethereumWallet) {
      return NextResponse.json(
        { error: 'No Ethereum wallet found for user' },
        { status: 404 }
      );
    }

    const address = (ethereumWallet as any).address;
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