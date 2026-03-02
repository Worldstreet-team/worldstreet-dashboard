import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import { sendUsdtFromTreasury, sendEthUsdtFromTreasury, checkTreasuryBalance } from "@/lib/treasury";

// ── GlobalPay Webhook ──────────────────────────────────────────────────────
// URL to configure in GlobalPay dashboard:
//   https://yourdomain.com/api/deposit/webhook
//
// GlobalPay sends POST requests here when a payment status changes.
// This endpoint is unauthenticated (no Clerk) — validation is done via
// matching the transaction reference against our DB records.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("GlobalPay webhook received:", JSON.stringify(body).slice(0, 1000));

    // GlobalPay webhook payload fields (common formats):
    const transactionReference =
      body.transactionReference ||
      body.data?.transactionReference ||
      body.TransactionReference ||
      body.data?.TransactionReference ||
      "";

    const merchantReference =
      body.merchantTransactionReference ||
      body.data?.merchantTransactionReference ||
      body.MerchantTransactionReference ||
      body.data?.MerchantTransactionReference ||
      "";

    const paymentStatus = (
      body.transactionStatus ||
      body.data?.transactionStatus ||
      body.TransactionStatus ||
      body.data?.TransactionStatus ||
      body.status ||
      ""
    ).toLowerCase();

    if (!transactionReference && !merchantReference) {
      console.warn("Webhook: No transaction reference found in payload");
      return NextResponse.json(
        { success: false, message: "No transaction reference" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find deposit by GlobalPay reference or merchant reference
    let deposit = null;
    if (transactionReference) {
      deposit = await Deposit.findOne({
        globalPayTransactionReference: transactionReference,
      });
    }
    if (!deposit && merchantReference) {
      deposit = await Deposit.findOne({
        merchantTransactionReference: merchantReference,
      });
    }

    if (!deposit) {
      console.warn(
        `Webhook: No matching deposit for refs GP=${transactionReference} Merchant=${merchantReference}`
      );
      return NextResponse.json(
        { success: false, message: "Deposit not found" },
        { status: 404 }
      );
    }

    console.log(
      `Webhook: Found deposit ${deposit._id} (status: ${deposit.status}) — payment status: ${paymentStatus}`
    );

    // If already completed or cancelled, ignore
    if (["completed", "cancelled"].includes(deposit.status)) {
      return NextResponse.json({
        success: true,
        message: `Deposit already ${deposit.status}`,
      });
    }

    // Process based on payment status
    if (
      paymentStatus === "successful" ||
      paymentStatus === "completed" ||
      paymentStatus === "approved"
    ) {
      deposit.status = "payment_confirmed";
      await deposit.save();

      // Pre-flight balance check
      const balCheck = await checkTreasuryBalance(
        deposit.network || "solana",
        deposit.usdtAmount
      );

      if (!balCheck.ok) {
        deposit.status = "delivery_failed";
        deposit.deliveryError = balCheck.error || "Treasury has insufficient funds.";
        await deposit.save();

        console.error(
          `Webhook: Treasury balance check failed for deposit ${deposit._id}: ${balCheck.error}`
        );
        return NextResponse.json({
          success: false,
          message: balCheck.error || "Treasury has insufficient USDT. Admin has been notified.",
        });
      }

      // Auto-send USDT
      deposit.status = "sending_usdt";
      await deposit.save();

      const destAddress =
        deposit.userWalletAddress || deposit.userSolanaAddress;
      const isEthereum = deposit.network === "ethereum";

      try {
        const result = isEthereum
          ? await sendEthUsdtFromTreasury(destAddress, deposit.usdtAmount)
          : await sendUsdtFromTreasury(destAddress, deposit.usdtAmount);

        if (result.success && result.txHash) {
          deposit.status = "completed";
          deposit.txHash = result.txHash;
          deposit.completedAt = new Date();
          await deposit.save();

          console.log(
            `Webhook: Deposit ${deposit._id} completed — txHash: ${result.txHash}`
          );
        } else {
          deposit.status = "delivery_failed";
          deposit.deliveryError =
            result.error || "USDT transfer failed via webhook";
          await deposit.save();

          console.error(
            `Webhook: USDT delivery failed for deposit ${deposit._id}:`,
            result.error
          );
        }
      } catch (sendErr) {
        deposit.status = "delivery_failed";
        deposit.deliveryError = "Exception during USDT transfer";
        await deposit.save();
        console.error(
          `Webhook: Exception sending USDT for deposit ${deposit._id}:`,
          sendErr
        );
      }

      return NextResponse.json({ success: true, message: "Payment processed" });
    } else if (paymentStatus === "failed" || paymentStatus === "declined") {
      deposit.status = "payment_failed";
      await deposit.save();

      console.log(`Webhook: Deposit ${deposit._id} payment failed/declined`);
      return NextResponse.json({
        success: true,
        message: "Payment failure recorded",
      });
    } else {
      // Pending or unknown status — just log
      console.log(
        `Webhook: Deposit ${deposit._id} — unhandled status: ${paymentStatus}`
      );
      return NextResponse.json({
        success: true,
        message: `Status noted: ${paymentStatus}`,
      });
    }
  } catch (error) {
    console.error("GlobalPay webhook error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also handle GET for verification/testing
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "GlobalPay deposit webhook",
    message: "Send POST requests to this endpoint",
  });
}
