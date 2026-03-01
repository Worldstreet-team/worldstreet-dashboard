import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import { getAuthUser } from "@/lib/auth";
import { sendUsdtFromTreasury, sendEthUsdtFromTreasury } from "@/lib/treasury";

// ── Constants ──────────────────────────────────────────────────────────────

const GLOBALPAY_BASE =
  "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api";

const GLOBALPAY_API_KEY = process.env.NEXT_PUBLIC_GLOBALPAY_API_KEY || "";

// ── POST /api/deposit/verify ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await request.json();
    const { depositId } = body;

    if (!depositId) {
      return NextResponse.json(
        { success: false, message: "depositId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 3. Find deposit
    const deposit = await Deposit.findOne({
      _id: depositId,
      userId: authUser.userId,
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, message: "Deposit not found" },
        { status: 404 }
      );
    }

    // Only verify deposits in actionable states
    if (!["pending", "awaiting_verification", "payment_failed"].includes(deposit.status)) {
      return NextResponse.json({
        success: true,
        deposit: deposit.toObject(),
        message: `Deposit is already ${deposit.status}`,
      });
    }

    // 4. Update status to verifying
    deposit.status = "verifying";
    await deposit.save();

    // 5. Requery GlobalPay
    const transRef =
      deposit.globalPayTransactionReference ||
      deposit.merchantTransactionReference;

    const gpRes = await fetch(
      `${GLOBALPAY_BASE}/paymentgateway/query-single-transaction/${transRef}`,
      {
        method: "POST",
        headers: {
          apiKey: GLOBALPAY_API_KEY,
          "Content-Type": "application/json",
          language: "en",
        },
      }
    );

    const gpData = await gpRes.json();

    if (!gpData.isSuccessful) {
      deposit.status = "payment_failed";
      await deposit.save();
      return NextResponse.json({
        success: false,
        deposit: deposit.toObject(),
        message: "Could not verify payment with GlobalPay. Try again shortly.",
      });
    }

    const txStatus = (gpData.data?.transactionStatus || "").toLowerCase();

    // 6. Check if payment was successful
    if (txStatus === "successful" || txStatus === "completed" || txStatus === "approved") {
      deposit.status = "payment_confirmed";
      await deposit.save();

      // 7. Attempt auto-send USDT via correct chain
      deposit.status = "sending_usdt";
      await deposit.save();

      const destAddress = deposit.userWalletAddress || deposit.userSolanaAddress;
      const isEthereum = deposit.network === "ethereum";

      const result = isEthereum
        ? await sendEthUsdtFromTreasury(destAddress, deposit.usdtAmount)
        : await sendUsdtFromTreasury(destAddress, deposit.usdtAmount);

      if (result.success && result.txHash) {
        deposit.status = "completed";
        deposit.txHash = result.txHash;
        deposit.completedAt = new Date();
        await deposit.save();

        return NextResponse.json({
          success: true,
          deposit: deposit.toObject(),
          message: "Deposit completed! USDT sent to your wallet.",
        });
      } else {
        // Delivery failed but payment was confirmed
        deposit.status = "delivery_failed";
        deposit.deliveryError =
          result.error || "USDT transfer failed. Contact support.";
        await deposit.save();

        return NextResponse.json({
          success: false,
          deposit: deposit.toObject(),
          message:
            "Payment confirmed but USDT delivery failed. Our team will resolve this. Contact support if needed.",
        });
      }
    } else if (txStatus === "failed" || txStatus === "declined") {
      deposit.status = "payment_failed";
      await deposit.save();

      return NextResponse.json({
        success: false,
        deposit: deposit.toObject(),
        message: "Payment was not successful. Please try paying again.",
      });
    } else {
      // Still pending or unknown status
      deposit.status = "awaiting_verification";
      await deposit.save();

      return NextResponse.json({
        success: true,
        deposit: deposit.toObject(),
        message:
          "Payment is still being processed by GlobalPay. Please wait a moment and try again.",
      });
    }
  } catch (error) {
    console.error("POST /api/deposit/verify error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
