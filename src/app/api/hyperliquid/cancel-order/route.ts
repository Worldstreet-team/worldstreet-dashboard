import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { privyClient } from "@/lib/privy/client";
import { createViemAccount } from "@privy-io/node/viem";
import { createAuthorizationContext } from "@/lib/privy/authorization";
import { HttpTransport, ExchangeClient, InfoClient } from "@nktkas/hyperliquid";

/**
 * POST /api/hyperliquid/cancel-order
 * Cancels an open order on Hyperliquid.
 * Body: { coin: string, orderId: number }
 * Resolves coin name to asset index server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ error: "No auth token" }, { status: 401 });
    }

    const { coin, orderId } = await request.json();

    if (!coin || !orderId) {
      return NextResponse.json(
        { error: "coin and orderId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet) {
      return NextResponse.json(
        { error: "Wallet not found. Please set up your account first." },
        { status: 404 }
      );
    }

    // Auto-populate tradingWallet from main ethereum wallet if missing
    if (!userWallet.tradingWallet?.walletId &&
        userWallet.wallets?.ethereum?.walletId && userWallet.wallets?.ethereum?.address) {
      userWallet.tradingWallet = {
        walletId: userWallet.wallets.ethereum.walletId,
        address: userWallet.wallets.ethereum.address,
        chainType: 'ethereum',
        initialized: false,
      };
      await userWallet.save();
      console.log('[Cancel Order] Auto-populated tradingWallet from ethereum wallet:', userWallet.tradingWallet.address);
    }

    if (!userWallet.tradingWallet?.walletId) {
      return NextResponse.json(
        { error: "No Ethereum wallet found. Please visit Portfolio to set up your wallets." },
        { status: 404 }
      );
    }

    const transport = new HttpTransport({ isTestnet: false });
    const info = new InfoClient({ transport });

    // Resolve coin name to asset index
    const [meta, spotMeta] = await Promise.all([info.meta(), info.spotMeta()]);

    let assetIndex = -1;
    const spotIdx = spotMeta.universe.findIndex(
      (m: any) => m.name === coin || m.name === `${coin}/USDC`
    );
    if (spotIdx !== -1) {
      assetIndex = spotIdx + 10000;
    } else {
      const perpIdx = meta.universe.findIndex((m: any) => m.name === coin);
      if (perpIdx !== -1) {
        assetIndex = perpIdx;
      }
    }

    if (assetIndex === -1) {
      return NextResponse.json(
        { error: `Asset ${coin} not found on Hyperliquid` },
        { status: 400 }
      );
    }

    const authContext = await createAuthorizationContext(clerkJwt);

    const viemAccount = createViemAccount(privyClient, {
      walletId: userWallet.tradingWallet.walletId,
      address: userWallet.tradingWallet.address as `0x${string}`,
      authorizationContext: authContext,
    });

    const exchange = new ExchangeClient({ transport, wallet: viemAccount });

    const result = await exchange.cancel({
      cancels: [{ a: assetIndex, o: Number(orderId) }],
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[HL Cancel Order] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel order" },
      { status: 500 }
    );
  }
}
