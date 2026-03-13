import { NextRequest, NextResponse } from "next/server";
import { hyperliquid } from "@/lib/hyperliquid/simple";

/**
 * GET /api/hyperliquid/trades
 * Get Hyperliquid recent trades data
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

    console.log('[Hyperliquid Trades] Fetching recent trades for:', symbol);

    const trades = await hyperliquid.getRecentTrades(symbol);

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        trades,
        count: trades.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Trades] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch trades",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}