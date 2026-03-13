/**
 * Order Monitor Hook - Updated to work without Drift SDK
 * 
 * This hook monitors order execution and provides real-time updates
 * on order status, fills, and completion.
 */

import { useState, useEffect, useCallback } from 'react';

export interface OrderMonitorReturn {
  pendingOrders: any[];
  isMonitoring: boolean;
  error: string | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshOrders: () => Promise<void>;
}

export function useOrderMonitor(): OrderMonitorReturn {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    try {
      setError(null);

      // For now, return empty array since we're removing Drift
      // In a real implementation, this would fetch from Hyperliquid or other APIs
      setPendingOrders([]);
    } catch (err) {
      console.error('[useOrderMonitor] Error refreshing orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh orders');
    }
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    refreshOrders();
  }, [refreshOrders]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(refreshOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring, refreshOrders]);

  return {
    pendingOrders,
    isMonitoring,
    error,
    startMonitoring,
    stopMonitoring,
    refreshOrders,
  };
}