import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DepositTransaction from "@/models/DepositTransaction";
import { getAuthUser } from "@/lib/auth";
import { sendUsdtFromTreasury } from "@/lib/treasury";

// ── Constants ──────────────────────────────────────────────────────────────

// GlobalPay transaction status API
// Live and test endpoints follow the same base as the payment link API
const GLOBALPAY_LIVE_URL =
  "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/get-transaction-status";
const GLOBALPAY_TEST_URL =
  "https://newwebservicetest.zenithbank.com:8443/new-globalpay-paymentgateway-external/api/paymentgateway/get-transaction-status";

const IS_LIVE = process.env.NODE_ENV === "production";

// ── Helper: Query GlobalPay for transaction status ─────────────────────────

interface GlobalPayStatusResponse {
  success: boolean;
  status?: string;        // e.g. "Successful", "Pending", "Failed"
  gatewayReference?: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

async function queryGlobalPayStatus(
  merchantTransactionReference: string
): Promise<GlobalPayStatusResponse> {
  const secretKey = process.env.GLOBALPAY_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: "GLOBALPAY_SECRET_KEY not configured" };
  }

  const url = IS_LIVE ? GLOBALPAY_LIVE_URL : GLOBALPAY_TEST_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: secretKey,
      },
      body: JSON.stringify({ merchantTransactionReference }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[GlobalPay] Status API returned ${res.status}: ${errorText}`);
      return { success: false, error: `GlobalPay API returned ${res.status}` };
    }

    const data = await res.json();

    // GlobalPay typically returns:
    // { data: { status: "Successful"|"Pending"|"Failed", transactionReference: "..." } }
    const txData = data?.data || data;
    const status = txData?.status || txData?.transactionStatus || "";
    const gatewayRef = txData?.transactionReference || txData?.gatewayReference || "";

    return {
      success: true,
      status: status,
      gatewayReference: gatewayRef,
      rawResponse: data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[GlobalPay] Status query failed: ${message}`);
    return { success: false, error: message };
  }
}

// ── POST: User clicks "I've Paid" → verify + deliver USDT ─────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { depositId } = body;

    if (!depositId) {
      return NextResponse.json({ success: false, message: "Deposit ID is required" }, { status: 400 });
    }

    // ── Find deposit ─────────────────────────────────────────────────────

    const deposit = await DepositTransaction.findById(depositId);
    if (!deposit) {
      return NextResponse.json({ success: false, message: "Deposit not found" }, { status: 404 });
    }

    // Verify ownership
    if (deposit.authUserId !== authUser.userId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── Idempotency: already completed ───────────────────────────────────

    if (deposit.status === "completed") {
      return NextResponse.json({
        success: true,
        deposit: deposit.toObject(),
        message: "Deposit already completed",
      });
    }

    // ── Don't reverify if already in process ─────────────────────────────

    if (deposit.status === "sending_usdt" || deposit.status === "payment_confirmed") {
      return NextResponse.json({
        success: true,
        deposit: deposit.toObject(),
        message: "Deposit is being processed",
      });
    }

    // ── Only verify pending or awaiting deposits ─────────────────────────

    if (!["pending", "awaiting_verification", "payment_failed"].includes(deposit.status)) {
      return NextResponse.json({
        success: false,
        message: `Cannot verify deposit in ${deposit.status} status`,
      }, { status: 400 });
    }

    // ── Update status to verifying ───────────────────────────────────────

    deposit.status = "verifying";
    deposit.statusHistory.push({
      status: "verifying",
      timestamp: new Date(),
      note: "User clicked 'I've Paid' — verifying with GlobalPay",
    });
    await deposit.save();

    // ── Query GlobalPay API ──────────────────────────────────────────────

    const gpResult = await queryGlobalPayStatus(deposit.merchantTransactionReference);

    if (!gpResult.success) {
      // API call failed — revert to awaiting_verification so user can retry
      deposit.status = "awaiting_verification";
      deposit.statusHistory.push({
        status: "awaiting_verification",
        timestamp: new Date(),
        note: `GlobalPay verification failed: ${gpResult.error}`,
      });
      await deposit.save();

      return NextResponse.json({
        success: false,
        message: "Unable to verify payment with GlobalPay. Please try again in a moment.",
        deposit: deposit.toObject(),
      });
    }

    // Store gateway info
    deposit.gatewayStatus = gpResult.status || "";
    if (gpResult.gatewayReference) {
      deposit.gatewayReference = gpResult.gatewayReference;
    }

    // ── Check payment status ─────────────────────────────────────────────

    const normalizedStatus = (gpResult.status || "").toLowerCase();

    if (normalizedStatus === "successful" || normalizedStatus === "approved" || normalizedStatus === "completed") {
      // ── Payment confirmed — send USDT ────────────────────────────────
      deposit.status = "payment_confirmed";
      deposit.statusHistory.push({
        status: "payment_confirmed",
        timestamp: new Date(),
        note: `GlobalPay confirmed: ${gpResult.status}`,
      });
      await deposit.save();

      // ── Send USDT from treasury ──────────────────────────────────────
      deposit.status = "sending_usdt";
      deposit.statusHistory.push({
        status: "sending_usdt",
        timestamp: new Date(),
        note: `Sending ${deposit.usdtAmount} USDT to ${deposit.userSolanaAddress}`,
      });
      await deposit.save();

      const transferResult = await sendUsdtFromTreasury(
        deposit.userSolanaAddress,
        deposit.usdtAmount
      );

      if (transferResult.success && transferResult.txHash) {
        deposit.status = "completed";
        deposit.txHash = transferResult.txHash;
        deposit.completedAt = new Date();
        deposit.statusHistory.push({
          status: "completed",
          timestamp: new Date(),
          note: `USDT delivered. tx: ${transferResult.txHash}`,
        });
        await deposit.save();

        return NextResponse.json({
          success: true,
          deposit: deposit.toObject(),
          message: "Deposit completed! USDT has been sent to your wallet.",
        });
      } else {
        // USDT delivery failed — payment was confirmed but we couldn't send
        deposit.status = "delivery_failed";
        deposit.deliveryError = transferResult.error || "Unknown transfer error";
        deposit.statusHistory.push({
          status: "delivery_failed",
          timestamp: new Date(),
          note: `USDT delivery failed: ${transferResult.error}`,
        });
        await deposit.save();

        return NextResponse.json({
          success: false,
          deposit: deposit.toObject(),
          message: "Payment confirmed but USDT delivery failed. Our team has been notified and will resolve this shortly.",
        });
      }
    } else if (normalizedStatus === "pending" || normalizedStatus === "processing" || normalizedStatus === "") {
      // Payment not yet confirmed
      deposit.status = "awaiting_verification";
      deposit.statusHistory.push({
        status: "awaiting_verification",
        timestamp: new Date(),
        note: `GlobalPay status: ${gpResult.status || "pending"}. Payment not yet confirmed.`,
      });
      await deposit.save();

      return NextResponse.json({
        success: false,
        deposit: deposit.toObject(),
        message: "Payment not yet confirmed. Please complete the payment and try again in a moment.",
      });
    } else {
      // Payment failed or declined
      deposit.status = "payment_failed";
      deposit.statusHistory.push({
        status: "payment_failed",
        timestamp: new Date(),
        note: `GlobalPay returned: ${gpResult.status}`,
      });
      await deposit.save();

      return NextResponse.json({
        success: false,
        deposit: deposit.toObject(),
        message: `Payment was not successful (Status: ${gpResult.status}). Please try again with a new deposit.`,
      });
    }
  } catch (error) {
    console.error("Deposit verify error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
