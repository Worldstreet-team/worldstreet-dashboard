import { NextResponse } from "next/server";
import { HyperliquidService } from "@/lib/hyperliquid/client";

/**
 * GET /api/hyperliquid/test
 * Test Hyperliquid API connection using the official SDK patterns
 */
export async function GET() {
  try {
    const hyperliquidService = new HyperliquidService({
      testnet: process.env.NODE_ENV !== 'production'
    });

    console.log('[Hyperliquid Test] Testing API connection...');
    console.log('[Hyperliquid Test] Using testnet:', hyperliquidService.isTestnet());

    // Test InfoClient operations (read-only)
    const [markets, midPrices] = await Promise.all([
      hyperliquidService.getMarkets(),
      hyperliquidService.getAllMidPrices()
    ]);

    console.log('[Hyperliquid Test] Successfully fetched data');
    console.log('[Hyperliquid Test] Markets count:', markets.length);
    console.log('[Hyperliquid Test] Mid prices count:', Object.keys(midPrices).length);

    // Test specific market data
    let sampleMarketData = null;
    if (markets.length > 0) {
      const firstMarket = markets[0].name;
      try {
        sampleMarketData = await hyperliquidService.getMarketData(firstMarket);
        console.log('[Hyperliquid Test] Sample market data fetched for:', firstMarket);
      } catch (marketError) {
        console.warn('[Hyperliquid Test] Could not fetch sample market data:', marketError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        testnet: hyperliquidService.isTestnet(),
        connection: 'successful',
        markets: {
          count: markets.length,
          sample: markets.slice(0, 3).map(m => ({
            name: m.name,
            szDecimals: m.szDecimals
          }))
        },
        midPrices: {
          count: Object.keys(midPrices).length,
          sample: Object.entries(midPrices).slice(0, 3).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, any>)
        },
        sampleMarketData: sampleMarketData ? {
          asset: sampleMarketData.asset,
          midPrice: sampleMarketData.midPrice,
          hasOrderBook: !!sampleMarketData.orderBook
        } : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[Hyperliquid Test] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test Hyperliquid API",
        testnet: process.env.NODE_ENV !== 'production',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}