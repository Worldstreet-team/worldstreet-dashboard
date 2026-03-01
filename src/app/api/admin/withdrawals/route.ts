import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Withdrawal from "@/models/Withdrawal";

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function verifyAdmin() {
  const user = await currentUser();
  if (!user) return null;
  const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || "";
  if (!ADMIN_EMAILS.includes(email)) return null;
  return email;
}

// ── GET: List withdrawals with filtering ───────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status");
    const email = url.searchParams.get("email");
    const chain = url.searchParams.get("chain");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const query: Record<string, any> = {};

    if (status && status !== "all") {
      query.status = status;
    }
    if (email) {
      query.email = { $regex: email, $options: "i" };
    }
    if (chain && chain !== "all") {
      query.chain = chain;
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query),
    ]);

    return NextResponse.json({
      withdrawals: withdrawals.map((w: any) => ({
        ...w,
        _id: w._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin withdrawals GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH: Admin actions ───────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { withdrawalId, action, note, payoutReference, newStatus } = body;

    if (!withdrawalId || !action) {
      return NextResponse.json(
        { error: "withdrawalId and action are required" },
        { status: 400 }
      );
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    const adminAction = {
      action,
      adminEmail,
      note: note || "",
      timestamp: new Date(),
    };

    switch (action) {
      case "verify_tx": {
        // Manually verify the on-chain transaction
        if (withdrawal.txVerified) {
          return NextResponse.json(
            { error: "Transaction already verified" },
            { status: 400 }
          );
        }

        withdrawal.txVerified = true;
        withdrawal.txVerifiedAt = new Date();
        withdrawal.status = "tx_verified";
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: "Transaction verified successfully",
        });
      }

      case "mark_processing": {
        if (!["tx_verified", "usdt_sent"].includes(withdrawal.status)) {
          return NextResponse.json(
            { error: `Cannot mark as processing from status: ${withdrawal.status}` },
            { status: 400 }
          );
        }

        withdrawal.status = "processing";
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: "Withdrawal marked as processing",
        });
      }

      case "mark_ngn_sent": {
        if (!["tx_verified", "processing"].includes(withdrawal.status)) {
          return NextResponse.json(
            {
              error: `Cannot mark NGN sent from status: ${withdrawal.status}. Must be tx_verified or processing.`,
            },
            { status: 400 }
          );
        }

        withdrawal.status = "ngn_sent";
        withdrawal.payoutReference = payoutReference || "";
        withdrawal.adminNote = note || withdrawal.adminNote;
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: "Withdrawal marked as NGN sent",
        });
      }

      case "mark_completed": {
        if (!["ngn_sent", "processing", "tx_verified"].includes(withdrawal.status)) {
          return NextResponse.json(
            { error: `Cannot complete from status: ${withdrawal.status}` },
            { status: 400 }
          );
        }

        withdrawal.status = "completed";
        withdrawal.completedAt = new Date();
        withdrawal.payoutReference = payoutReference || withdrawal.payoutReference;
        withdrawal.adminNote = note || withdrawal.adminNote;
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: "Withdrawal completed",
        });
      }

      case "reject": {
        if (["completed", "cancelled"].includes(withdrawal.status)) {
          return NextResponse.json(
            { error: "Cannot reject a completed or cancelled withdrawal" },
            { status: 400 }
          );
        }

        withdrawal.status = "failed";
        withdrawal.adminNote = note || withdrawal.adminNote;
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: "Withdrawal rejected",
        });
      }

      case "override_status": {
        if (!newStatus) {
          return NextResponse.json(
            { error: "newStatus is required for override_status" },
            { status: 400 }
          );
        }

        const validStatuses = [
          "pending", "usdt_sent", "tx_verified", "processing",
          "ngn_sent", "completed", "failed", "cancelled",
        ];
        if (!validStatuses.includes(newStatus)) {
          return NextResponse.json(
            { error: `Invalid status: ${newStatus}` },
            { status: 400 }
          );
        }

        withdrawal.status = newStatus;
        if (newStatus === "completed") {
          withdrawal.completedAt = new Date();
        }
        withdrawal.adminActions.push(adminAction);
        await withdrawal.save();

        return NextResponse.json({
          success: true,
          message: `Withdrawal status overridden to ${newStatus}`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin withdrawals PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
