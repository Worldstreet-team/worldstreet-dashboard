import { NextResponse } from "next/server";

// In-memory cache
let cachedPrices: Record<string, number> | null = null;
let lastFetchedAt = 0;
const CACHE_TTL = 60_000; // 60 seconds

// CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  SOL: "solana",
  ETH: "ethereum",
  BTC: "bitcoin",
  USDT: "tether",
  USDC: "usd-coin",
};

const FALLBACK_PRICES: Record<string, number> = {
  USDT: 1,
  USDC: 1,
};

async function fetchPricesFromCoinGecko(): Promise<Record<string, number>> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`CoinGecko returned ${res.status}`);
  }

  const data = await res.json();

  const prices: Record<string, number> = {};
  for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
    prices[symbol] = data[geckoId]?.usd ?? FALLBACK_PRICES[symbol] ?? 0;
  }

  return prices;
}

export async function GET() {
  const now = Date.now();

  // Return cached prices if still valid
  if (cachedPrices && now - lastFetchedAt < CACHE_TTL) {
    return NextResponse.json({
      prices: cachedPrices,
      cached: true,
      fetchedAt: lastFetchedAt,
    });
  }

  try {
    const prices = await fetchPricesFromCoinGecko();
    cachedPrices = prices;
    lastFetchedAt = now;

    return NextResponse.json({
      prices,
      cached: false,
      fetchedAt: lastFetchedAt,
    });
  } catch (error) {
    console.error("Price fetch error:", error);

    // If we have stale cache, return it rather than failing
    if (cachedPrices) {
      return NextResponse.json({
        prices: cachedPrices,
        cached: true,
        stale: true,
        fetchedAt: lastFetchedAt,
      });
    }

    // No cache at all — return fallback zeros
    return NextResponse.json(
      {
        prices: {
          SOL: 0,
          ETH: 0,
          BTC: 0,
          ...FALLBACK_PRICES,
        },
        cached: false,
        error: "Failed to fetch prices",
      },
      { status: 502 }
    );
  }
}
