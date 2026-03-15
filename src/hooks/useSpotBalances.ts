import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing spot trading balances
 * 
 * This hook provides balance information for spot trading pairs.
 * It fetches balances from our API endpoints and provides real-time updates.
 * 
 * @param baseAsset - The base asset symbol (e.g., 'BTC')
 * @param quoteAsset - The quote asset symbol (e.g., 'USDT')
 * @returns Balance information and utility functions
 */

export interface UseSpotBalancesReturn {
  baseBalance: number;
  quoteBalance: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSpotBalances(
  baseAsset: string,
  quoteAsset: string
 ): UseSpotBalancesReturn {
  const [baseBalance, setBaseBalance] = useState<number>(0);
  const [quoteBalance, setQuoteBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/hyperliquid/balance');
      const data = await response.json();

      if (data.success) {
        if (data.data.balances) {
          const balances = data.data.balances;
          
          // Find base asset balance from spot balances
          const base = balances.find((b: any) => b.coin === baseAsset);
          setBaseBalance(base ? base.available : 0);
          
          // Quote balance = Spot USDC (from spotClearinghouseState), NOT Perps accountValue.
          // HL spot orders deduct from Spot USDC, not Perps equity.
          const quoteSpot = balances.find((b: any) => b.coin === 'USDC' || (quoteAsset !== 'USD' && b.coin === quoteAsset));
          setQuoteBalance(quoteSpot ? quoteSpot.available : 0);
        } else {
          setBaseBalance(0);
          setQuoteBalance(0);
        }
      } else {
        setBaseBalance(0);
        setQuoteBalance(0);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [baseAsset, quoteAsset]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10_000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    baseBalance,
    quoteBalance,
    loading,
    error,
    refetch: fetchBalances,
  };
}