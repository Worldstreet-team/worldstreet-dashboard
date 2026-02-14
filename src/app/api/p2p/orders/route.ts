import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import P2POrder from "@/models/P2POrder";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

// ── Constants ──────────────────────────────────────────────────────────────

const ORDER_EXPIRY_MINUTES = 30;
const MIN_USDT = 5;
const MAX_USDT = 5000;
const PLATFORM_MARKUP = 5; // 5%

const PLATFORM_BANK_DETAILS: Record<string, { bankName: string; accountNumber: string; accountName: string }> = {
  NGN: {
    bankName: "Sterling Bank",
    accountNumber: "0114822083",
    accountName: "Greg Osimiri",
  },
};

// ── Auth: uses shared Clerk helper from @/lib/auth ──────────────────────────────

// ── GET: List user's P2P orders ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = { authUserId: authUser.userId };
    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      P2POrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      P2POrder.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("P2P GET error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// ── POST: Create a new P2P order ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      orderType,     // "buy" | "sell"
      usdtAmount,    // number
      fiatCurrency,  // "NGN" | "USD" | "GBP"
      exchangeRate,  // rate at time of order
      bankDetails,   // for sell orders: { bankName, accountNumber, accountName }
    } = body;

    // ── Validation ───────────────────────────────────────────────────────

    if (!orderType || !["buy", "sell"].includes(orderType)) {
      return NextResponse.json({ success: false, message: "Invalid order type" }, { status: 400 });
    }

    if (!usdtAmount || usdtAmount < MIN_USDT || usdtAmount > MAX_USDT) {
      return NextResponse.json(
        { success: false, message: `USDT amount must be between ${MIN_USDT} and ${MAX_USDT}` },
        { status: 400 }
      );
    }

    if (!fiatCurrency || !["NGN", "USD", "GBP"].includes(fiatCurrency)) {
      return NextResponse.json({ success: false, message: "Invalid fiat currency" }, { status: 400 });
    }

    if (!exchangeRate || exchangeRate <= 0) {
      return NextResponse.json({ success: false, message: "Invalid exchange rate" }, { status: 400 });
    }

    // Get user's profile to find their Solana address
    const userId = authUser.userId;
    const profile = await DashboardProfile.findOne({ authUserId: userId });

    if (!profile || !profile.walletsGenerated || !profile.wallets?.solana?.address) {
      return NextResponse.json(
        { success: false, message: "Wallet not set up. Please create a wallet first." },
        { status: 400 }
      );
    }

    // For sell orders, bank details are required
    if (orderType === "sell") {
      if (!bankDetails?.bankName || !bankDetails?.accountNumber || !bankDetails?.accountName) {
        return NextResponse.json(
          { success: false, message: "Bank details are required for sell orders" },
          { status: 400 }
        );
      }

      // Save bank details to user profile for future use
      if (!profile.get("savedBankDetails")) {
        profile.set("savedBankDetails", bankDetails);
        await profile.save();
      }
    }

    // Check for existing pending/active orders
    const activeOrder = await P2POrder.findOne({
      authUserId: userId,
      status: { $in: ["pending", "awaiting_payment", "payment_sent"] },
    });

    if (activeOrder) {
      return NextResponse.json(
        { success: false, message: "You already have an active order. Please complete or cancel it first." },
        { status: 400 }
      );
    }

    // ── Calculate fiat amount ────────────────────────────────────────────

    const fiatAmount = Math.round(usdtAmount * exchangeRate * 100) / 100;

    // ── Create order ─────────────────────────────────────────────────────

    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    const order = await P2POrder.create({
      authUserId: userId,
      email: profile.email,
      orderType,
      usdtAmount,
      fiatAmount,
      fiatCurrency,
      exchangeRate,
      platformMarkup: PLATFORM_MARKUP,
      userSolanaAddress: profile.wallets.solana.address,
      userBankDetails: orderType === "sell" ? bankDetails : undefined,
      status: "awaiting_payment",
      statusHistory: [
        { status: "pending", timestamp: new Date(), note: "Order created" },
        { status: "awaiting_payment", timestamp: new Date(), note: orderType === "buy" ? "Awaiting fiat payment" : "Awaiting USDT transfer" },
      ],
      expiresAt,
    });

    // Build response with platform bank details for buy orders
    const response: Record<string, unknown> = {
      success: true,
      order: order.toObject(),
    };

    if (orderType === "buy") {
      response.platformBankDetails = PLATFORM_BANK_DETAILS[fiatCurrency] || null;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("P2P POST error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
