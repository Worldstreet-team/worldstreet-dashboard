'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useUserFills } from '@/hooks/useUserFills';
import { useOrderHistory } from '@/hooks/useOrderHistory';

interface PositionsPanelProps {
  selectedPair?: string;
  onRefresh?: () => void;
}

type TabType = 'open' | 'order-history' | 'trade-history';

export default function PositionsPanel({ selectedPair, onRefresh }: PositionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const { orders, loading, cancellingId, cancelOrder, refetch } = useOpenOrders();
  const { fills, loading: fillsLoading } = useUserFills();
  const { orders: historicalOrders, loading: historyLoading } = useOrderHistory();

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'open', label: 'Open', count: orders.length },
    { id: 'order-history', label: 'Orders', count: historicalOrders.length || undefined },
    { id: 'trade-history', label: 'Trades', count: fills.length || undefined },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-darkgray">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-dark dark:text-white">Orders</h3>
          <div className="flex bg-muted/20 dark:bg-white/5 rounded p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-darkgray text-dark dark:text-white shadow-sm'
                    : 'text-muted hover:text-dark dark:hover:text-white'
                }`}
              >
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted ${loading ? 'animate-spin' : ''}`} 
            width={16} 
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Open Orders Tab */}
        {activeTab === 'open' && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Icon icon="ph:chart-line" className="text-muted mb-3" width={48} />
            <h4 className="text-sm font-medium text-dark dark:text-white mb-1">
              No open orders
            </h4>
            <p className="text-xs text-muted">
              Start trading to see your open orders here
            </p>
          </div>
        )}

        {activeTab === 'open' && orders.length > 0 && (
          <div className="p-3 space-y-2">
            {orders.map((order) => (
              <div
                key={order.oid}
                className="p-3 bg-muted/10 dark:bg-white/5 rounded-lg border border-border dark:border-darkborder"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark dark:text-white">
                      {order.coin}
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      order.side === 'B'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {order.side === 'B' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-[10px] text-muted">{order.orderType}</span>
                  </div>
                  <button
                    onClick={() => cancelOrder(order.coin, order.oid)}
                    disabled={cancellingId === order.oid}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {cancellingId === order.oid ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted">Price</span>
                    <p className="text-dark dark:text-white font-medium">${order.limitPx}</p>
                  </div>
                  <div>
                    <span className="text-muted">Size</span>
                    <p className="text-dark dark:text-white font-medium">{order.sz}</p>
                  </div>
                  <div>
                    <span className="text-muted">Time</span>
                    <p className="text-dark dark:text-white font-medium">
                      {new Date(order.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order History Tab */}
        {activeTab === 'order-history' && (
          <>
            {historyLoading && historicalOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-xs text-muted">Loading order history...</p>
              </div>
            ) : historicalOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Icon icon="ph:file-text" className="text-muted mb-3" width={48} />
                <h4 className="text-sm font-medium text-dark dark:text-white mb-1">No order history</h4>
                <p className="text-xs text-muted">Your past orders will appear here</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {historicalOrders.map((item: any) => {
                  const o = item.order || item;
                  return (
                    <div
                      key={o.oid}
                      className="p-3 bg-muted/10 dark:bg-white/5 rounded-lg border border-border dark:border-darkborder"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-dark dark:text-white">
                            {o.coinDisplay || o.coin}
                          </span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            o.side === 'B' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {o.side === 'B' ? 'BUY' : 'SELL'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          item.status === 'filled' ? 'bg-green-500/10 text-green-500'
                            : item.status === 'canceled' || item.status === 'marginCanceled' ? 'bg-red-500/10 text-red-500'
                            : item.status === 'rejected' ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted">Price</span>
                          <p className="text-dark dark:text-white font-medium">${o.limitPx}</p>
                        </div>
                        <div>
                          <span className="text-muted">Amount</span>
                          <p className="text-dark dark:text-white font-medium">{o.origSz || o.sz}</p>
                        </div>
                        <div>
                          <span className="text-muted">Time</span>
                          <p className="text-dark dark:text-white font-medium">
                            {new Date(item.statusTimestamp || o.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Trade History Tab */}
        {activeTab === 'trade-history' && (
          <>
            {fillsLoading && fills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-xs text-muted">Loading trade history...</p>
              </div>
            ) : fills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Icon icon="ph:clock-clockwise" className="text-muted mb-3" width={48} />
                <h4 className="text-sm font-medium text-dark dark:text-white mb-1">No trade history</h4>
                <p className="text-xs text-muted">Your executed trades will appear here</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {fills.map((fill: any, idx: number) => (
                  <div
                    key={`${fill.tid || fill.hash}-${idx}`}
                    className="p-3 bg-muted/10 dark:bg-white/5 rounded-lg border border-border dark:border-darkborder"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-dark dark:text-white">
                          {fill.coinDisplay || fill.coin}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          fill.side === 'B' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {fill.side === 'B' ? 'BUY' : 'SELL'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted">
                        {new Date(fill.time).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted">Price</span>
                        <p className="text-dark dark:text-white font-medium font-mono">${parseFloat(fill.px).toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-muted">Size</span>
                        <p className="text-dark dark:text-white font-medium font-mono">{fill.sz}</p>
                      </div>
                      <div>
                        <span className="text-muted">Fee</span>
                        <p className="text-dark dark:text-white font-medium font-mono">{parseFloat(fill.fee).toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}