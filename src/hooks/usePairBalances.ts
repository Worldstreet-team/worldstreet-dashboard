import { useState, useEffect, useCallback } from 'react';

/**
 * Hook return type
 */
interface UsePairBalancesReturn {
  tokenIn: number;
  tokenOut: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePairBalances(
  userId: string | undefined,
  selectedPair: string,
  chain?: string,
  tokenAddress?: string
): UsePairBalancesReturn {
  const [tokenIn, setTokenIn] = useState<number>(0);
  const [tokenOut, setTokenOut] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Parse the trading pair (e.g., SOL-USDC)
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    console.log('[usePairBalances] Refreshing balances for:', selectedPair, 'Chain:', chain);

    try {
      // For now, return mock balances since we're removing Drift
      // In a real implementation, this would fetch from Hyperliquid or other APIs
      setTokenIn(0);
      setTokenOut(0);
      setError(null);
    } catch (err) {
      console.error('[usePairBalances] Error fetching balances:', err);
      setError('Failed to fetch token balances');
    } finally {
      setLoading(false);
    }
  }, [selectedPair, chain, tokenAddress, baseAsset, quoteAsset]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleRefetch = async () => {
    await fetchBalances();
  };

  return {
    tokenIn,
    tokenOut,
    loading,
    error: error,
    refetch: handleRefetch,
  };
}