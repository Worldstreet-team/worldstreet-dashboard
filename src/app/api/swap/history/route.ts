import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SwapTransaction from "@/models/SwapTransaction";
import { getAuthUser } from "@/lib/auth";
import { SWAP_CHAINS, ChainKey } from "@/app/context/swapContext";

// ── GET: Fetch swap history ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const status = searchParams.get("status"); // Optional filter

    const query: Record<string, unknown> = { userId: user.userId };
    if (status && ["PENDING", "DONE", "FAILED"].includes(status)) {
      query.status = status;
    }

    const [swaps, total] = await Promise.all([
      SwapTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SwapTransaction.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      swaps,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/swap/history error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST: Save new swap ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      txHash,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      toAmountMin,
      status,
      tool,
      toolLogoURI,
      gasCostUSD,
      feeCostUSD,
    } = body;

    // Validation
    if (!txHash || !fromChain || !toChain || !fromToken || !toToken || !fromAmount || !toAmount) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!(fromChain in SWAP_CHAINS) || !(toChain in SWAP_CHAINS)) {
      return NextResponse.json(
        { success: false, message: "Invalid chain" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await SwapTransaction.findOne({ txHash });
    if (existing) {
      return NextResponse.json({
        success: true,
        swap: existing,
        message: "Swap already exists",
      });
    }

    const fromChainId = SWAP_CHAINS[fromChain as ChainKey].id;
    const toChainId = SWAP_CHAINS[toChain as ChainKey].id;

    const swap = await SwapTransaction.create({
      userId: user.userId,
      txHash,
      fromChain,
      toChain,
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      toAmountMin,
      status: status || "PENDING",
      tool,
      toolLogoURI,
      gasCostUSD,
      feeCostUSD,
    });

    return NextResponse.json({
      success: true,
      swap,
    });
  } catch (error) {
    console.error("POST /api/swap/history error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH: Update swap status ──────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { txHash, status, substatus, substatusMessage, receivingTxHash, toAmount } = body;

    if (!txHash) {
      return NextResponse.json(
        { success: false, message: "txHash required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (substatus) updateData.substatus = substatus;
    if (substatusMessage) updateData.substatusMessage = substatusMessage;
    if (receivingTxHash) updateData.receivingTxHash = receivingTxHash;
    if (toAmount) updateData.toAmount = toAmount;
    if (status === "DONE" || status === "FAILED") {
      updateData.completedAt = new Date();
    }

    const swap = await SwapTransaction.findOneAndUpdate(
      { txHash, userId: user.userId },
      { $set: updateData },
      { new: true }
    );

    if (!swap) {
      return NextResponse.json(
        { success: false, message: "Swap not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      swap,
    });
  } catch (error) {
    console.error("PATCH /api/swap/history error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
