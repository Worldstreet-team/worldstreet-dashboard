import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import { sendUsdtFromTreasury, sendEthUsdtFromTreasury } from "@/lib/treasury";

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

// ── GET: List deposits with filtering ──────────────────────────────────────

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
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query
    const query: Record<string, any> = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (email) {
      query.email = { $regex: email, $options: "i" };
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

    const [deposits, total] = await Promise.all([
      Deposit.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Deposit.countDocuments(query),
    ]);

    return NextResponse.json({
      deposits: deposits.map((d: any) => ({
        ...d,
        _id: d._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin deposits GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH: Admin actions (override status, retry delivery) ─────────────────

export async function PATCH(req: NextRequest) {
  try {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { depositId, action, note, newStatus } = body;

    if (!depositId || !action) {
      return NextResponse.json(
        { error: "depositId and action are required" },
        { status: 400 }
      );
    }

    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      return NextResponse.json(
        { error: "Deposit not found" },
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
      case "override_status": {
        if (!newStatus) {
          return NextResponse.json(
            { error: "newStatus is required for override_status" },
            { status: 400 }
          );
        }

        const validStatuses = [
          "completed",
          "payment_failed",
          "delivery_failed",
          "cancelled",
        ];
        if (!validStatuses.includes(newStatus)) {
          return NextResponse.json(
            { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
          );
        }

        deposit.status = newStatus;
        if (newStatus === "completed") {
          deposit.completedAt = new Date();
        }
        deposit.adminActions = [...(deposit.adminActions || []), adminAction];
        await deposit.save();

        return NextResponse.json({
          success: true,
          message: `Deposit status overridden to ${newStatus}`,
          deposit: {
            _id: deposit._id.toString(),
            status: deposit.status,
          },
        });
      }

      case "retry_delivery": {
        // Only retry for deposits where payment is confirmed but USDT delivery failed
        const retryableStatuses = [
          "payment_confirmed",
          "delivery_failed",
          "sending_usdt",
        ];
        if (!retryableStatuses.includes(deposit.status)) {
          return NextResponse.json(
            {
              error: `Cannot retry delivery for deposit with status: ${deposit.status}. Must be one of: ${retryableStatuses.join(", ")}`,
            },
            { status: 400 }
          );
        }

        // Update status to sending
        deposit.status = "sending_usdt";
        deposit.deliveryError = undefined;
        deposit.adminActions = [...(deposit.adminActions || []), adminAction];
        await deposit.save();

        // Attempt USDT delivery via correct chain
        const destAddress = deposit.userWalletAddress || deposit.userSolanaAddress;
        const isEthereum = deposit.network === "ethereum";

        const result = isEthereum
          ? await sendEthUsdtFromTreasury(destAddress, deposit.usdtAmount)
          : await sendUsdtFromTreasury(destAddress, deposit.usdtAmount);

        if (result.success) {
          deposit.status = "completed";
          deposit.txHash = result.txHash;
          deposit.completedAt = new Date();
          deposit.adminActions = [
            ...(deposit.adminActions || []),
            {
              action: "retry_delivery_success",
              adminEmail,
              note: `USDT delivery succeeded. TX: ${result.txHash}`,
              timestamp: new Date(),
            },
          ];
          await deposit.save();

          return NextResponse.json({
            success: true,
            message: "USDT delivery retry succeeded",
            txHash: result.txHash,
          });
        } else {
          deposit.status = "delivery_failed";
          deposit.deliveryError = result.error;
          deposit.adminActions = [
            ...(deposit.adminActions || []),
            {
              action: "retry_delivery_failed",
              adminEmail,
              note: `Retry failed: ${result.error}`,
              timestamp: new Date(),
            },
          ];
          await deposit.save();

          return NextResponse.json(
            {
              success: false,
              error: `Delivery retry failed: ${result.error}`,
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin deposits PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
