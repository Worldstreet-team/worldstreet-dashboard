'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useOpenOrders } from '@/hooks/useOpenOrders';

interface PositionsPanelProps {
  selectedPair?: string;
  onRefresh?: () => void;
}

export default function PositionsPanel({ selectedPair, onRefresh }: PositionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const { orders, loading, cancellingId, cancelOrder, refetch } = useOpenOrders();

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-darkgray">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-dark dark:text-white">Positions</h3>
          <div className="flex bg-muted/20 dark:bg-white/5 rounded p-0.5">
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'open'
                  ? 'bg-white dark:bg-darkgray text-dark dark:text-white shadow-sm'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              Open ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-darkgray text-dark dark:text-white shadow-sm'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              History
            </button>
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

        {activeTab === 'history' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Icon icon="ph:clock-clockwise" className="text-muted mb-3" width={48} />
            <h4 className="text-sm font-medium text-dark dark:text-white mb-1">
              No history yet
            </h4>
            <p className="text-xs text-muted">
              Your closed positions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}