import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DepositTransaction from "@/models/DepositTransaction";
import { getAuthUser } from "@/lib/auth";

// ── GET: Get deposit status by ID ──────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, message: "Deposit ID is required" }, { status: 400 });
    }

    await connectDB();

    const deposit = await DepositTransaction.findById(id).lean();
    if (!deposit) {
      return NextResponse.json({ success: false, message: "Deposit not found" }, { status: 404 });
    }

    // Verify ownership
    if (deposit.authUserId !== authUser.userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      deposit: {
        _id: deposit._id,
        usdtAmount: deposit.usdtAmount,
        fiatAmount: deposit.fiatAmount,
        fiatCurrency: deposit.fiatCurrency,
        exchangeRate: deposit.exchangeRate,
        merchantTransactionReference: deposit.merchantTransactionReference,
        status: deposit.status,
        txHash: deposit.txHash,
        deliveryError: deposit.deliveryError,
        statusHistory: deposit.statusHistory,
        createdAt: deposit.createdAt,
        completedAt: deposit.completedAt,
      },
    });
  } catch (error) {
    console.error("Deposit status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH: Cancel a pending deposit ────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const body = await request.json();
    const { action } = body;

    if (action !== "cancel") {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    const deposit = await DepositTransaction.findById(id);
    if (!deposit) {
      return NextResponse.json({ success: false, message: "Deposit not found" }, { status: 404 });
    }

    // Verify ownership
    if (deposit.authUserId !== authUser.userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Only allow cancelling pending/awaiting deposits
    if (!["pending", "awaiting_verification", "payment_failed"].includes(deposit.status)) {
      return NextResponse.json(
        { success: false, message: `Cannot cancel deposit in ${deposit.status} status` },
        { status: 400 }
      );
    }

    deposit.status = "cancelled";
    deposit.statusHistory.push({
      status: "cancelled",
      timestamp: new Date(),
      note: "Cancelled by user",
    });
    await deposit.save();

    return NextResponse.json({ success: true, deposit: deposit.toObject() });
  } catch (error) {
    console.error("Deposit cancel error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
