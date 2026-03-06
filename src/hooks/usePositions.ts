import { useState, useEffect, useCallback } from 'react';

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  current_price: number;
  quantity: number;
  pnl: number;
  pnl_percentage: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  take_profit?: number;
  stop_loss?: number;
}

interface UsePositionsOptions {
  userId: string | null;
  status?: 'OPEN' | 'CLOSED';
  limit?: number;
  refreshInterval?: number;
}

export function usePositions({
  userId,
  status = 'OPEN',
  limit = 50,
  refreshInterval = 5000,
}: UsePositionsOptions) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!userId) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/positions/user?userId=${userId}&status=${status}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      setPositions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, status, limit]);

  useEffect(() => {
    fetchPositions();

    if (status === 'OPEN' && refreshInterval > 0) {
      const interval = setInterval(fetchPositions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPositions, status, refreshInterval]);

  return {
    positions,
    loading,
    error,
    refetch: fetchPositions,
  };
}
