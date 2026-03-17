import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";
import FuturesDeposit from "@/models/FuturesDeposit";

/**
 * POST /api/futures/deposit/initiate
 * 
 * Initiates a futures margin deposit
 * Similar to spot deposit but for futures margin account
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { depositChain, depositAmount, depositFromAddress, depositToken = "USDT" } = body;

    // Validate required fields
    if (!depositChain || !depositAmount || !depositFromAddress) {
      return NextResponse.json(
        { error: "Missing required fields: depositChain, depositAmount, depositFromAddress" },
        { status: 400 }
      );
    }

    // Validate deposit amount (minimum 10 USDT for futures)
    if (depositAmount < 10) {
      return NextResponse.json(
        { error: "Minimum deposit amount is 10 USDT for futures trading" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user wallet - must have futures wallet setup
    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet?.futuresWallet?.walletId || !userWallet?.futuresWallet?.address) {
      return NextResponse.json(
        { error: "Futures wallet not found. Please setup futures wallet first." },
        { status: 404 }
      );
    }

    console.log("[Futures Deposit] Initiating deposit:", {
      userId: clerkUserId,
      email: userWallet.email,
      depositChain,
      depositAmount,
      depositToken,
    });

    // Create futures deposit record
    const futuresDeposit = new FuturesDeposit({
      userId: clerkUserId,
      email: userWallet.email,
      depositChain,
      depositToken,
      depositAmount,
      futuresWalletAddress: userWallet.futuresWallet.address,
      futuresWalletId: userWallet.futuresWallet.walletId,
      depositFromAddress,
      status: "pending",
      createdAt: new Date(),
    });

    await futuresDeposit.save();

    console.log("[Futures Deposit] Created deposit record:", futuresDeposit._id);

    // Return treasury address for user to send funds
    const treasuryAddress = process.env.TREASURY_WALLET_ADDRESS;
    if (!treasuryAddress) {
      throw new Error("Treasury wallet address not configured");
    }

    return NextResponse.json({
      success: true,
      message: "Futures deposit initiated successfully",
      deposit: {
        depositId: futuresDeposit._id,
        treasuryAddress,
        depositChain,
        depositToken,
        depositAmount,
        status: "pending",
        instructions: `Send ${depositAmount} ${depositToken} to the treasury address to complete your futures margin deposit.`,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("[Futures Deposit] Initiation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to initiate futures deposit", 
        message: error.message 
      },
      { status: 500 }
    );
  }
}