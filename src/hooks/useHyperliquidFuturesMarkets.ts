import { useState, useEffect, useCallback } from 'react';

interface FuturesMarket {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  assetIndex: number;
  szDecimals: number;
  maxLeverage: number | null;
  isolatedOnly: boolean;
}

interface UseHyperliquidFuturesMarketsResult {
  markets: FuturesMarket[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseHyperliquidFuturesMarketsOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export function useHyperliquidFuturesMarkets(
  options: UseHyperliquidFuturesMarketsOptions = {}
): UseHyperliquidFuturesMarketsResult {
  const { enabled = true, refreshInterval = 180000 } = options; // 3 minutes default

  const [markets, setMarkets] = useState<FuturesMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/hyperliquid/futures/markets');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch futures markets');
      }

      setMarkets(data.data.markets);
    } catch (err: any) {
      console.error('Failed to fetch futures markets:', err);
      setError(err.message || 'Failed to fetch futures markets');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMarkets();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchMarkets, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMarkets, refreshInterval]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets
  };
}