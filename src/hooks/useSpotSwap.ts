/**
 * Spot Swap Hook - REWORKED to use ONLY Drift SDK.
 */

import { useState, useCallback } from 'react';
import { useDrift } from '@/app/context/driftContext';

export interface SpotSwapParams {
  pair: string;       // e.g. "SOL-USDC"
  side: 'buy' | 'sell';
  amount: string;     // Human-readable amount
  slippage?: number;
}

export interface SpotSwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useSpotSwap() {
  const { placeSpotOrder, getSpotMarketIndexBySymbol, refreshPositions } = useDrift();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSpotSwap = useCallback(async (
    params: SpotSwapParams
  ): Promise<SpotSwapResult> => {
    setError(null);
    setLoading(true);

    try {
      const [baseAsset] = params.pair.split('-');
      const marketIndex = getSpotMarketIndexBySymbol(baseAsset);

      if (marketIndex === undefined) {
        throw new Error(`Market not found on Drift for: ${baseAsset}`);
      }

      const amountNum = parseFloat(params.amount);
      const result = await placeSpotOrder(
        marketIndex,
        params.side === 'buy' ? 'buy' : 'sell',
        amountNum
      );

      if (!result.success) {
        throw new Error(result.error || 'Drift spot order failed');
      }

      await refreshPositions();
      return { success: true, txHash: result.txSignature };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [placeSpotOrder, getSpotMarketIndexBySymbol, refreshPositions]);

  return {
    executeSpotSwap,
    loading,
    error,
  };
}
