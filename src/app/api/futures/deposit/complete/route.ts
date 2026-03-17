import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { completeFuturesDeposit } from "@/lib/futures/futuresDeposit";

/**
 * POST /api/futures/deposit/complete
 * 
 * Completes a futures margin deposit by bridging funds to Hyperliquid
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { depositId } = body;

    if (!depositId) {
      return NextResponse.json(
        { error: "Missing required field: depositId" },
        { status: 400 }
      );
    }

    // Get Clerk JWT for Privy authorization
    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ error: "Failed to get authorization token" }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    console.log("[Futures Deposit] Completing deposit:", {
      userId: clerkUserId,
      depositId,
    });

    // Complete the futures deposit
    const result = await completeFuturesDeposit({
      depositId,
      clerkUserId,
      clerkJwt,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to complete futures deposit",
          errorCode: result.errorCode,
        },
        { status: 400 }
      );
    }

    console.log("[Futures Deposit] Completed successfully:", result.txHash);

    return NextResponse.json({
      success: true,
      message: "Futures deposit completed successfully",
      deposit: {
        depositId,
        txHash: result.txHash,
        marginAmount: result.marginAmount,
        status: "completed",
      },
      executionTime: result.executionTime,
    });

  } catch (error: any) {
    console.error("[Futures Deposit] Completion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to complete futures deposit", 
        message: error.message 
      },
      { status: 500 }
    );
  }
}