import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureUserWallet } from "@/lib/ensureUserWallet";
import { privyClient } from "@/lib/privy/client";
import { createViemAccount } from "@privy-io/node/viem";
import { createAuthorizationContext } from "@/lib/privy/authorization";
import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid";

const MIN_ORDER_VALUE = 10; // Hyperliquid universal minimum in USD

function formatOrderError(raw: string): string {
  if (/minimum value of \$?(\d+)/i.test(raw)) {
    const match = raw.match(/minimum value of \$?(\d+)/i);
    return `Minimum order value is $${match?.[1] ?? 10}. Please increase your order amount.`;
  }
  if (/insufficient margin|not enough|insufficient balance/i.test(raw)) {
    return 'Insufficient balance to place this order.';
  }
  if (/invalid price|price must be/i.test(raw)) {
    return 'The order price is invalid. Please adjust and try again.';
  }
  if (/asset.*not found/i.test(raw)) {
    return 'This trading pair is not available right now.';
  }
  if (/reduce only/i.test(raw)) {
    return 'This order would exceed your current position. Please adjust the amount.';
  }
  return `Order failed: ${raw}`;
}

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

    const { asset, side, amount, price, orderType, stopPrice, isSpot: requestIsSpot } = await request.json();

    if (!asset || !side || !amount || !orderType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Ensure user wallet exists (auto-creates via Privy if needed)
    const userWallet = await ensureUserWallet(authUserId);
    if (!userWallet?.tradingWallet?.walletId) {
      return NextResponse.json({ success: false, error: "Wallet setup failed. Please refresh the page and try again." }, { status: 404 });
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
    let szDecimals = 8; // Default
    let spotCoinName = ''; // HL internal coin name for spot (e.g. "PURR/USDC" or "@107")

    // Per HL docs: find the base token by name, then locate its spot pair
    // Asset ID = 10000 + universeEntry.index (NOT array position)
    // Coin name for L2 book / allMids = universeEntry.name
    const baseToken = spotMeta.tokens.find((t: any) => t.name === asset);
    if (baseToken) {
      const universeEntry = spotMeta.universe.find((u: any) => u.tokens[0] === baseToken.index);
      if (universeEntry) {
        assetIndex = 10000 + universeEntry.index;
        isSpot = true;
        szDecimals = baseToken.szDecimals;
        spotCoinName = universeEntry.name;
      }
    }

    // Fallback: match by universe entry name directly (e.g. if asset is "SOL/USDC")
    if (assetIndex === -1) {
      const universeEntry = spotMeta.universe.find((u: any) => u.name === asset || u.name === `${asset}/USDC`);
      if (universeEntry) {
        assetIndex = 10000 + universeEntry.index;
        isSpot = true;
        const baseTokenIdx = universeEntry.tokens[0];
        szDecimals = spotMeta.tokens[baseTokenIdx]?.szDecimals ?? 8;
        spotCoinName = universeEntry.name;
      }
    }

    // Only fall through to Perp if the request is NOT explicitly spot
    if (assetIndex === -1 && !requestIsSpot) {
      const perpIdx = meta.universe.findIndex((m: any) => m.name === asset);
      if (perpIdx !== -1) {
        assetIndex = perpIdx;
        szDecimals = meta.universe[perpIdx].szDecimals;
      }
    }

    if (assetIndex === -1) {
      const msg = requestIsSpot
        ? `${asset} is not available for spot trading on Hyperliquid.`
        : `Asset ${asset} not found on Hyperliquid`;
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    console.log(`[Hyperliquid Order] Asset: ${asset}, Index: ${assetIndex}, Type: ${isSpot ? 'Spot' : 'Perp'}, szDecimals: ${szDecimals}, CoinName: ${spotCoinName || asset}`);

    // 2. Implementation of Market Orders via IOC Limit orders (as per instructions)
    let finalPrice = price;
    let finalTif: any = { limit: { tif: "Gtc" } };

    if (orderType === 'market') {
      try {
        // Fetch L2 order book for real execution prices (Best Bid/Ask)
        // Per HL docs: spot coin = universeEntry.name (e.g. "PURR/USDC" or "@107")
        const bookName = isSpot ? spotCoinName : asset;
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
        const midKey = isSpot ? spotCoinName : asset;
        const midLookup = mids[midKey] || mids[`${asset}/USDC`];
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
      const midKey = isSpot ? spotCoinName : asset;
      const currentPrice = parseFloat(mids[midKey] || mids[`${asset}/USDC`] || "0");
      const isAbove = parseFloat(stopPrice) > currentPrice;

      finalTif = {
        trigger: {
          isMarket: false,
          triggerPx: toHlPrice(Number(stopPrice)),
          tpsl: isAbove ? 'tp' : 'sl' // HL logic for direction
        }
      };
    }

    // Use the ROUNDED values (what actually gets sent to HL) for the min check
    const roundedPrice = toHlPrice(Number(finalPrice));
    const roundedSize = toHlSize(Number(amount), szDecimals);

    console.log(`[Hyperliquid Order] Placing ${orderType} ${side} for ${roundedSize} ${asset} at ${roundedPrice} (raw: ${amount} @ ${finalPrice})`);

    // Server-side minimum order value check using rounded values
    const orderValue = Number(roundedSize) * Number(roundedPrice);
    if (orderValue < MIN_ORDER_VALUE) {
      return NextResponse.json({
        success: false,
        error: `Minimum order value is $${MIN_ORDER_VALUE}. Your order is worth $${orderValue.toFixed(2)}.`
      }, { status: 400 });
    }

    // 3. Submit Order with pre-computed rounded values
    const result = await exchange.order({
      orders: [
        {
          a: assetIndex,
          b: side === 'buy',
          p: roundedPrice,
          s: roundedSize,
          r: false,
          t: finalTif
        }
      ],
      grouping: "na"
    });

    if (result.status === 'err') {
       const rawError = typeof result.response.data === 'string' ? result.response.data : JSON.stringify(result.response.data);
       return NextResponse.json({ success: false, error: formatOrderError(rawError) }, { status: 400 });
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
    const rawMsg = error.message || "Failed to place order";
    return NextResponse.json({
      success: false,
      error: formatOrderError(rawMsg)
    }, { status: 500 });
  }
}
