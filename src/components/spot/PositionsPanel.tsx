'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { usePositions } from '@/hooks/usePositions';
import { useUser } from '@clerk/nextjs';

interface PositionsPanelProps {
  selectedPair?: string;
  onRefresh?: () => void;
}

export default function PositionsPanel({ selectedPair, onRefresh }: PositionsPanelProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { positions: openPositions, loading: loadingOpen, refetch: refetchOpen } = usePositions({
    userId: user?.id || null,
    status: 'OPEN',
    refreshInterval: 5000,
  });

  const { positions: closedPositions, loading: loadingClosed, refetch: refetchClosed } = usePositions({
    userId: user?.id || null,
    status: 'CLOSED',
    limit: 100,
    refreshInterval: 0,
  });

  const handleRefresh = () => {
    if (activeTab === 'open') {
      refetchOpen();
    } else {
      refetchClosed();
    }
    onRefresh?.();
  };

  const handleClosePosition = async (positionId: string) => {
    if (!user?.id) {
      setErrorMessage('User not authenticated');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setClosingPositions(prev => new Set(prev).add(positionId));
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/positions/${positionId}/close-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to close position');
      }

      // Refresh positions
      refetchOpen();
      refetchClosed();
      onRefresh?.();
    } catch (error) {
      console.error('Error closing position:', error);
      const message = error instanceof Error ? error.message : 'Failed to close position';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setClosingPositions(prev => {
        const next = new Set(prev);
        next.delete(positionId);
        return next;
      });
    }
  };

  const positions = activeTab === 'open' ? openPositions : closedPositions;
  const loading = activeTab === 'open' ? loadingOpen : loadingClosed;

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || isNaN(price)) return '0.00';
    return price.toFixed(2);
  };

  const formatPnL = (pnl?: number, percentage?: number) => {
    if (pnl === undefined || pnl === null || isNaN(pnl)) {
      return <span className="text-[#848e9c]">--</span>;
    }
    if (percentage === undefined || percentage === null || isNaN(percentage)) {
      percentage = 0;
    }
    const isPositive = pnl >= 0;
    return (
      <span className={isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
        {isPositive ? '+' : ''}{pnl.toFixed(4)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#181a20]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139] shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('open')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'open' ? 'text-white' : 'text-[#848e9c] hover:text-white'
            }`}
          >
            Open Positions ({openPositions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'text-white' : 'text-[#848e9c] hover:text-white'
            }`}
          >
            Order History
          </button>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-[#2b3139] rounded transition-colors"
          title="Refresh"
        >
          <Icon icon="ph:arrow-clockwise" width={16} className="text-[#848e9c]" />
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="px-4 py-2 bg-[#f6465d]/10 border-b border-[#f6465d]/20">
          <div className="flex items-center gap-2 text-[#f6465d] text-xs">
            <Icon icon="ph:warning-circle" width={16} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Icon icon="ph:spinner" className="text-[#fcd535] animate-spin" width={24} />
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Icon icon="ph:file-text" className="text-[#848e9c] mb-2" width={40} />
            <p className="text-sm text-[#848e9c]">
              {activeTab === 'open' ? 'No open positions' : 'No order history'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2b3139]">
            {positions.map((position) => (
              <div key={position.id} className="px-4 py-3 hover:bg-[#1e2329] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {position.symbol.replace('-', '/').replace('/', ' / ')}
                    </span>
                    {position.side && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          position.side === 'BUY'
                            ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                            : 'bg-[#f6465d]/10 text-[#f6465d]'
                        }`}
                      >
                        {position.side}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {formatPnL(position.pnl, position.pnl_percentage)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#848e9c]">Entry:</span>
                    <span className="text-white">${formatPrice(position.entry_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848e9c]">Current:</span>
                    <span className="text-white">${formatPrice(position.current_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848e9c]">Quantity:</span>
                    <span className="text-white">{position.quantity?.toFixed(6) || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848e9c]">Time:</span>
                    <span className="text-white">{formatDate(position.opened_at)}</span>
                  </div>
                  {position.take_profit && position.take_profit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#848e9c]">TP:</span>
                      <span className="text-[#0ecb81]">${formatPrice(position.take_profit)}</span>
                    </div>
                  )}
                  {position.stop_loss && position.stop_loss > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#848e9c]">SL:</span>
                      <span className="text-[#f6465d]">${formatPrice(position.stop_loss)}</span>
                    </div>
                  )}
                </div>

                {activeTab === 'open' && (
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleClosePosition(position.id)}
                      disabled={closingPositions.has(position.id)}
                      className="flex-1 px-3 py-1.5 bg-[#f6465d] hover:bg-[#f6465d]/90 disabled:bg-[#2b3139] disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      {closingPositions.has(position.id) ? (
                        <>
                          <Icon icon="ph:spinner" className="animate-spin" width={14} />
                          Closing...
                        </>
                      ) : (
                        'Close Position'
                      )}
                    </button>
                    <button className="px-3 py-1.5 bg-[#2b3139] hover:bg-[#3d4450] text-white rounded text-xs font-medium transition-colors">
                      Edit TP/SL
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
