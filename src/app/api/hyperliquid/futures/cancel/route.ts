import { NextRequest, NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";
import { privyClient } from "@/lib/privy/client";

/**
 * POST /api/hyperliquid/futures/cancel
 * Cancel futures orders on Hyperliquid
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orderIds, coin } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!orderIds && !coin) {
      return NextResponse.json(
        { error: 'Either orderIds or coin is required' },
        { status: 400 }
      );
    }

    console.log('[Hyperliquid Futures Cancel] Cancelling orders:', {
      userId, orderIds, coin
    });

    // Get user's wallet from Privy
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

    // TODO: Implement proper order cancellation with Privy signing
    return NextResponse.json(
      { error: 'Order cancellation not yet implemented - requires proper Privy signing integration' },
      { status: 501 }
    );

    // const result = orderIds 
    //   ? await hyperliquidFutures.cancelOrder(privateKey, { orderIds })
    //   : await hyperliquidFutures.cancelAllOrders(privateKey, coin);

  } catch (error: any) {
    console.error("[Hyperliquid Futures Cancel] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cancel futures orders",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}