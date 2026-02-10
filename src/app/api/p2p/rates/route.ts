import { NextResponse } from "next/server";

// ── In-memory cache ────────────────────────────────────────────────────────

interface RateCache {
  usdtPriceUsd: number; // USDT price in USD (should be ~1)
  fiatRates: Record<string, number>; // 1 USD = X fiat
  fetchedAt: number;
}

let cache: RateCache | null = null;
const CACHE_TTL = 120_000; // 2 minutes

const PLATFORM_MARKUP = 5; // 5% markup

// Fiat currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

// ── Fetch exchange rates ───────────────────────────────────────────────────

async function fetchRates(): Promise<RateCache> {
  // Fetch USDT price from CoinGecko
  const geckoRes = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,ngn,gbp",
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!geckoRes.ok) {
    throw new Error(`CoinGecko returned ${geckoRes.status}`);
  }

  const geckoData = await geckoRes.json();

  // CoinGecko returns: { tether: { usd: 1.0, ngn: 1580, gbp: 0.79 } }
  const tether = geckoData.tether || {};

  return {
    usdtPriceUsd: tether.usd || 1,
    fiatRates: {
      NGN: tether.ngn || 1580,
      USD: tether.usd || 1,
      GBP: tether.gbp || 0.79,
    },
    fetchedAt: Date.now(),
  };
}

// ── GET handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();

  // Return cached if still valid
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return buildResponse(cache, true);
  }

  try {
    cache = await fetchRates();
    return buildResponse(cache, false);
  } catch (error) {
    console.error("P2P rate fetch error:", error);

    // Return stale cache if available
    if (cache) {
      return buildResponse(cache, true, true);
    }

    // Fallback rates
    return NextResponse.json(
      {
        rates: {},
        error: "Failed to fetch exchange rates",
      },
      { status: 502 }
    );
  }
}

function buildResponse(data: RateCache, cached: boolean, stale = false) {
  const rates: Record<
    string,
    { buyRate: number; sellRate: number; marketRate: number; symbol: string }
  > = {};

  for (const [currency, marketRate] of Object.entries(data.fiatRates)) {
    // Buy rate: user pays MORE fiat (market + markup)
    const buyRate = marketRate * (1 + PLATFORM_MARKUP / 100);
    // Sell rate: user receives LESS fiat (market - markup)
    const sellRate = marketRate * (1 - PLATFORM_MARKUP / 100);

    rates[currency] = {
      marketRate: Math.round(marketRate * 100) / 100,
      buyRate: Math.round(buyRate * 100) / 100,
      sellRate: Math.round(sellRate * 100) / 100,
      symbol: CURRENCY_SYMBOLS[currency] || currency,
    };
  }

  return NextResponse.json({
    rates,
    markup: PLATFORM_MARKUP,
    cached,
    stale,
    fetchedAt: data.fetchedAt,
  });
}
