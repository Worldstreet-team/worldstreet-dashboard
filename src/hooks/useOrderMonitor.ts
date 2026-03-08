import { useState, useEffect, useCallback } from 'react';
import { useDrift } from '@/app/context/driftContext';

/**
 * Hook to monitor open orders and detect when they fill
 * 
 * This hook:
 * 1. Polls for open orders every 2 seconds
 * 2. Detects when orders are filled (disappear from open orders)
 * 3. Automatically refreshes positions when orders fill
 * 4. Provides order status for UI feedback
 * 
 * Use this to show "Order Pending" states in your UI
 */

interface UseOrderMonitorOptions {
  marketIndex?: number; // Filter by specific market
  autoRefresh?: boolean; // Auto-refresh positions when orders fill
  pollInterval?: number; // Polling interval in ms (default: 2000)
}

interface UseOrderMonitorReturn {
  pendingOrders: any[];
  hasPendingOrders: boolean;
  orderCount: number;
  isMonitoring: boolean;
  refresh: () => Promise<void>;
  cancelOrder: (orderIndex: number) => Promise<{ success: boolean; error?: string }>;
}

export function useOrderMonitor(options: UseOrderMonitorOptions = {}): UseOrderMonitorReturn {
  const {
    marketIndex,
    autoRefresh = true,
    pollInterval = 2000,
  } = options;

  const {
    getOpenOrders,
    cancelOrder: driftCancelOrder,
    refreshPositions,
    isClientReady,
  } = useDrift();

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  // Refresh orders
  const refresh = useCallback(async () => {
    if (!isClientReady) return;

    try {
      setIsMonitoring(true);
      const orders = await getOpenOrders();

      // Filter by market if specified
      const filteredOrders = marketIndex !== undefined
        ? orders.filter(o => o.marketIndex === marketIndex)
        : orders;

      setPendingOrders(filteredOrders);

      // Detect if orders were filled (count decreased)
      if (autoRefresh && filteredOrders.length < previousOrderCount) {
        console.log('[useOrderMonitor] Orders filled, refreshing positions...');
        await refreshPositions();
      }

      setPreviousOrderCount(filteredOrders.length);
    } catch (err) {
      console.error('[useOrderMonitor] Error refreshing orders:', err);
    } finally {
      setIsMonitoring(false);
    }
  }, [isClientReady, getOpenOrders, marketIndex, autoRefresh, previousOrderCount, refreshPositions]);

  // Poll for orders
  useEffect(() => {
    if (!isClientReady) return;

    // Initial fetch
    refresh();

    // Set up polling
    const interval = setInterval(refresh, pollInterval);

    return () => clearInterval(interval);
  }, [isClientReady, refresh, pollInterval]);

  // Cancel order wrapper
  const cancelOrder = useCallback(async (orderIndex: number) => {
    const result = await driftCancelOrder(orderIndex);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [driftCancelOrder, refresh]);

  return {
    pendingOrders,
    hasPendingOrders: pendingOrders.length > 0,
    orderCount: pendingOrders.length,
    isMonitoring,
    refresh,
    cancelOrder,
  };
}
