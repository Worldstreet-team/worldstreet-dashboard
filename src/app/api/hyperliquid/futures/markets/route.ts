import { NextResponse } from "next/server";
import { hyperliquidFutures } from "@/lib/hyperliquid/futures";

/**
 * GET /api/hyperliquid/futures/markets
 * Get all perpetual futures markets from Hyperliquid
 */
export async function GET() {
  try {
    console.log('[Hyperliquid Futures] Fetching futures markets...');

    const markets = await hyperliquidFutures.getFuturesMarkets();

    console.log(`[Hyperliquid Futures] Successfully fetched ${markets.length} futures markets`);

    return NextResponse.json({
      success: true,
      data: {
        markets,
        count: markets.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Futures] Error fetching markets:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch futures markets",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}