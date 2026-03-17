import { NextRequest, NextResponse } from "next/server";
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";

const info = new InfoClient({
  transport: new HttpTransport({ isTestnet: false }),
});

/**
 * GET /api/hyperliquid/orderbook?coin=PURR
 * Resolves human-readable base asset to HL spot coin name, then returns L2 book.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCoin = searchParams.get("coin") || searchParams.get("symbol") || "";

    if (!rawCoin) {
      return NextResponse.json(
        { error: "coin parameter is required" },
        { status: 400 }
      );
    }

    // Strip quote suffixes and normalise
    const baseName = rawCoin
      .replace(/[\/\-_]/g, "")
      .replace(/(USDC|USDT|USD|USDH)$/i, "")
      .toUpperCase();

    const spotMeta = await info.spotMeta();

    // Find the base token in spot metadata
    const baseToken = spotMeta.tokens.find(
      (t: any) => t.name.toUpperCase() === baseName
    );

    let coinName = baseName; // fallback: perp-style name
    if (baseToken) {
      const universeEntry = spotMeta.universe.find(
        (u: any) => u.tokens[0] === baseToken.index
      );
      if (universeEntry) {
        coinName = universeEntry.name; // e.g. "@107" or "PURR/USDC"
      }
    }

    const book = await info.l2Book({ coin: coinName });

    // Normalise into simple arrays of [price, size]
    const levels = book?.levels ?? [[], []];
    const asks = (levels[1] ?? []).map((l: any) => [l.px, l.sz]);
    const bids = (levels[0] ?? []).map((l: any) => [l.px, l.sz]);

    return NextResponse.json({
      success: true,
      coin: coinName,
      asks,
      bids,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[Hyperliquid Orderbook] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orderbook" },
      { status: 500 }
    );
  }
}