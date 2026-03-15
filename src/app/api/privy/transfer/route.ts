import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { bridgeToHyperliquid, validateBridgeAmount } from "@/lib/hyperliquid/bridge";

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, getToken } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { amount, asset = "USDC" } = await request.json();

    // Validate amount
    const validation = validateBridgeAmount(amount, asset);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    await connectDB();

    // First attempt: Find by clerkUserId
    let userWallet = await UserWallet.findOne({ clerkUserId: authUserId });
    console.log(`[Internal Transfer] Lookup by clerkUserId (${authUserId}): ${userWallet ? 'Found ✓' : 'Not Found ✗'}`);

    // Fallback: If not found by Clerk ID, try to find by Email if possible
    if (!userWallet) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;

      if (email) {
        userWallet = await UserWallet.findOne({ email });
        console.log(`[Internal Transfer] Lookup by email (${email}): ${userWallet ? 'Found ✓' : 'Not Found ✗'}`);

        // If found by email, link the clerkUserId for future lookups
        if (userWallet && !userWallet.clerkUserId) {
          userWallet.clerkUserId = authUserId;
          await userWallet.save();
          console.log(`[Internal Transfer] Linked clerkUserId ${authUserId} to existing wallet record`);
        }
      }
    }

    if (!userWallet || !userWallet.tradingWallet?.address || !userWallet.wallets?.ethereum?.address) {
      console.log(`[Internal Transfer] Wallet validation failed:`, {
        hasUserWallet: !!userWallet,
        hasTradingWallet: !!userWallet?.tradingWallet?.address,
        hasMainWallet: !!userWallet?.wallets?.ethereum?.address,
        tradingWallet: userWallet?.tradingWallet,
        mainWallet: userWallet?.wallets?.ethereum
      });

      const missingDetails = [];
      if (!userWallet) missingDetails.push("No wallet record found");
      else {
        if (!userWallet.tradingWallet?.address) missingDetails.push("Trading wallet missing in DB");
        if (!userWallet.wallets?.ethereum?.address) missingDetails.push("Main wallet missing in DB");
      }

      return NextResponse.json({
        success: false,
        error: "Wallets not fully initialized. Please set up your trading wallet first.",
        details: missingDetails.join(", "),
        debug: {
          clerkUserId: authUserId,
          foundEmail: userWallet?.email || 'unknown'
        }
      }, { status: 404 });
    }

    // Use trading wallet for the bridge transfer
    const mainWalletAddress = userWallet.tradingWallet?.address || userWallet.wallets.ethereum.address;
    const mainWalletId = userWallet.tradingWallet?.walletId || userWallet.wallets.ethereum.walletId;

    console.log(`[Hyperliquid Deposit] Using Wallet ID: ${mainWalletId} (Address: ${mainWalletAddress})`);

    // Get Auth Context for signing
    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ success: false, error: "Failed to get auth token" }, { status: 401 });
    }

    // Use the shared bridge utility
    const result = await bridgeToHyperliquid({
      walletId: mainWalletId,
      amount,
      asset: asset as 'USDC' | 'ETH',
      clerkJwt
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        details: result.details
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        txHash: result.txHash,
        from: mainWalletAddress,
        to: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7', // HL Bridge
        amount,
        asset
      }
    });

  } catch (error: any) {
    console.error("[Internal Transfer] Error:", error);

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process transfer",
      details: error.message
    }, { status: 500 });
  }
}
