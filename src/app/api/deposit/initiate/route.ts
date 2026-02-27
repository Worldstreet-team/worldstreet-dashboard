import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DepositTransaction from "@/models/DepositTransaction";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

// ── Constants ──────────────────────────────────────────────────────────────

const MIN_USDT = 5;
const MAX_USDT = 5000;
const PLATFORM_MARKUP = 5; // 5%

// ── Helper: Fetch rates (same logic as /api/p2p/rates) ─────────────────────

interface CachedRates {
  fiatRates: Record<string, number>;
  fetchedAt: number;
}

let rateCache: CachedRates | null = null;
const RATE_CACHE_TTL = 120_000; // 2 minutes

async function getExchangeRate(currency: string): Promise<number | null> {
  const now = Date.now();

  if (!rateCache || now - rateCache.fetchedAt > RATE_CACHE_TTL) {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,ngn,gbp",
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
      const data = await res.json();
      const tether = data.tether || {};
      rateCache = {
        fiatRates: { NGN: tether.ngn || 1580, USD: tether.usd || 1, GBP: tether.gbp || 0.79 },
        fetchedAt: now,
      };
    } catch (error) {
      console.error("Rate fetch error:", error);
      if (rateCache) return rateCache.fiatRates[currency] ?? null;
      return null;
    }
  }

  const marketRate = rateCache.fiatRates[currency];
  if (!marketRate) return null;

  // Apply platform markup (user pays more)
  return Math.round(marketRate * (1 + PLATFORM_MARKUP / 100) * 100) / 100;
}

// ── POST: Create a new deposit order ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { usdtAmount, fiatCurrency = "NGN" } = body;

    // ── Validation ───────────────────────────────────────────────────────

    if (!usdtAmount || usdtAmount < MIN_USDT || usdtAmount > MAX_USDT) {
      return NextResponse.json(
        { success: false, message: `USDT amount must be between ${MIN_USDT} and ${MAX_USDT}` },
        { status: 400 }
      );
    }

    if (!["NGN", "USD", "GBP"].includes(fiatCurrency)) {
      return NextResponse.json(
        { success: false, message: "Invalid fiat currency" },
        { status: 400 }
      );
    }

    // ── Get user's Solana wallet ─────────────────────────────────────────

    const profile = await DashboardProfile.findOne({ authUserId: authUser.userId });
    if (!profile?.walletsGenerated || !profile?.wallets?.solana?.address) {
      return NextResponse.json(
        { success: false, message: "Wallet not set up. Please create a wallet first." },
        { status: 400 }
      );
    }

    // ── Check for existing active deposits ───────────────────────────────

    const activeDeposit = await DepositTransaction.findOne({
      authUserId: authUser.userId,
      status: { $in: ["pending", "awaiting_verification", "verifying", "payment_confirmed", "sending_usdt"] },
    });

    if (activeDeposit) {
      return NextResponse.json(
        { success: false, message: "You already have an active deposit. Please complete or cancel it first." },
        { status: 400 }
      );
    }

    // ── Fetch exchange rate ──────────────────────────────────────────────

    const buyRate = await getExchangeRate(fiatCurrency);
    if (!buyRate) {
      return NextResponse.json(
        { success: false, message: "Unable to fetch exchange rates. Please try again." },
        { status: 502 }
      );
    }

    const fiatAmount = Math.round(usdtAmount * buyRate * 100) / 100;

    // ── Generate unique merchant reference ───────────────────────────────

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const merchantTransactionReference = `WS-DEP-${timestamp}-${random}`.toUpperCase();

    // ── Create deposit record ────────────────────────────────────────────

    const deposit = await DepositTransaction.create({
      authUserId: authUser.userId,
      email: authUser.email,
      usdtAmount,
      fiatAmount,
      fiatCurrency,
      exchangeRate: buyRate,
      platformMarkup: PLATFORM_MARKUP,
      userSolanaAddress: profile.wallets.solana.address,
      merchantTransactionReference,
      status: "pending",
      statusHistory: [
        { status: "pending", timestamp: new Date(), note: "Deposit order created" },
      ],
    });

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
    });
  } catch (error) {
    console.error("Deposit initiate error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
