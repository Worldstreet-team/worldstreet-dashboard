"use client";

import React from 'react';
import { useOrderMonitor } from '@/hooks/useOrderMonitor';
import { useDrift } from '@/app/context/driftContext';
import { Loader2, X, Clock } from 'lucide-react';

interface PendingOrdersIndicatorProps {
  marketIndex?: number;
  showDetails?: boolean;
}

/**
 * Component to display pending orders with real-time status
 * 
 * Shows:
 * - Number of pending orders
 * - Order details (market, direction, amount)
 * - Time since order placed
 * - Cancel button for each order
 * 
 * Auto-refreshes positions when orders fill
 */
export function PendingOrdersIndicator({ marketIndex, showDetails = true }: PendingOrdersIndicatorProps) {
  const { pendingOrders, hasPendingOrders, orderCount, isMonitoring, cancelOrder } = useOrderMonitor({
    marketIndex,
    autoRefresh: true,
    pollInterval: 2000,
  });

  const { getSpotMarketName, getMarketName } = useDrift();

  if (!hasPendingOrders) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-600 dark:text-yellow-400" />
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {orderCount} {orderCount === 1 ? 'Order' : 'Orders'} Pending
        </span>
        {isMonitoring && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Monitoring...
          </span>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2">
          {pendingOrders.map((order, index) => {
            const marketName = order.marketType === 'spot'
              ? getSpotMarketName(order.marketIndex)
              : getMarketName(order.marketIndex);

            return (
              <div
                key={`${order.orderIndex}-${index}`}
                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {order.direction.toUpperCase()} {marketName}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {order.orderType === 'market' ? 'Market' : 'Limit'}
                  </span>
                </div>

                <button
                  onClick={() => cancelOrder(order.orderIndex)}
                  className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Cancel order"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
        Orders are being filled by the keeper network. This usually takes 30 seconds to 2 minutes.
      </p>
    </div>
  );
}

/**
 * Compact version for header/status bar
 */
export function PendingOrdersBadge({ marketIndex }: { marketIndex?: number }) {
  const { orderCount, hasPendingOrders } = useOrderMonitor({
    marketIndex,
    autoRefresh: true,
  });

  if (!hasPendingOrders) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>{orderCount} pending</span>
    </div>
  );
}
