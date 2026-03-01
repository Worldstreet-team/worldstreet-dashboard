import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Withdrawal from "@/models/Withdrawal";
import {
  verifySolanaTransaction,
  verifyEthereumTransaction,
} from "@/lib/treasury";

// ── POST: Auto-verify on-chain transaction ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { withdrawalId } = body;

    if (!withdrawalId) {
      return NextResponse.json(
        { error: "withdrawalId is required" },
        { status: 400 }
      );
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    if (!withdrawal.txHash) {
      return NextResponse.json(
        { error: "No transaction hash to verify" },
        { status: 400 }
      );
    }

    if (withdrawal.txVerified) {
      return NextResponse.json({
        success: true,
        message: "Transaction already verified",
      });
    }

    // Choose verification method based on chain
    let result: { verified: boolean; error?: string };

    if (withdrawal.chain === "solana") {
      result = await verifySolanaTransaction(
        withdrawal.txHash,
        withdrawal.treasuryWalletAddress,
        withdrawal.usdtAmount
      );
    } else if (withdrawal.chain === "ethereum") {
      result = await verifyEthereumTransaction(
        withdrawal.txHash,
        withdrawal.treasuryWalletAddress,
        withdrawal.usdtAmount
      );
    } else {
      return NextResponse.json(
        { error: `Unsupported chain: ${withdrawal.chain}` },
        { status: 400 }
      );
    }

    if (result.verified) {
      withdrawal.txVerified = true;
      withdrawal.txVerifiedAt = new Date();
      withdrawal.status = "tx_verified";
      await withdrawal.save();

      return NextResponse.json({
        success: true,
        message: "Transaction verified successfully",
        verified: true,
      });
    } else {
      // Don't update status, allow retry or manual verification
      return NextResponse.json({
        success: false,
        message: result.error || "Verification failed",
        verified: false,
      });
    }
  } catch (err) {
    console.error("Withdrawal verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
