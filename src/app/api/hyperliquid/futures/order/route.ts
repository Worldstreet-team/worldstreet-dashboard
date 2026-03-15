import { NextRequest, NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";
import { privyClient } from "@/lib/privy/client";

/**
 * POST /api/hyperliquid/futures/order
 * Place a futures order on Hyperliquid
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      coin, 
      side, 
      size, 
      price, 
      orderType = 'limit',
      reduceOnly = false,
      timeInForce = 'Gtc'
    } = await request.json();

    if (!userId || !coin || !side || !size) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, coin, side, size' },
        { status: 400 }
      );
    }

    console.log('[Hyperliquid Futures Order] Placing order:', {
      userId, coin, side, size, price, orderType
    });

    // Get user's wallet and private key from Privy
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

    // Get wallet private key (this would need proper Privy integration)
    // For now, we'll return an error as we need to implement proper signing
    return NextResponse.json(
      { error: 'Order placement not yet implemented - requires proper Privy signing integration' },
      { status: 501 }
    );

    // TODO: Implement proper order placement with Privy signing
    // const orderParams = {
    //   orders: [{
    //     a: assetIndex, // Need to map coin to asset index
    //     b: side === 'buy',
    //     p: price?.toString() || '0', // Market order if no price
    //     s: size.toString(),
    //     r: reduceOnly,
    //     t: orderType === 'market' ? { market: {} } : { limit: { tif: timeInForce } }
    //   }],
    //   grouping: 'na'
    // };

    // const result = await hyperliquidFutures.placeOrder(privateKey, orderParams);

  } catch (error: any) {
    console.error("[Hyperliquid Futures Order] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to place futures order",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}