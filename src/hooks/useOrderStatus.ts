/**
 * Order Status Hook - Updated to work without Drift SDK
 * 
 * This hook provides order status monitoring functionality.
 * It tracks order execution status and provides real-time updates.
 */

import { useCallback, useEffect, useState } from 'react';

export interface OrderStatusDetail {
  orderIndex: number;
  marketIndex: number;
  marketName: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  baseAmount: number;
  price?: number;
  status: 'pending' | 'filling' | 'filled' | 'cancelled';
  filledAmount: number;
  remainingAmount: number;
  averageFillPrice?: number;
  timeInForce: string;
  createdAt: Date;
  estimatedFillTime?: Date;
  auctionStartPrice?: number;
  auctionEndPrice?: number;
  isInAuction: boolean;
}

export interface UseOrderStatusReturn {
  orderDetails: OrderStatusDetail[];
  isLoading: boolean;
  error: string | null;
  refreshOrderStatus: () => Promise<void>;
  hasActiveOrders: boolean;
  totalActiveOrders: number;
}

export function useOrderStatus(): UseOrderStatusReturn {
  const [orderDetails, setOrderDetails] = useState<OrderStatusDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshOrderStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, return empty array since we're removing Drift
      // In a real implementation, this would fetch from Hyperliquid or other APIs
      setOrderDetails([]);
    } catch (err) {
      console.error('[useOrderStatus] Error fetching order status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch order status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrderStatus();
  }, [refreshOrderStatus]);

  return {
    orderDetails,
    isLoading,
    error,
    refreshOrderStatus,
    hasActiveOrders: orderDetails.length > 0,
    totalActiveOrders: orderDetails.length,
  };
}