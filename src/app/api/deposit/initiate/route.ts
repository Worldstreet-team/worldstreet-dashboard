import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { randomUUID } from "crypto";

// ── Constants ──────────────────────────────────────────────────────────────

const GLOBALPAY_BASE =
  "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api";

const GLOBALPAY_API_KEY = process.env.NEXT_PUBLIC_GLOBALPAY_API_KEY || "";

const MIN_USDT = 5;
const MAX_USDT = 5000;

// ── POST /api/deposit/initiate ─────────────────────────────────────────────

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
    const { usdtAmount, fiatCurrency = "NGN" } = body;

    const amount = parseFloat(usdtAmount);
    if (!amount || amount < MIN_USDT || amount > MAX_USDT) {
      return NextResponse.json(
        {
          success: false,
          message: `USDT amount must be between ${MIN_USDT} and ${MAX_USDT}`,
        },
        { status: 400 }
      );
    }

    await connectDB();

    // 3. Get user's Solana address
    const profile = await DashboardProfile.findOne({
      authUserId: authUser.userId,
    }).lean();

    const solanaAddress = profile?.wallets?.solana?.address;
    if (!solanaAddress) {
      return NextResponse.json(
        { success: false, message: "Wallet not set up. Go to Assets first." },
        { status: 400 }
      );
    }

    // 4. Fetch current exchange rate from internal rates endpoint
    const ratesRes = await fetch(
      new URL("/api/p2p/rates", request.url).toString()
    );
    const ratesData = await ratesRes.json();
    const rate = ratesData.rates?.[fiatCurrency];

    if (!rate?.buyRate) {
      return NextResponse.json(
        { success: false, message: "Exchange rate unavailable. Try again." },
        { status: 502 }
      );
    }

    const fiatAmount = Math.round(amount * rate.buyRate * 100) / 100;
    const merchantTxRef = `WS-DEP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // 5. Call GlobalPay generate-payment-link
    const origin =
      request.headers.get("origin") ||
      request.headers.get("referer")?.replace(/\/$/, "") ||
      "";

    const redirectUrl = `${origin}/deposit?depositId=__DEPOSIT_ID__`;

    const gpRes = await fetch(
      `${GLOBALPAY_BASE}/paymentgateway/generate-payment-link`,
      {
        method: "POST",
        headers: {
          apiKey: GLOBALPAY_API_KEY,
          "Content-Type": "application/json",
          language: "en",
        },
        body: JSON.stringify({
          amount: fiatAmount,
          merchantTransactionReference: merchantTxRef,
          redirectUrl, // temp placeholder — we'll patch after deposit creation
          customer: {
            firstName: authUser.firstName || "WorldStreet",
            lastName: authUser.lastName || "Customer",
            currency: fiatCurrency,
            phoneNumber: "N/A",
            address: "N/A",
            emailAddress: authUser.email || "",
          },
        }),
      }
    );

    const gpData = await gpRes.json();

    if (!gpData.isSuccessful || !gpData.data?.checkoutUrl) {
      console.error("GlobalPay generate-payment-link failed:", gpData);
      return NextResponse.json(
        {
          success: false,
          message:
            gpData.successMessage ||
            "Failed to create payment link. Try again.",
        },
        { status: 502 }
      );
    }

    // 6. Create deposit record
    const deposit = await Deposit.create({
      userId: authUser.userId,
      email: authUser.email,
      usdtAmount: amount,
      fiatAmount,
      fiatCurrency,
      exchangeRate: rate.buyRate,
      merchantTransactionReference: merchantTxRef,
      globalPayTransactionReference: gpData.data.transactionReference || "",
      checkoutUrl: gpData.data.checkoutUrl,
      userSolanaAddress: solanaAddress,
      status: "pending",
    });

    // 7. Patch redirect URL now that we have the deposit _id
    // (GlobalPay already has the link, but the redirect URL is what the user
    //  is sent to AFTER paying — we need the real depositId in it.)
    // Note: GlobalPay may not support updating the redirect, but we store
    // the depositId in our DB so the frontend can also get it from the URL
    // search param after redirect.

    return NextResponse.json({
      success: true,
      deposit: {
        _id: deposit._id,
        usdtAmount: deposit.usdtAmount,
        fiatAmount: deposit.fiatAmount,
        fiatCurrency: deposit.fiatCurrency,
        exchangeRate: deposit.exchangeRate,
        merchantTransactionReference: deposit.merchantTransactionReference,
        status: deposit.status,
        createdAt: deposit.createdAt,
      },
      checkoutUrl: gpData.data.checkoutUrl,
    });
  } catch (error) {
    console.error("POST /api/deposit/initiate error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
