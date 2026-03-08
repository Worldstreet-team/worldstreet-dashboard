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
  const { getAllOrders, cancelOrder, getSpotMarketName, isClientReady } = useDrift();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingOrderIndex, setCancellingOrderIndex] = useState<number | null>(null);

  // Auto-refresh orders
  useEffect(() => {
    if (!isClientReady || !autoRefresh) return;

    const refresh = async () => {
      setIsRefreshing(true);
      const orders = await getAllOrders();
      setAllOrders(orders);
      setIsRefreshing(false);
    };

    refresh();
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [isClientReady, autoRefresh, refreshInterval, getAllOrders]);

  const handleCancelOrder = async (orderIndex: number) => {
    setCancellingOrderIndex(orderIndex);
    try {
      const result = await cancelOrder(orderIndex);
      if (result.success) {
        console.log('Order cancelled successfully');
        const orders = await getAllOrders();
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
    const orders = await getAllOrders();
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

  if (!isClientReady) {
    return (
      <div className="bg-[#1e2329] rounded-lg p-6 text-center">
        <Icon icon="ph:spinner" className="mx-auto mb-2 text-[#fcd535] animate-spin" width={32} />
        <p className="text-sm text-[#848e9c]">Connecting to Drift Protocol...</p>
      </div>
    );
  }

  if (allOrders.length === 0) {
    return (
      <div className="bg-[#1e2329] rounded-lg p-6 text-center">
        <Icon icon="ph:check-circle" className="mx-auto mb-2 text-[#0ecb81]" width={48} />
        <p className="text-sm text-white mb-1">No Orders</p>
        <p className="text-xs text-[#848e9c]">You haven't placed any orders yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e2329] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
        <div className="flex items-center gap-2">
          <Icon icon="ph:list" className="text-[#fcd535]" width={20} />
          <h3 className="text-sm font-semibold text-white">Order History</h3>
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
          const marketName = order.marketType === 'spot' 
            ? getSpotMarketName(order.marketIndex)
            : `Market ${order.marketIndex}`;
          
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
                {order.status === 'open' && (
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
                )}
              </div>

              {/* Status Info */}
              {order.status === 'open' && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 text-[#fcd535]">
                      <Icon icon="ph:clock" width={14} />
                      <span>Waiting for keeper to fill</span>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="mt-3 p-2 bg-[#2b3139] rounded text-xs text-[#848e9c]">
                    <Icon icon="ph:info" className="inline mr-1" width={12} />
                    Market orders are filled by external keepers. This typically takes 30s-2min depending on network conditions.
                  </div>
                </>
              )}
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
