import { useState, useEffect, useCallback, useRef } from 'react';
import { useDrift } from '@/app/context/driftContext';

/**
 * Hook to fetch spot market balances from Drift Protocol
 * 
 * Core Concept:
 * - Drift stores balances per token spot market, NOT as pairs
 * - Each token has its own spot market index
 * - Use driftClient.getTokenAmount(marketIndex) to get balances
 * - Positive values = deposited tokens
 * - Negative values = borrowed tokens
 */

interface UseSpotBalancesReturn {
  baseBalance: number;
  quoteBalance: number;
  baseBalanceBN: any | null;
  quoteBalanceBN: any | null;
  isBorrowed: {
    base: boolean;
    quote: boolean;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch balances for a spot trading pair from Drift
 * 
 * @param baseMarketIndex - Drift spot market index for base token (e.g., SOL = 1)
 * @param quoteMarketIndex - Drift spot market index for quote token (e.g., USDC = 0)
 * @returns Balances for both tokens
 */
export function useSpotBalances(
  baseMarketIndex: number | undefined,
  quoteMarketIndex: number | undefined
): UseSpotBalancesReturn {
  const {
    spotPositions,
    isClientReady,
    refreshPositions,
    getSpotMarketName,
  } = useDrift();

  const [baseBalance, setBaseBalance] = useState<number>(0);
  const [quoteBalance, setQuoteBalance] = useState<number>(0);
  const [baseBalanceBN, setBaseBalanceBN] = useState<any | null>(null);
  const [quoteBalanceBN, setQuoteBalanceBN] = useState<any | null>(null);
  const [isBorrowed, setIsBorrowed] = useState({ base: false, quote: false });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!isClientReady || baseMarketIndex === undefined || quoteMarketIndex === undefined) {
      setBaseBalance(0);
      setQuoteBalance(0);
      setBaseBalanceBN(null);
      setQuoteBalanceBN(null);
      setIsBorrowed({ base: false, quote: false });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find balances from spotPositions (which are populated by DriftContext)
      let baseAmount = 0;
      let quoteAmount = 0;
      let baseBorrowed = false;
      let quoteBorrowed = false;

      if (spotPositions && spotPositions.length > 0) {
        // Find base token balance
        const basePosition = spotPositions.find(p => p.marketIndex === baseMarketIndex);
        if (basePosition) {
          baseAmount = basePosition.amount;
          baseBorrowed = basePosition.balanceType === 'borrow';
          console.log(`[useSpotBalances] Base (${getSpotMarketName(baseMarketIndex)}):`, baseAmount, baseBorrowed ? '(borrowed)' : '(deposited)');
        }

        // Find quote token balance
        const quotePosition = spotPositions.find(p => p.marketIndex === quoteMarketIndex);
        if (quotePosition) {
          quoteAmount = quotePosition.amount;
          quoteBorrowed = quotePosition.balanceType === 'borrow';
          console.log(`[useSpotBalances] Quote (${getSpotMarketName(quoteMarketIndex)}):`, quoteAmount, quoteBorrowed ? '(borrowed)' : '(deposited)');
        }
      }

      // Update state
      setBaseBalance(Math.abs(baseAmount)); // Always show positive for UI
      setQuoteBalance(Math.abs(quoteAmount));
      setIsBorrowed({ base: baseBorrowed, quote: quoteBorrowed });

      // Store raw BN values if needed (for precision in calculations)
      // Note: spotPositions already has converted amounts, so we don't have BN here
      // If you need BN, you'd need to access driftClient directly
      setBaseBalanceBN(null);
      setQuoteBalanceBN(null);

    } catch (err) {
      console.error('[useSpotBalances] Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      setBaseBalance(0);
      setQuoteBalance(0);
    } finally {
      setLoading(false);
    }
  }, [isClientReady, baseMarketIndex, quoteMarketIndex, spotPositions, getSpotMarketName]);

  // Fetch balances when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Refetch function
  const handleRefetch = useCallback(async () => {
    await refreshPositions();
    await fetchBalances();
  }, [refreshPositions, fetchBalances]);

  return {
    baseBalance,
    quoteBalance,
    baseBalanceBN,
    quoteBalanceBN,
    isBorrowed,
    loading,
    error,
    refetch: handleRefetch,
  };
}
