import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { privyClient } from "@/lib/privy/client";
import { createViemAccount } from "@privy-io/node/viem";
import { createAuthorizationContext } from "@/lib/privy/authorization";
import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid";

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, getToken } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ success: false, error: "Authentication token required" }, { status: 401 });
    }

    const authContext = await createAuthorizationContext(clerkJwt);

    const { asset, side, amount, price, orderType, stopPrice } = await request.json();

    if (!asset || !side || !amount || !orderType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const userWallet = await UserWallet.findOne({ clerkUserId: authUserId });
    
    if (!userWallet?.tradingWallet?.walletId) {
      return NextResponse.json({ success: false, error: "Trading wallet not setup. Please visit Portfolio to initialize." }, { status: 404 });
    }

    // Initialize Hyperliquid Clients via Privy Viem Account
    const viemAccount = createViemAccount(privyClient, {
      walletId: userWallet.tradingWallet.walletId,
      address: userWallet.tradingWallet.address as `0x${string}`,
      authorizationContext: authContext
    });

    const transport = new HttpTransport({ isTestnet: false });
    const info = new InfoClient({ transport });
    const exchange = new ExchangeClient({ transport, wallet: viemAccount });

    // Helper: Round to Significant Figures (Max 5 for HL)
    const toHlPrice = (val: number): string => {
      if (!val || val === 0) return "0";
      const sigFigs = 5;
      const magnitude = Math.floor(Math.log10(Math.abs(val)));
      const decimals = Math.max(0, sigFigs - magnitude - 1);
      // Ensure we don't have scientific notation and strip trailing zeros
      return val.toFixed(decimals).replace(/\.?0+$/, '');
    };

    // Helper: Round size to allowed decimals
    const toHlSize = (val: number, szDecimals: number): string => {
      if (!val || val === 0) return "0";
      return val.toFixed(szDecimals).replace(/\.?0+$/, '');
    };

    // 1. Resolve Asset Index and Metadata
    const [meta, spotMeta, mids] = await Promise.all([
      info.meta(),
      info.spotMeta(),
      info.allMids()
    ]);

    let assetIndex = -1;
    let isSpot = false;

    // Check if it's a Spot asset (e.g. PURR/USDC) or Perp asset (e.g. BTC)
    // Note: User might pass "BTC" expecting "BTC-PERP" or "BTC/USDC"
    const targetAsset = asset.includes('/') || asset.includes('-') ? asset : asset;
    let szDecimals = 8; // Default

    // Search in Spot Universe
    const spotIdx = spotMeta.universe.findIndex(m => m.name === targetAsset || m.name === `${asset}/USDC`);
    if (spotIdx !== -1) {
      assetIndex = spotIdx + 10000; // Spot indices in HL start at 10000
      isSpot = true;
      // Get szDecimals for Spot
      const universeEntry = spotMeta.universe[spotIdx];
      const tokenIdx = universeEntry.tokens[0];
      szDecimals = spotMeta.tokens[tokenIdx].szDecimals;
    } else {
      // Search in Perp Universe
      const perpIdx = meta.universe.findIndex(m => m.name === targetAsset || m.name === asset);
      if (perpIdx !== -1) {
        assetIndex = perpIdx;
        szDecimals = meta.universe[perpIdx].szDecimals;
      }
    }

    if (assetIndex === -1) {
      return NextResponse.json({ success: false, error: `Asset ${asset} not found on Hyperliquid` }, { status: 400 });
    }

    console.log(`[Hyperliquid Order] Asset: ${asset}, Index: ${assetIndex}, Type: ${isSpot ? 'Spot' : 'Perp'}, szDecimals: ${szDecimals}`);

    // 2. Implementation of Market Orders via IOC Limit orders (as per instructions)
    let finalPrice = price;
    let finalTif: any = { limit: { tif: "Gtc" } };

    if (orderType === 'market') {
      try {
        // Fetch L2 order book for real execution prices (Best Bid/Ask)
        // Note: For spot, coin name should include /USDC or use the internal symbol
        const bookName = isSpot ? (asset.includes('/') ? asset : `${asset}/USDC`) : asset;
        const l2 = await info.l2Book({ coin: bookName });
        
        if (!l2 || !l2.levels || !l2.levels[0] || !l2.levels[1]) {
           throw new Error("Invalid book data");
        }

        const bestBidStr = l2.levels[0][0]?.px || "0";
        const bestAskStr = l2.levels[1][0]?.px || "0";
        const bestBid = parseFloat(bestBidStr);
        const bestAsk = parseFloat(bestAskStr);
        
        // Capture precision from the book price itself to stay on tick
        const bidDecimals = bestBidStr.includes('.') ? bestBidStr.split('.')[1].length : 0;
        const askDecimals = bestAskStr.includes('.') ? bestAskStr.split('.')[1].length : 0;

        console.log(`[Hyperliquid Order] Market depth for ${asset}: Bid ${bestBid} (${bidDecimals} dec), Ask ${bestAsk} (${askDecimals} dec)`);
        
        if (side === 'buy') {
          // Buy at Best Ask + 5% buffer, rounded to same decimals as the book
          const rawPrice = bestAsk * 1.05;
          finalPrice = parseFloat(rawPrice.toFixed(askDecimals));
        } else {
          // Sell at Best Bid - 5% buffer, rounded to same decimals as the book
          const rawPrice = bestBid * 0.95;
          finalPrice = parseFloat(rawPrice.toFixed(bidDecimals));
        }
      } catch (e) {
        console.warn(`[Hyperliquid Order] Failed to get book snapshot, falling back to mid-prices:`, e);
        const midLookup = mids[asset] || mids[`${asset}/USDC`] || mids[`${asset}/HYPE`];
        const currentPrice = parseFloat(midLookup || "0");
        if (currentPrice === 0) {
          return NextResponse.json({ success: false, error: "Could not fetch market price" }, { status: 500 });
        }
        finalPrice = side === 'buy' ? (currentPrice * 1.05) : (currentPrice * 0.95);
      }
      finalTif = { limit: { tif: "Ioc" } };
    } else if (orderType === 'stop-limit') {
      if (!stopPrice) {
        return NextResponse.json({ success: false, error: "Stop price is required for stop-limit orders" }, { status: 400 });
      }

      // Logic for trigger direction
      // If stopPrice > currentPrice and we are buying, it's a breakout buy
      const currentPrice = parseFloat(mids[asset] || mids[`${asset}/USDC`] || "0");
      const isAbove = parseFloat(stopPrice) > currentPrice;

      finalTif = {
        trigger: {
          isMarket: false,
          triggerPx: toHlPrice(Number(stopPrice)),
          tpsl: isAbove ? 'tp' : 'sl' // HL logic for direction
        }
      };
    }

    console.log(`[Hyperliquid Order] Placing ${orderType} ${side} for ${amount} ${asset} at ${finalPrice}`);

    // 3. Submit Order with correct rounding
    const result = await exchange.order({
      orders: [
        {
          a: assetIndex,
          b: side === 'buy',
          p: toHlPrice(Number(finalPrice)),
          s: toHlSize(Number(amount), szDecimals),
          r: false,
          t: finalTif
        }
      ],
      grouping: "na"
    });

    if (result.status === 'err') {
       return NextResponse.json({ success: false, error: result.response.data }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      orderType,
      side,
      asset
    });

  } catch (error: any) {
    console.error("[Hyperliquid Order API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to place order"
    }, { status: 500 });
  }
}
