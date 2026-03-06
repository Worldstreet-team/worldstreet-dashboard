'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { usePositions } from '@/hooks/usePositions';
import { useUser } from '@clerk/nextjs';
import { useDrift } from '@/app/context/driftContext';

interface PositionsPanelProps {
  selectedPair?: string;
  onRefresh?: () => void;
}

export default function PositionsPanel({ selectedPair, onRefresh }: PositionsPanelProps) {
  const { user } = useUser();
  const { spotPositions: driftSpotPositions, isLoading: loadingDrift } = useDrift();
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
    if (positionId.startsWith('drift-spot-')) {
      setErrorMessage('Spot positions cannot be "closed" directly. Please Sell the asset in the Order Form.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

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

  const backendPositions = activeTab === 'open' ? openPositions : closedPositions;
  const loading = activeTab === 'open' ? (loadingOpen || loadingDrift) : loadingClosed;

  // Combine backend positions with Drift spot positions if we are in 'open' tab
  const positions = [...backendPositions];

  if (activeTab === 'open' && driftSpotPositions) {
    driftSpotPositions.forEach(p => {
      // Don't show the quote asset (USDC index 0) as a position unless it's a borrow
      if (p.marketIndex !== 0 && (p.amount > 0.000001 || p.balanceType === 'borrow')) {
        positions.push({
          id: `drift-spot-${p.marketIndex}`,
          symbol: p.marketName,
          side: p.balanceType === 'deposit' ? 'BUY' : 'SELL',
          entry_price: p.price, // Fallback
          current_price: p.price,
          quantity: p.amount,
          pnl: 0,
          pnl_percentage: 0,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
        } as any);
      }
    });
  }

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || isNaN(price)) return '0.00';
    return price.toFixed(2);
  };

  const formatPnL = (pnl?: number, percentage?: number) => {
    if (pnl === undefined || pnl === null || isNaN(pnl)) {
      return <span className="text-[#848e9c]">--</span>;
    }
    const isPositive = pnl >= 0;
    return (
      <span className={isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
        {isPositive ? '+' : ''}{pnl.toFixed(4)} ({isPositive ? '+' : ''}{(percentage || 0).toFixed(2)}%)
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
            className={`text-sm font-medium transition-colors ${activeTab === 'open' ? 'text-white' : 'text-[#848e9c] hover:text-white'
              }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-white' : 'text-[#848e9c] hover:text-white'
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
        {loading && positions.length === 0 ? (
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
                        className={`px-2 py-0.5 rounded text-xs font-medium ${position.side === 'BUY'
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
                    {!position.id.startsWith('drift-spot-') && (
                      <button className="px-3 py-1.5 bg-[#2b3139] hover:bg-[#3d4450] text-white rounded text-xs font-medium transition-colors">
                        Edit TP/SL
                      </button>
                    )}
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
