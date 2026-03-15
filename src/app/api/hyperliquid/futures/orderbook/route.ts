import { NextRequest, NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";

/**
 * GET /api/hyperliquid/futures/orderbook?coin=BTC-PERP
 * Get orderbook for a specific futures market
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coin = searchParams.get('coin');

    if (!coin) {
      return NextResponse.json(
        { error: 'coin parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Hyperliquid Futures] Fetching orderbook for:', coin);

    const orderbook = await hyperliquidFutures.getOrderBook(coin);

    return NextResponse.json({
      success: true,
      data: {
        coin,
        orderbook,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Futures] Error fetching orderbook:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch orderbook",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}