import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';

export interface DriftPosition {
  marketIndex: number;
  direction: 'long' | 'short';
  baseAmount: number;
  quoteAmount: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface DriftOrder {
  orderId: number;
  marketIndex: number;
  direction: 'long' | 'short';
  orderType: 'limit' | 'market';
  baseAmount: number;
  price: number;
  filled: number;
  status: string;
}

export interface DriftAccountSummary {
  subaccountId: number;
  publicAddress: string;
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  openOrders: number;
}

export function useDriftTrading() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.userId || '';

  // Open position
  const openPosition = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    baseAmount: number,
    leverage: number = 1,
    orderType: 'market' | 'limit' = 'market',
    price?: number
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/position/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketIndex,
          direction,
          baseAmount,
          leverage,
          orderType,
          price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open position');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open position';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Close position
  const closePosition = useCallback(async (
    marketIndex: number,
    baseAmount?: number
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/position/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketIndex,
          baseAmount: baseAmount || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to close position');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close position';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Place limit order
  const placeLimitOrder = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    baseAmount: number,
    price: number,
    postOnly: boolean = false,
    reduceOnly: boolean = false
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/order/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketIndex,
          direction,
          baseAmount,
          price,
          postOnly,
          reduceOnly,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Cancel all orders
  const cancelAllOrders = useCallback(async (marketIndex?: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/order/cancel-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIndex: marketIndex || null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel orders');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel orders';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Deposit collateral
  const depositCollateral = useCallback(async (amount: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deposit collateral');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deposit collateral';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/drift/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to withdraw collateral');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch positions
  const fetchPositions = useCallback(async (): Promise<DriftPosition[]> => {
    if (!userId) return [];

    try {
      const response = await fetch('/api/drift/positions');
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      return data.positions || [];
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      return [];
    }
  }, [userId]);

  // Fetch orders
  const fetchOrders = useCallback(async (): Promise<DriftOrder[]> => {
    if (!userId) return [];

    try {
      const response = await fetch('/api/drift/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      return data.orders || [];
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      return [];
    }
  }, [userId]);

  // Fetch account summary
  const fetchAccountSummary = useCallback(async (): Promise<DriftAccountSummary | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/drift/account/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch account summary');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch account summary:', err);
      return null;
    }
  }, [userId]);

  return {
    loading,
    error,
    openPosition,
    closePosition,
    placeLimitOrder,
    cancelOrder,
    cancelAllOrders,
    depositCollateral,
    withdrawCollateral,
    fetchPositions,
    fetchOrders,
    fetchAccountSummary,
  };
}
