import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WalletTransfer from "@/models/WalletTransfer";
import { getAuthUser } from "@/lib/auth";

// ── GET: List user's wallet transfers ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const type = searchParams.get("type");       // send | receive | internal
    const status = searchParams.get("status");   // pending | confirmed | failed

    const query: Record<string, unknown> = { userId: authUser.userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const [transfers, total] = await Promise.all([
      WalletTransfer.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WalletTransfer.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      transfers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("WalletTransfer GET error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// ── POST: Record a wallet transfer ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { type, direction, chain, token, amount, fromAddress, toAddress, txHash, status, memo } = body;

    // Validate required fields
    if (!type || !direction || !chain || !token || amount == null) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: type, direction, chain, token, amount" },
        { status: 400 }
      );
    }

    const validTypes = ["send", "receive", "internal"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
    }

    const validChains = ["solana", "ethereum", "arbitrum", "sui", "ton", "tron"];
    if (!validChains.includes(chain)) {
      return NextResponse.json({ success: false, message: "Invalid chain" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ success: false, message: "Amount must be a positive number" }, { status: 400 });
    }

    // Prevent duplicate txHash records
    if (txHash) {
      const existing = await WalletTransfer.findOne({ txHash, userId: authUser.userId });
      if (existing) {
        return NextResponse.json({ success: true, transfer: existing, duplicate: true });
      }
    }

    const transfer = await WalletTransfer.create({
      userId: authUser.userId,
      type,
      direction,
      chain,
      token,
      amount,
      fromAddress,
      toAddress,
      txHash,
      status: status || "confirmed",
      memo,
    });

    return NextResponse.json({ success: true, transfer }, { status: 201 });
  } catch (error) {
    console.error("WalletTransfer POST error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
