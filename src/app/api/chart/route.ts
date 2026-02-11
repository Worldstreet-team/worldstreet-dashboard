import { NextRequest, NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

interface ChartResponse {
  data: ChartDataPoint[];
  high: number;
  low: number;
  volume: string;
  currentPrice: number;
  change: number;
  cached: boolean;
  error?: string;
}

// ── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: ChartResponse;
  fetchedAt: number;
}

const chartCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60 seconds

// ── CoinGecko ID mapping ──────────────────────────────────────────────────

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  LTC: "litecoin",
};

// ── Timeframe to CoinGecko days mapping ───────────────────────────────────

const TIMEFRAME_TO_DAYS: Record<string, string> = {
  "1H": "0.05",   // ~1 hour of data
  "4H": "0.17",   // ~4 hours of data
  "1D": "1",
  "1W": "7",
  "1M": "30",
};

// ── Helper: format volume ──────────────────────────────────────────────────

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toFixed(0);
}

// ── API Route ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();
  const timeframe = searchParams.get("timeframe") || "1D";

  const coinId = SYMBOL_TO_COINGECKO_ID[symbol];
  if (!coinId) {
    return NextResponse.json(
      { error: `Unsupported symbol: ${symbol}` },
      { status: 400 }
    );
  }

  const days = TIMEFRAME_TO_DAYS[timeframe] || "1";
  const cacheKey = `${coinId}-${days}`;

  // Check cache
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    // Fetch price chart data from CoinGecko
    const chartUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const chartRes = await fetch(chartUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!chartRes.ok) {
      throw new Error(`CoinGecko chart returned ${chartRes.status}`);
    }

    const chartJson = await chartRes.json();

    // Parse price data points
    const prices: ChartDataPoint[] = (chartJson.prices || []).map(
      ([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      })
    );

    if (prices.length === 0) {
      throw new Error("No price data returned");
    }

    // Calculate stats
    const priceValues = prices.map((p) => p.price);
    const high = Math.max(...priceValues);
    const low = Math.min(...priceValues);
    const currentPrice = priceValues[priceValues.length - 1];
    const firstPrice = priceValues[0];
    const change = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

    // Get total volume from the last entry
    const volumes: number[] = (chartJson.total_volumes || []).map(
      ([, vol]: [number, number]) => vol
    );
    const totalVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;

    const responseData: ChartResponse = {
      data: prices,
      high,
      low,
      volume: formatVolume(totalVolume),
      currentPrice,
      change,
      cached: false,
    };

    // Update cache
    chartCache.set(cacheKey, { data: responseData, fetchedAt: Date.now() });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Chart fetch error:", error);

    // Return stale cache if available
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      {
        data: [],
        high: 0,
        low: 0,
        volume: "0",
        currentPrice: 0,
        change: 0,
        cached: false,
        error: "Failed to fetch chart data",
      } as ChartResponse,
      { status: 502 }
    );
  }
}
