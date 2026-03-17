import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import FuturesDeposit from "@/models/FuturesDeposit";

/**
 * GET /api/futures/deposit/status?depositId=xxx
 * 
 * Checks the status of a futures margin deposit
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const depositId = searchParams.get("depositId");

    if (!depositId) {
      return NextResponse.json(
        { error: "Missing required parameter: depositId" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    console.log("[Futures Deposit] Checking status:", {
      userId: clerkUserId,
      depositId,
    });

    // Find the deposit record
    const deposit = await FuturesDeposit.findOne({
      _id: depositId,
      userId: clerkUserId,
    });

    if (!deposit) {
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    // Return deposit status
    return NextResponse.json({
      success: true,
      deposit: {
        depositId: deposit._id,
        status: deposit.status,
        depositChain: deposit.depositChain,
        depositToken: deposit.depositToken,
        depositAmount: deposit.depositAmount,
        marginAmount: deposit.marginAmount,
        txHash: deposit.txHash,
        bridgeTxHash: deposit.bridgeTxHash,
        error: deposit.error,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
        completedAt: deposit.completedAt,
      },
    });

  } catch (error: any) {
    console.error("[Futures Deposit] Status check error:", error);
    return NextResponse.json(
      { 
        error: "Failed to check deposit status", 
        message: error.message 
      },
      { status: 500 }
    );
  }
}