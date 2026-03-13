import { NextRequest, NextResponse } from "next/server";
import { HyperliquidService } from "@/lib/hyperliquid/client";

/**
 * GET /api/hyperliquid/markets
 * Get Hyperliquid spot market data for trading interface
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    console.log('[Hyperliquid Markets] Fetching spot markets, includeStats:', includeStats);

    const hyperliquidService = new HyperliquidService({
      testnet: process.env.NODE_ENV !== 'production'
    });

    let markets;
    
    if (includeStats) {
      // Get markets with 24h statistics (slower but more complete)
      markets = await hyperliquidService.getSpotMarketStats();
      console.log('[Hyperliquid Markets] Fetched', markets.length, 'markets with stats');
    } else {
      // Get basic market data (faster)
      markets = await hyperliquidService.getSpotMarkets();
      console.log('[Hyperliquid Markets] Fetched', markets.length, 'basic markets');
    }

    // Sort by volume (if available) or by symbol
    markets.sort((a, b) => {
      if (includeStats && a.volume24h !== b.volume24h) {
        return b.volume24h - a.volume24h; // Higher volume first
      }
      return a.symbol.localeCompare(b.symbol); // Alphabetical fallback
    });

    return NextResponse.json({
      success: true,
      data: {
        markets,
        count: markets.length,
        testnet: hyperliquidService.isTestnet(),
        includeStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[Hyperliquid Markets] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Hyperliquid markets",
        testnet: process.env.NODE_ENV !== 'production',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}