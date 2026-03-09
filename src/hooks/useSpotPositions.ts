/**
 * Spot Positions Hook
 * Fetches and manages spot trading positions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';

export interface SpotPosition {
  _id: string;
  userId: string;
  pair: string;
  chainId: number;
  baseTokenAddress: string;
  baseTokenSymbol: string;
  quoteTokenAddress: string;
  quoteTokenSymbol: string;
  totalAmount: string;
  averageEntryPrice: string;
  totalCost: string;
  realizedPnl: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  updatedAt: string;
}

export function useSpotPositions(pair?: string, status: 'OPEN' | 'CLOSED' = 'OPEN') {
  const { user } = useAuth();
  const [positions, setPositions] = useState<SpotPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ status });
      if (pair) {
        params.append('pair', pair);
      }

      const response = await fetch(`/api/spot/positions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      setPositions(data.positions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
      console.error('[useSpotPositions] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, pair, status]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const updateTPSL = useCallback(async (
    positionId: string,
    takeProfitPrice?: string,
    stopLossPrice?: string
  ) => {
    try {
      const response = await fetch('/api/spot/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId,
          takeProfitPrice,
          stopLossPrice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update TP/SL');
      }

      await fetchPositions();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update TP/SL',
      };
    }
  }, [fetchPositions]);

  const closePosition = useCallback(async (positionId: string) => {
    try {
      const response = await fetch(`/api/spot/positions/${positionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to close position');
      }

      await fetchPositions();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to close position',
      };
    }
  }, [fetchPositions]);

  return {
    positions,
    loading,
    error,
    refetch: fetchPositions,
    updateTPSL,
    closePosition,
  };
}
