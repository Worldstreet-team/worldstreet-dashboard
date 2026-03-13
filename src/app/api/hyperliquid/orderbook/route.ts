import { NextRequest, NextResponse } from "next/server";
import { hyperliquid } from "@/lib/hyperliquid/simple";

/**
 * GET /api/hyperliquid/orderbook
 * Get Hyperliquid spot orderbook data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Hyperliquid Orderbook] Fetching orderbook for:', symbol);

    const orderbook = await hyperliquid.getOrderBook(symbol);

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        orderbook,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Orderbook] Error:", error);
    
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