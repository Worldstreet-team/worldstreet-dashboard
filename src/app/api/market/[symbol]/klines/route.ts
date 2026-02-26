import { NextRequest, NextResponse } from 'next/server';

// ─── Symbol → CoinGecko ID mapping ──────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
  DOGEUSDT: 'dogecoin',
  LINKUSDT: 'chainlink',
  ADAUSDT: 'cardano',
  DOTUSDT: 'polkadot',
  AVAXUSDT: 'avalanche-2',
  MATICUSDT: 'matic-network',
  LTCUSDT: 'litecoin',
  UNIUSDT: 'uniswap',
  XLMUSDT: 'stellar',
  ATOMUSDT: 'cosmos',
  NEARUSDT: 'near',
  APTUSDT: 'aptos',
  SUIUSDT: 'sui',
};

// Map interval to CoinGecko "days" parameter
// CoinGecko OHLC returns granularity based on days:
//   1-2 days → 30m candles, 3-30 days → 4h candles, 31+ → 4-day candles
const INTERVAL_TO_DAYS: Record<string, number> = {
  '1m': 1,    // 30m candles (closest CoinGecko offers for free)
  '5m': 1,
  '15m': 2,
  '1h': 7,
  '4h': 30,
  '1d': 180,
};

// In-memory cache: key → { data, ts }
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes — generous to avoid 429s

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || '1d';

    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!coinId) {
      return NextResponse.json(
        { error: `Unsupported symbol: ${symbol}` },
        { status: 400 }
      );
    }

    const days = INTERVAL_TO_DAYS[type] ?? 30;
    const cacheKey = `${coinId}-${days}`;

    // Return cached data if fresh
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    // If rate-limited (429), return stale cache if available, else error
    if (response.status === 429) {
      if (cached) {
        return NextResponse.json(cached.data);
      }
      return NextResponse.json(
        { error: 'Rate limited — please try again in a moment' },
        { status: 429 }
      );
    }

    if (!response.ok) {
      // Return stale cache on any upstream error
      if (cached) {
        return NextResponse.json(cached.data);
      }
      throw new Error(`CoinGecko OHLC returned ${response.status}`);
    }

    // CoinGecko returns: [[timestamp_ms, open, high, low, close], ...]
    const raw: number[][] = await response.json();

    // Transform to the format DataFeedService expects
    const data = raw.map(([time, open, high, low, close]) => ({
      time,            // milliseconds (DataFeedService divides by 1000)
      open: String(open),
      high: String(high),
      low: String(low),
      close: String(close),
      volume: '0',     // CoinGecko OHLC doesn't include volume
    }));

    const payload = { symbol, interval: type, data };

    // Cache the result
    cache.set(cacheKey, { data: payload, ts: Date.now() });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Klines API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch klines data' },
      { status: 500 }
    );
  }
}
