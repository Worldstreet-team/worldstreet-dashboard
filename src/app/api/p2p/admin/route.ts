import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import P2POrder from "@/models/P2POrder";
import { getAuthUser } from "@/lib/auth";

// ── Admin emails (hardcoded for now — move to env/db later) ────────────────
const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

// ── Admin auth helper ──────────────────────────────────────────────────────

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;

  const email = (user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;

  return user;
}

// ── GET: List all orders (admin view) ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;

    const [orders, total] = await Promise.all([
      P2POrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      P2POrder.countDocuments(query),
    ]);

    // Count by status for summary
    const statusCounts = await P2POrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const summary: Record<string, number> = {};
    statusCounts.forEach((s: { _id: string; count: number }) => {
      summary[s._id] = s.count;
    });

    return NextResponse.json({
      success: true,
      orders,
      summary,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin P2P GET error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH: Admin actions on an order ───────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { orderId, action, adminNote, txHash } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    const order = await P2POrder.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    switch (action) {
      case "approve": {
        // Admin confirms payment received (buy) or USDT received (sell)
        if (order.status !== "payment_sent") {
          return NextResponse.json(
            { success: false, message: "Order is not in payment_sent status" },
            { status: 400 }
          );
        }

        order.status = "completed";
        order.completedAt = new Date();
        if (adminNote) order.adminNote = adminNote;
        if (txHash) order.txHash = txHash;
        order.statusHistory.push({
          status: "completed",
          timestamp: new Date(),
          note: `Approved by admin (${admin.email}). ${adminNote || ""}`,
        });
        await order.save();

        return NextResponse.json({ success: true, order: order.toObject() });
      }

      case "reject": {
        // Admin rejects/cancels the order
        if (["completed", "cancelled", "expired"].includes(order.status)) {
          return NextResponse.json(
            { success: false, message: "Cannot reject a completed/cancelled/expired order" },
            { status: 400 }
          );
        }

        order.status = "cancelled";
        if (adminNote) order.adminNote = adminNote;
        order.statusHistory.push({
          status: "cancelled",
          timestamp: new Date(),
          note: `Rejected by admin (${admin.email}). ${adminNote || ""}`,
        });
        await order.save();

        return NextResponse.json({ success: true, order: order.toObject() });
      }

      default:
        return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin P2P PATCH error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
