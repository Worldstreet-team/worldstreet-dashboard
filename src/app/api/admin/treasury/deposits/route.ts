import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DepositTransaction from "@/models/DepositTransaction";
import { getAuthUser } from "@/lib/auth";

// ── Admin auth ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;
  return user;
}

// ── GET: List all deposit transactions (admin view) ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const [deposits, total] = await Promise.all([
      DepositTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DepositTransaction.countDocuments(query),
    ]);

    // Status summary counts
    const statusCounts = await DepositTransaction.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, totalUsdt: { $sum: "$usdtAmount" } } },
    ]);

    const summary: Record<string, { count: number; totalUsdt: number }> = {};
    statusCounts.forEach((s: { _id: string; count: number; totalUsdt: number }) => {
      summary[s._id] = { count: s.count, totalUsdt: s.totalUsdt };
    });

    return NextResponse.json({
      success: true,
      deposits,
      summary,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin deposits GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
