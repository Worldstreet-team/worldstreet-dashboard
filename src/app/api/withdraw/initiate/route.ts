import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Withdrawal from "@/models/Withdrawal";
import TreasuryWallet from "@/models/TreasuryWallet";

// ── POST: Initiate a new withdrawal ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";

    await connectDB();

    const body = await req.json();
    const { usdtAmount, chain, userWalletAddress, bankDetails } = body;

    // ── Validate inputs ────────────────────────────────────────────────
    if (!usdtAmount || !chain || !userWalletAddress || !bankDetails) {
      return NextResponse.json(
        { error: "usdtAmount, chain, userWalletAddress, and bankDetails are required" },
        { status: 400 }
      );
    }

    if (!["solana", "ethereum"].includes(chain)) {
      return NextResponse.json(
        { error: "chain must be 'solana' or 'ethereum'" },
        { status: 400 }
      );
    }

    if (usdtAmount < 1 || usdtAmount > 5000) {
      return NextResponse.json(
        { error: "Amount must be between 5 and 5000 USDT" },
        { status: 400 }
      );
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      return NextResponse.json(
        { error: "bankDetails must include bankName, accountNumber, and accountName" },
        { status: 400 }
      );
    }

    // ── Get exchange rate (CoinGecko + 5% markup) ──────────────────────
    let exchangeRate: number;
    try {
      const rateRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn",
        { next: { revalidate: 60 } }
      );
      const rateData = await rateRes.json();
      const baseRate = rateData?.tether?.ngn;
      if (!baseRate) throw new Error("Rate unavailable");
      // 5% markup (user gets less NGN per USDT on withdrawal)
      exchangeRate = baseRate * 0.95;
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch exchange rate. Please try again." },
        { status: 503 }
      );
    }

    const fiatAmount = Math.round(usdtAmount * exchangeRate * 100) / 100;

    // ── Get active treasury wallet for the chain ───────────────────────
    const treasuryWallet = await TreasuryWallet.findOne({
      isActive: true,
      network: chain,
    }).lean();

    if (!treasuryWallet) {
      return NextResponse.json(
        { error: `No active treasury wallet for ${chain}. Please contact support.` },
        { status: 503 }
      );
    }

    // ── Create withdrawal record ───────────────────────────────────────
    const withdrawal = await Withdrawal.create({
      userId,
      email,
      usdtAmount,
      fiatAmount,
      fiatCurrency: "NGN",
      exchangeRate,
      chain,
      userWalletAddress,
      treasuryWalletAddress: treasuryWallet.address,
      bankDetails,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal._id.toString(),
        usdtAmount: withdrawal.usdtAmount,
        fiatAmount: withdrawal.fiatAmount,
        exchangeRate: withdrawal.exchangeRate,
        chain: withdrawal.chain,
        treasuryWalletAddress: treasuryWallet.address,
        status: withdrawal.status,
      },
    });
  } catch (err) {
    console.error("Withdrawal initiate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
