import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import P2POrder from "@/models/P2POrder";
import { verifyToken } from "@/lib/auth-service";

// ── Auth helper ────────────────────────────────────────────────────────────

async function getAuthUser(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) return null;

  const result = await verifyToken(accessToken);
  if (result.success && result.data?.user) {
    return result.data.user;
  }
  return null;
}

// ── PATCH: Update order status (user actions) ──────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id: orderId } = await params;
    const body = await request.json();
    const { action, paymentReference } = body;

    const userId = authUser.userId;
    const order = await P2POrder.findOne({ _id: orderId, authUserId: userId });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // Check expiry
    if (order.expiresAt && new Date() > order.expiresAt && order.status !== "completed") {
      order.status = "expired";
      order.statusHistory.push({
        status: "expired",
        timestamp: new Date(),
        note: "Order expired",
      });
      await order.save();
      return NextResponse.json({ success: false, message: "Order has expired" }, { status: 400 });
    }

    switch (action) {
      case "mark_paid": {
        // Buy order: user claims they've sent fiat
        if (order.orderType !== "buy" || order.status !== "awaiting_payment") {
          return NextResponse.json(
            { success: false, message: "Cannot mark this order as paid" },
            { status: 400 }
          );
        }

        order.status = "payment_sent";
        order.paymentReference = paymentReference || "";
        order.statusHistory.push({
          status: "payment_sent",
          timestamp: new Date(),
          note: `User marked as paid. Ref: ${paymentReference || "N/A"}`,
        });
        await order.save();

        return NextResponse.json({ success: true, order: order.toObject() });
      }

      case "confirm_usdt_sent": {
        // Sell order: user confirms they've sent USDT to platform wallet
        if (order.orderType !== "sell" || order.status !== "awaiting_payment") {
          return NextResponse.json(
            { success: false, message: "Cannot confirm USDT transfer for this order" },
            { status: 400 }
          );
        }

        const { txHash } = body;
        if (!txHash) {
          return NextResponse.json(
            { success: false, message: "Transaction hash is required" },
            { status: 400 }
          );
        }

        order.status = "payment_sent";
        order.txHash = txHash;
        order.statusHistory.push({
          status: "payment_sent",
          timestamp: new Date(),
          note: `USDT sent to platform. TX: ${txHash}`,
        });
        await order.save();

        return NextResponse.json({ success: true, order: order.toObject() });
      }

      case "cancel": {
        // User can cancel if order is still pending or awaiting_payment
        if (!["pending", "awaiting_payment"].includes(order.status)) {
          return NextResponse.json(
            { success: false, message: "Cannot cancel this order" },
            { status: 400 }
          );
        }

        order.status = "cancelled";
        order.statusHistory.push({
          status: "cancelled",
          timestamp: new Date(),
          note: "Cancelled by user",
        });
        await order.save();

        return NextResponse.json({ success: true, order: order.toObject() });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("P2P PATCH error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// ── GET: Get single order details ──────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id: orderId } = await params;
    const userId = authUser.userId;
    const order = await P2POrder.findOne({ _id: orderId, authUserId: userId }).lean();

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("P2P GET order error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
