import { useState, useCallback } from 'react';

export interface Trade {
  id: string;
  user_id: string;
  chain: string;
  token_in: string;
  token_out: string;
  side: 'BUY' | 'SELL';
  entry_price: string;
  exit_price: string | null;
  amount_in: string;
  amount_out_expected: string;
  amount_out_actual: string | null;
  pnl_realized: string | null;
  pnl_percentage: string | null;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at: string | null;
}

export interface OpenTradeParams {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  side: 'BUY' | 'SELL';
  slippage?: number;
}

export interface CloseTradeParams {
  tradeId: string;
  slippage?: number;
}

export function useOpenTrade() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTrade = useCallback(async (params: OpenTradeParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/trade/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to open trade');
      }

      return data.trade as Trade;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { openTrade, loading, error };
}

export function useCloseTrade() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeTrade = useCallback(async (params: CloseTradeParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to close trade');
      }

      return data.trade as Trade;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { closeTrade, loading, error };
}

export function useFetchTrades() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpenTrades = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/trades/open');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch open trades');
      }

      return data as Trade[];
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClosedTrades = useCallback(async (limit = 50) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trades/closed?limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch closed trades');
      }

      return data as Trade[];
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrade = useCallback(async (tradeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trade/${tradeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trade');
      }

      return data as Trade;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchOpenTrades, fetchClosedTrades, fetchTrade, loading, error };
}
