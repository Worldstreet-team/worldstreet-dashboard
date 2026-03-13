import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { signEthereumMessage, signSolanaMessage } from "@/lib/privy/signing";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/wallet/sign
 * Sign a message with user's wallet
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Clerk JWT
    const { userId, token } = await verifyClerkJWT(request);

    // Parse request body
    const { message, chain } = await request.json();

    // Validate inputs
    if (!message || !chain) {
      return NextResponse.json(
        { error: "Missing required fields: message, chain" },
        { status: 400 }
      );
    }

    if (chain !== "ethereum" && chain !== "solana") {
      return NextResponse.json(
        { error: "Invalid chain. Must be 'ethereum' or 'solana'" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user's wallet
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (!userWallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    let signature;
    if (chain === "ethereum") {
      const walletId = userWallet.wallets.ethereum?.walletId;
      if (!walletId) {
        return NextResponse.json(
          { error: "Ethereum wallet not found" },
          { status: 404 }
        );
      }
      signature = await signEthereumMessage(walletId, message, token);
    } else {
      const walletId = userWallet.wallets.solana?.walletId;
      if (!walletId) {
        return NextResponse.json(
          { error: "Solana wallet not found" },
          { status: 404 }
        );
      }
      signature = await signSolanaMessage(walletId, message, token);
    }

    return NextResponse.json({
      success: true,
      signature,
      chain
    });
  } catch (error: any) {
    console.error("Sign message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign message" },
      { status: 500 }
    );
  }
}
