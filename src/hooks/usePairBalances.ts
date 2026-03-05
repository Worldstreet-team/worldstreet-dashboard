import { useState, useEffect, useCallback } from 'react';

/**
 * Balance data for a single asset
 */
interface AssetBalance {
  asset: string;
  chain: string;
  available_balance: string;
  locked_balance: string;
  total_balance: string;
}

/**
 * API response structure
 */
interface BalancesResponse {
  balances?: AssetBalance[];
}

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

/**
 * Custom hook to fetch and manage balances for a trading pair
 * 
 * @param userId - User ID to fetch balances for
 * @param selectedPair - Trading pair in format "BTC-USDT"
 * @param chain - Blockchain network (e.g., "ethereum", "solana", "bitcoin")
 * @returns Object containing tokenIn balance, tokenOut balance, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { tokenIn, tokenOut, loading, refetch } = usePairBalances(
 *   user?.userId,
 *   'BTC-USDT',
 *   'ethereum'
 * );
 * ```
 */
export function usePairBalances(
  userId: string | undefined,
  selectedPair: string,
  chain?: string
): UsePairBalancesReturn {
  const [tokenIn, setTokenIn] = useState<number>(0);
  const [tokenOut, setTokenOut] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parse the trading pair
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  /**
   * Fetch balances from the API
   */
  const fetchBalances = useCallback(async () => {
    // Reset if no user
    if (!userId) {
      console.log('[usePairBalances] No userId, resetting balances');
      setTokenIn(0);
      setTokenOut(0);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('[usePairBalances] Fetching balances:', { userId, baseAsset, quoteAsset, chain });
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        assets: `${baseAsset},${quoteAsset}`,
      });

      if (chain) {
        params.append('chain', chain);
      }

      const url = `/api/users/${userId}/balances?${params.toString()}`;
      console.log('[usePairBalances] Fetching from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch balances: ${response.statusText}`);
      }

      const data: BalancesResponse = await response.json();
      console.log('[usePairBalances] API Response:', data);

      const balances = Array.isArray(data) ? data : data.balances || [];
      console.log('[usePairBalances] Parsed balances:', balances);

      // Find balance for base asset (tokenIn - what you're selling/trading)
      const baseBalance = balances.find(
        (b: AssetBalance) => b.asset.toUpperCase() === baseAsset.toUpperCase()
      );
      const tokenInValue = baseBalance ? parseFloat(baseBalance.available_balance) : 0;
      console.log('[usePairBalances] Base asset balance:', { baseAsset, balance: baseBalance, value: tokenInValue });
      setTokenIn(tokenInValue);

      // Find balance for quote asset (tokenOut - what you're buying with)
      const quoteBalance = balances.find(
        (b: AssetBalance) => b.asset.toUpperCase() === quoteAsset.toUpperCase()
      );
      const tokenOutValue = quoteBalance ? parseFloat(quoteBalance.available_balance) : 0;
      console.log('[usePairBalances] Quote asset balance:', { quoteAsset, balance: quoteBalance, value: tokenOutValue });
      setTokenOut(tokenOutValue);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(errorMessage);
      console.error('[usePairBalances] Error:', err);
      
      // Set to 0 on error (no dummy data)
      setTokenIn(0);
      setTokenOut(0);
    } finally {
      setLoading(false);
    }
  }, [userId, baseAsset, quoteAsset, chain]);

  // Fetch balances when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    tokenIn,
    tokenOut,
    loading,
    error,
    refetch: fetchBalances,
  };
}
