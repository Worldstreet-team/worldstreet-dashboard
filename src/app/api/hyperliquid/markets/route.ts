import { NextRequest, NextResponse } from "next/server";
import { hyperliquid } from "@/lib/hyperliquid/simple";

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * GET /api/hyperliquid/markets
 * Get Hyperliquid spot market data for trading interface
 */
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'markets';

    console.log('[Hyperliquid Markets] Fetching spot markets');

    // Check cache first
    const cachedMarkets = getCachedData(cacheKey);
    if (cachedMarkets) {
      console.log('[Hyperliquid Markets] Returning cached data');
      return NextResponse.json({
        success: true,
        data: {
          markets: cachedMarkets,
          count: cachedMarkets.length,
          testnet: false,
          cached: true,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Fetch fresh data - only 2 API calls total
    const markets = await hyperliquid.getMarkets();
    console.log('[Hyperliquid Markets] Fetched', markets.length, 'markets');

    // Sort by symbol
    markets.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));

    // Cache the results
    setCachedData(cacheKey, markets);

    return NextResponse.json({
      success: true,
      data: {
        markets,
        count: markets.length,
        testnet: false,
        cached: false,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Markets] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch Hyperliquid markets",
        testnet: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}