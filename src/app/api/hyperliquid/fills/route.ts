import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";

/**
 * GET /api/hyperliquid/fills
 * Fetches the authenticated user's recent trade fills from Hyperliquid.
 * Resolves spot coin names (@107 → human-readable) via spotMeta.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet?.tradingWallet?.address) {
      return NextResponse.json({ success: true, data: [] });
    }

    const address = userWallet.tradingWallet.address as `0x${string}`;
    const transport = new HttpTransport({ isTestnet: false });
    const info = new InfoClient({ transport });

    // Fetch fills and spotMeta in parallel
    const [fills, spotMeta] = await Promise.all([
      info.userFills({ user: address }),
      info.spotMeta(),
    ]);

    // Build a map: universe entry name (e.g. "@107") → human-readable pair (e.g. "HYPE/USDC")
    const coinNameMap: Record<string, string> = {};
    for (const entry of spotMeta.universe) {
      const baseToken = spotMeta.tokens[entry.tokens[0]];
      const quoteToken = spotMeta.tokens[entry.tokens[1]];
      if (baseToken && quoteToken) {
        // Map both the internal name and the human-readable pair name
        const humanName = `${baseToken.name}/${quoteToken.name}`;
        coinNameMap[entry.name] = humanName;
        // Also map the human pair back to itself
        coinNameMap[humanName] = humanName;
      }
    }

    // Enrich fills with human-readable coin names
    const enrichedFills = fills.map((fill: any) => ({
      ...fill,
      coinDisplay: coinNameMap[fill.coin] || fill.coin,
    }));

    return NextResponse.json({ success: true, data: enrichedFills });
  } catch (error: any) {
    console.error("[HL Fills] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch fills" },
      { status: 500 }
    );
  }
}
