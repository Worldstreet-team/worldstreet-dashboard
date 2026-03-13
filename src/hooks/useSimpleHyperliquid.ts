import { useState, useEffect, useCallback } from 'react';
import { hyperliquid } from '@/lib/hyperliquid/simple';

interface UseSimpleHyperliquidOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

export function useSimpleHyperliquid(options: UseSimpleHyperliquidOptions = {}) {
  const {
    refreshInterval = 180000, // 3 minutes default
    enabled = true
  } = options;

  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);
      
      const marketData = await hyperliquid.getMarkets();
      setMarkets(marketData);
    } catch (err: any) {
      console.error('Failed to fetch Hyperliquid markets:', err);
      setError(err.message || 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Periodic refresh
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchMarkets, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarkets, refreshInterval, enabled]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets
  };
}

export function useHyperliquidOrderbook(symbol: string, enabled = true) {
  const [orderbook, setOrderbook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderbook = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await hyperliquid.getOrderBook(symbol);
      setOrderbook(data);
    } catch (err: any) {
      console.error('Failed to fetch orderbook:', err);
      setError(err.message || 'Failed to fetch orderbook');
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled]);

  useEffect(() => {
    fetchOrderbook();
    
    // Refresh orderbook every 2 seconds
    const interval = setInterval(fetchOrderbook, 2000);
    return () => clearInterval(interval);
  }, [fetchOrderbook]);

  return {
    orderbook,
    loading,
    error,
    refetch: fetchOrderbook
  };
}

export function useHyperliquidTrades(symbol: string, enabled = true) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await hyperliquid.getRecentTrades(symbol);
      setTrades(data);
    } catch (err: any) {
      console.error('Failed to fetch trades:', err);
      setError(err.message || 'Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled]);

  useEffect(() => {
    fetchTrades();
    
    // Refresh trades every 5 seconds
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return {
    trades,
    loading,
    error,
    refetch: fetchTrades
  };
}