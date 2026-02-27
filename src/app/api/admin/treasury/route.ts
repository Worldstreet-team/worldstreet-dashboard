import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DepositTransaction from "@/models/DepositTransaction";
import { getAuthUser } from "@/lib/auth";
import { sendUsdtFromTreasury } from "@/lib/treasury";

// ── Admin auth ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;
  return user;
}

// ── PATCH: Admin actions on a deposit ──────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { depositId, action, txHash, adminNote } = body;

    if (!depositId) {
      return NextResponse.json({ success: false, message: "Deposit ID is required" }, { status: 400 });
    }

    const deposit = await DepositTransaction.findById(depositId);
    if (!deposit) {
      return NextResponse.json({ success: false, message: "Deposit not found" }, { status: 404 });
    }

    switch (action) {
      // ── Retry failed USDT delivery ───────────────────────────────────
      case "retry_delivery": {
        if (deposit.status !== "delivery_failed") {
          return NextResponse.json(
            { success: false, message: "Can only retry delivery for deposits in delivery_failed status" },
            { status: 400 }
          );
        }

        // Update status
        deposit.status = "sending_usdt";
        deposit.deliveryError = undefined;
        deposit.statusHistory.push({
          status: "sending_usdt",
          timestamp: new Date(),
          note: `Admin (${admin.email}) retrying USDT delivery`,
        });
        await deposit.save();

        // Attempt USDT transfer
        const result = await sendUsdtFromTreasury(
          deposit.userSolanaAddress,
          deposit.usdtAmount
        );

        if (result.success && result.txHash) {
          deposit.status = "completed";
          deposit.txHash = result.txHash;
          deposit.completedAt = new Date();
          if (adminNote) deposit.adminNote = adminNote;
          deposit.statusHistory.push({
            status: "completed",
            timestamp: new Date(),
            note: `USDT delivered via admin retry. tx: ${result.txHash}`,
          });
          await deposit.save();

          return NextResponse.json({ success: true, deposit: deposit.toObject() });
        } else {
          deposit.status = "delivery_failed";
          deposit.deliveryError = result.error || "Unknown error";
          deposit.statusHistory.push({
            status: "delivery_failed",
            timestamp: new Date(),
            note: `Admin retry failed: ${result.error}`,
          });
          await deposit.save();

          return NextResponse.json({
            success: false,
            deposit: deposit.toObject(),
            message: `Retry failed: ${result.error}`,
          });
        }
      }

      // ── Manual complete (admin sends USDT externally) ────────────────
      case "manual_complete": {
        if (!["delivery_failed", "payment_confirmed", "sending_usdt"].includes(deposit.status)) {
          return NextResponse.json(
            { success: false, message: "Can only manually complete deposits that have confirmed payment" },
            { status: 400 }
          );
        }

        if (!txHash) {
          return NextResponse.json(
            { success: false, message: "Transaction hash is required for manual completion" },
            { status: 400 }
          );
        }

        deposit.status = "completed";
        deposit.txHash = txHash;
        deposit.completedAt = new Date();
        if (adminNote) deposit.adminNote = adminNote;
        deposit.statusHistory.push({
          status: "completed",
          timestamp: new Date(),
          note: `Manually completed by admin (${admin.email}). tx: ${txHash}. ${adminNote || ""}`,
        });
        await deposit.save();

        return NextResponse.json({ success: true, deposit: deposit.toObject() });
      }

      // ── Cancel deposit ───────────────────────────────────────────────
      case "cancel": {
        if (["completed", "cancelled"].includes(deposit.status)) {
          return NextResponse.json(
            { success: false, message: "Cannot cancel a completed or already cancelled deposit" },
            { status: 400 }
          );
        }

        deposit.status = "cancelled";
        if (adminNote) deposit.adminNote = adminNote;
        deposit.statusHistory.push({
          status: "cancelled",
          timestamp: new Date(),
          note: `Cancelled by admin (${admin.email}). ${adminNote || ""}`,
        });
        await deposit.save();

        return NextResponse.json({ success: true, deposit: deposit.toObject() });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Admin treasury PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
