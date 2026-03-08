'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface OrderStatusMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function OrderStatusMonitor({ 
  autoRefresh = true, 
  refreshInterval = 5000 
}: OrderStatusMonitorProps) {
  const { getOpenOrders, cancelOrder, getSpotMarketName, getMarketName, isClientReady } = useDrift();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingOrderIndex, setCancellingOrderIndex] = useState<number | null>(null);

  // Auto-refresh orders
  useEffect(() => {
    if (!isClientReady || !autoRefresh) return;

    const refresh = async () => {
      setIsRefreshing(true);
      const orders = await getOpenOrders();
      // Show ALL orders (both spot and perp) - don't filter
      console.log('[OrderStatusMonitor] Received orders:', orders);
      setAllOrders(orders);
      setIsRefreshing(false);
    };

    refresh();
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [isClientReady, autoRefresh, refreshInterval, getOpenOrders]);

  const handleCancelOrder = async (orderIndex: number) => {
    setCancellingOrderIndex(orderIndex);
    try {
      const result = await cancelOrder(orderIndex);
      if (result.success) {
        console.log('Order cancelled successfully');
        const orders = await getOpenOrders();
        setAllOrders(orders);
      } else {
        console.error('Failed to cancel order:', result.error);
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
    } finally {
      setCancellingOrderIndex(null);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const orders = await getOpenOrders();
    console.log('[OrderStatusMonitor] Manual refresh - received orders:', orders);
    setAllOrders(orders);
    setIsRefreshing(false);
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'filled':
        return {
          bg: 'bg-[#0ecb81]/10',
          text: 'text-[#0ecb81]',
          icon: 'ph:check-circle',
        };
      case 'canceled':
        return {
          bg: 'bg-[#848e9c]/10',
          text: 'text-[#848e9c]',
          icon: 'ph:x-circle',
        };
      case 'open':
        return {
          bg: 'bg-[#fcd535]/10',
          text: 'text-[#fcd535]',
          icon: 'ph:clock',
        };
      default:
        return {
          bg: 'bg-[#2b3139]',
          text: 'text-[#848e9c]',
          icon: 'ph:question',
        };
    }
  };

  // Loading skeleton
  if (!isClientReady || (isRefreshing && allOrders.length === 0)) {
    return (
      <div className="bg-[#1e2329] rounded-lg overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#2b3139] rounded animate-pulse" />
            <div className="w-24 h-4 bg-[#2b3139] rounded animate-pulse" />
            <div className="w-8 h-5 bg-[#2b3139] rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-[#2b3139] rounded animate-pulse" />
        </div>

        {/* Order Skeletons */}
        <div className="divide-y divide-[#2b3139]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-16 h-4 bg-[#2b3139] rounded animate-pulse" />
                    <div className="w-12 h-5 bg-[#2b3139] rounded animate-pulse" />
                    <div className="w-14 h-5 bg-[#2b3139] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-3 bg-[#2b3139] rounded animate-pulse" />
                    <div className="w-24 h-3 bg-[#2b3139] rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-16 h-7 bg-[#2b3139] rounded animate-pulse" />
              </div>
              <div className="w-full h-8 bg-[#2b3139] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#2b3139]/50 border-t border-[#2b3139]">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-[#2b3139] rounded animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="w-full h-3 bg-[#2b3139] rounded animate-pulse" />
              <div className="w-3/4 h-3 bg-[#2b3139] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (allOrders.length === 0) {
    return (
      <div className="bg-[#1e2329] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
          <div className="flex items-center gap-2">
            <Icon icon="ph:clock" className="text-[#fcd535]" width={20} />
            <h3 className="text-sm font-semibold text-white">Open Orders</h3>
            <span className="px-2 py-0.5 bg-[#fcd535]/10 text-[#fcd535] text-xs font-medium rounded">
              0
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-[#2b3139] rounded-lg transition-colors disabled:opacity-50"
            title="Refresh orders"
          >
            <Icon 
              icon="ph:arrow-clockwise" 
              className={`text-[#848e9c] ${isRefreshing ? 'animate-spin' : ''}`} 
              width={18} 
            />
          </button>
        </div>

        {/* Empty State Content */}
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2b3139] rounded-full mb-4">
            <Icon icon="ph:clock" className="text-[#848e9c]" width={32} />
          </div>
          <p className="text-sm font-medium text-white mb-1">No Open Orders</p>
          <p className="text-xs text-[#848e9c] max-w-xs mx-auto">
            You don't have any pending orders. Place a market or limit order to see it here.
          </p>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-[#2b3139]/50 border-t border-[#2b3139]">
          <div className="flex items-start gap-2 text-xs text-[#848e9c]">
            <Icon icon="ph:lightbulb" className="flex-shrink-0 mt-0.5" width={14} />
            <div>
              <p className="mb-1">Orders are filled by Drift Protocol's keeper network.</p>
              <p>Filled orders will appear in your spot positions automatically.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e2329] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
        <div className="flex items-center gap-2">
          <Icon icon="ph:clock" className="text-[#fcd535]" width={20} />
          <h3 className="text-sm font-semibold text-white">Open Orders</h3>
          <span className="px-2 py-0.5 bg-[#fcd535]/10 text-[#fcd535] text-xs font-medium rounded">
            {allOrders.length}
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-[#2b3139] rounded-lg transition-colors disabled:opacity-50"
          title="Refresh orders"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-[#848e9c] ${isRefreshing ? 'animate-spin' : ''}`} 
            width={18} 
          />
        </button>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-[#2b3139]">
        {allOrders.map((order, index) => {
          const isCancelling = cancellingOrderIndex === order.orderIndex;
          
          // Get market name based on market type
          const marketName = order.marketType === 'spot' 
            ? getSpotMarketName(order.marketIndex)
            : getMarketName(order.marketIndex);
          
          const isBuy = order.direction === 'buy' || order.direction === 'long';
          const directionColor = isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]';
          const directionBg = isBuy ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10';
          
          const statusStyle = getStatusStyle(order.status);

          return (
            <div key={`${order.orderIndex}-${index}`} className="p-4 hover:bg-[#2b3139]/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{marketName}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${directionBg} ${directionColor}`}>
                      {order.direction.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 bg-[#2b3139] text-[#848e9c] text-xs font-medium rounded">
                      {order.orderType.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 bg-[#2b3139] text-[#848e9c] text-xs font-medium rounded">
                      {order.marketType.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text}`}>
                      <Icon icon={statusStyle.icon} width={12} />
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#848e9c]">
                    <span>Amount: {(parseFloat(order.baseAssetAmount) / 1e9).toFixed(6)}</span>
                    {order.orderType === 'limit' && (
                      <span>Price: ${(parseFloat(order.price) / 1e6).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelOrder(order.orderIndex)}
                  disabled={isCancelling}
                  className="px-3 py-1.5 bg-[#f6465d]/10 hover:bg-[#f6465d]/20 text-[#f6465d] text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <Icon icon="ph:spinner" className="animate-spin" width={14} />
                  ) : (
                    'Cancel'
                  )}
                </button>
              </div>

              {/* Status Info - Always show for open orders */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-[#fcd535]">
                  <Icon icon="ph:clock" width={14} />
                  <span>Waiting for keeper to fill</span>
                </div>
              </div>

              {/* Info Banner */}
              <div className="mt-3 p-2 bg-[#2b3139] rounded text-xs text-[#848e9c]">
                <Icon icon="ph:info" className="inline mr-1" width={12} />
                Orders are filled by Drift Protocol's keeper network. This typically takes 30s-2min depending on network conditions.
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-[#2b3139]/50 border-t border-[#2b3139]">
        <div className="flex items-start gap-2 text-xs text-[#848e9c]">
          <Icon icon="ph:lightbulb" className="flex-shrink-0 mt-0.5" width={14} />
          <div>
            <p className="mb-1">Orders are filled by Drift Protocol's keeper network.</p>
            <p>Check your spot positions to see filled orders. Balances update automatically after fills.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
