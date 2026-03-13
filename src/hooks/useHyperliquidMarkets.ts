import { useState, useEffect, useCallback } from 'react';

export interface HyperliquidMarket {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  chain: 'ethereum';
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

interface UseHyperliquidMarketsOptions {
  includeStats?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseHyperliquidMarketsReturn {
  markets: HyperliquidMarket[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useHyperliquidMarkets(
  options: UseHyperliquidMarketsOptions = {}
): UseHyperliquidMarketsReturn {
  const {
    includeStats = false,
    refreshInterval = 10000, // 10 seconds
    enabled = true
  } = options;

  const [markets, setMarkets] = useState<HyperliquidMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!enabled) return;

    try {
      setError(null);
      
      const params = new URLSearchParams();
      if (includeStats) {
        params.set('stats', 'true');
      }

      const response = await fetch(`/api/hyperliquid/markets?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch markets');
      }

      setMarkets(data.data.markets);
      setLastUpdated(new Date());
      console.log('[useHyperliquidMarkets] Fetched', data.data.markets.length, 'markets');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Hyperliquid markets';
      console.error('[useHyperliquidMarkets] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [enabled, includeStats]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchMarkets();
    }
  }, [fetchMarkets, enabled]);

  // Set up refresh interval
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchMarkets, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarkets, refreshInterval, enabled]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets,
    lastUpdated
  };
}