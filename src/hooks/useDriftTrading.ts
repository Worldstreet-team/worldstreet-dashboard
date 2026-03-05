import { useCallback } from 'react';
import { useDrift } from '@/app/context/driftContext';

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
  const drift = useDrift();

  // Open position - use client-side implementation
  const openPosition = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    baseAmount: number,
    leverage: number = 1,
    orderType: 'market' | 'limit' = 'market',
    price?: number
  ) => {
    const result = await drift.openPosition(marketIndex, direction, baseAmount, leverage);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to open position');
    }
    
    return result;
  }, [drift]);

  // Close position - use client-side implementation
  const closePosition = useCallback(async (
    marketIndex: number,
    baseAmount?: number
  ) => {
    const result = await drift.closePosition(marketIndex);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to close position');
    }
    
    return result;
  }, [drift]);

  // Place limit order - not yet implemented in client-side
  const placeLimitOrder = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    baseAmount: number,
    price: number,
    postOnly: boolean = false,
    reduceOnly: boolean = false
  ) => {
    throw new Error('Limit orders not yet implemented in client-side SDK');
  }, []);

  // Cancel order - not yet implemented in client-side
  const cancelOrder = useCallback(async (orderId: number) => {
    throw new Error('Cancel order not yet implemented in client-side SDK');
  }, []);

  // Cancel all orders - not yet implemented in client-side
  const cancelAllOrders = useCallback(async (marketIndex?: number) => {
    throw new Error('Cancel all orders not yet implemented in client-side SDK');
  }, []);

  // Deposit collateral - use client-side implementation
  const depositCollateral = useCallback(async (amount: number) => {
    const result = await drift.depositCollateral(amount);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to deposit collateral');
    }
    
    return result;
  }, [drift]);

  // Withdraw collateral - use client-side implementation
  const withdrawCollateral = useCallback(async (amount: number) => {
    const result = await drift.withdrawCollateral(amount);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to withdraw collateral');
    }
    
    return result;
  }, [drift]);

  // Fetch positions - use client-side data
  const fetchPositions = useCallback(async (): Promise<DriftPosition[]> => {
    await drift.refreshPositions();
    return drift.positions;
  }, [drift]);

  // Fetch orders - not yet implemented
  const fetchOrders = useCallback(async (): Promise<DriftOrder[]> => {
    // Orders not yet implemented in client-side
    return [];
  }, []);

  // Fetch account summary - use client-side data
  const fetchAccountSummary = useCallback(async (): Promise<DriftAccountSummary | null> => {
    await drift.refreshSummary();
    return drift.summary;
  }, [drift]);

  return {
    loading: drift.isLoading,
    error: drift.error,
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
