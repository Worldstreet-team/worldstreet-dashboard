import { NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

export interface PricesResponse {
  prices: Record<string, number>;
  coins: CoinData[];
  globalStats: {
    totalMarketCap: number;
    totalVolume: number;
    btcDominance: number;
    marketCapChange24h: number;
  };
  cached: boolean;
  stale?: boolean;
  fetchedAt: number;
  error?: string;
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedData: Omit<PricesResponse, 'cached' | 'stale'> | null = null;
let lastFetchedAt = 0;
let backoffUntil = 0; // timestamp — don't hit CoinGecko before this
const CACHE_TTL = 5 * 60_000; // 5 minutes (free tier allows ~10-30 req/min)
const BACKOFF_MS = 90_000;    // 90 s cooldown after a 429

// ── CoinGecko mapping ──────────────────────────────────────────────────────

// Core coins we always need for wallet balance calculations
const CORE_COINS = ["bitcoin", "ethereum", "solana", "tron", "toncoin", "tether", "usd-coin"];

// Additional popular coins for watchlist/market overview
const MARKET_COINS = [
  "ripple", "cardano", "dogecoin", "polkadot", "chainlink",
  "avalanche-2", "polygon-matic-token", "litecoin", "uniswap",
  "stellar", "cosmos", "near", "aptos", "sui"
];

const ALL_COIN_IDS = [...CORE_COINS, ...MARKET_COINS];

// Symbol mapping (CoinGecko ID → display symbol)
const ID_TO_SYMBOL: Record<string, string> = {
  "bitcoin": "BTC",
  "ethereum": "ETH",
  "solana": "SOL",
  "tron": "TRX",
  "ton": "TON",
  "tether": "USDT",
  "usd-coin": "USDC",
  "ripple": "XRP",
  "cardano": "ADA",
  "dogecoin": "DOGE",
  "polkadot": "DOT",
  "chainlink": "LINK",
  "avalanche-2": "AVAX",
  "polygon-matic-token": "MATIC",
  "litecoin": "LTC",
  "uniswap": "UNI",
  "stellar": "XLM",
  "cosmos": "ATOM",
  "near": "NEAR",
  "aptos": "APT",
  "sui": "SUI",
};

const FALLBACK_PRICES: Record<string, number> = {
  USDT: 1,
  USDC: 1,
};

// ── Fetch functions ────────────────────────────────────────────────────────

async function fetchMarketData(): Promise<Omit<PricesResponse, 'cached' | 'stale'>> {
  // Fetch main market data
  const coinsUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_COIN_IDS.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
  
  const coinsRes = await fetch(coinsUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (coinsRes.status === 429) {
    backoffUntil = Date.now() + BACKOFF_MS;
    throw new Error("CoinGecko rate limited (429)");
  }

  if (!coinsRes.ok) {
    throw new Error(`CoinGecko coins returned ${coinsRes.status}`);
  }

  const coinsData = await coinsRes.json();
  const prices: Record<string, number> = {};
  const coins: CoinData[] = [];

  for (const coin of coinsData) {
    const symbol = ID_TO_SYMBOL[coin.id] || coin.symbol.toUpperCase();
    prices[symbol] = coin.current_price ?? FALLBACK_PRICES[symbol] ?? 0;

    coins.push({
      id: coin.id,
      symbol,
      name: coin.name,
      price: coin.current_price ?? 0,
      change24h: coin.price_change_percentage_24h ?? 0,
      marketCap: coin.market_cap ?? 0,
      volume24h: coin.total_volume ?? 0,
      image: coin.image ?? "",
    });
  }

  // --- Manual TON fetch ---
  if (!coinsData.find((c: any) => c.id === 'toncoin')) {
    // --- Manual TON fetch via CryptoCompare ---
    try {
      const tonRes = await fetch(
        "https://min-api.cryptocompare.com/data/price?fsym=TON&tsyms=USD",
        { signal: AbortSignal.timeout(10_000) }
      );

      if (tonRes.ok) {
        const tonData = await tonRes.json();
        const tonPrice = tonData.USD ?? 0;

        prices["TON"] = tonPrice;

        // Push TON to coins array if not already there
        if (!coins.find(c => c.id === "toncoin")) {
          coins.push({
            id: "toncoin",
            symbol: "TON",
            name: "Toncoin",
            price: tonPrice,
            change24h: 0,      // CryptoCompare free API does not return 24h % by default
            marketCap: 0,      // You can add another endpoint if you want market cap
            volume24h: 0,      // You can add another endpoint if you want volume
            image: "",         // Optional: add an image URL if you have one
          });
        }
      } else {
        prices["TON"] = 0;
      }
    } catch (e) {
      console.error("Failed to fetch TON from CryptoCompare:", e);
      prices["TON"] = 0;
    }
  }

  // Ensure stablecoins fallback
  if (!prices.USDT) prices.USDT = 1;
  if (!prices.USDC) prices.USDC = 1;

  // Fetch global market stats
  let globalStats = {
    totalMarketCap: 0,
    totalVolume: 0,
    btcDominance: 0,
    marketCapChange24h: 0,
  };

  try {
    const globalRes = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (globalRes.ok) {
      const globalData = await globalRes.json();
      globalStats = {
        totalMarketCap: globalData.data?.total_market_cap?.usd ?? 0,
        totalVolume: globalData.data?.total_volume?.usd ?? 0,
        btcDominance: globalData.data?.market_cap_percentage?.btc ?? 0,
        marketCapChange24h: globalData.data?.market_cap_change_percentage_24h_usd ?? 0,
      };
    }
  } catch (e) {
    console.error("Failed to fetch global stats:", e);
  }

  return {
    prices,
    coins,
    globalStats,
    fetchedAt: Date.now(),
  };
}

// ── API Route ──────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && now - lastFetchedAt < CACHE_TTL) {
    return NextResponse.json({
      ...cachedData,
      cached: true,
    });
  }

  // If we're in a backoff window after a 429, return stale cache immediately
  if (now < backoffUntil && cachedData) {
    return NextResponse.json({
      ...cachedData,
      cached: true,
      stale: true,
    });
  }

  try {
    const data = await fetchMarketData();
    cachedData = data;
    lastFetchedAt = now;

    return NextResponse.json({
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error("Price fetch error:", error);

    // If we have stale cache, return it rather than failing
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        stale: true,
      });
    }

    // No cache at all — return fallback
    return NextResponse.json(
      {
        prices: {
          SOL: 0,
          ETH: 0,
          BTC: 0,
          ...FALLBACK_PRICES,
        },
        coins: [],
        globalStats: {
          totalMarketCap: 0,
          totalVolume: 0,
          btcDominance: 0,
          marketCapChange24h: 0,
        },
        cached: false,
        fetchedAt: now,
        error: "Failed to fetch prices",
      },
      { status: 502 }
    );
  }
}
