"use client";

import React, { useState, useEffect } from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { useDrift } from '@/app/context/driftContext';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';
import { Icon } from '@iconify/react';

interface DriftPosition {
  marketIndex: number;
  direction: 'long' | 'short';
  baseAmount: number;
  quoteAmount: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export const PositionPanel: React.FC = () => {
  const { markets } = useFuturesStore();
  const { summary, refreshSummary, isLoading } = useDrift();
  const [positions, setPositions] = useState<DriftPosition[]>([]);
  const [closingMarketIndex, setClosingMarketIndex] = useState<number | null>(null);
  const { isPolling: isConfirmingClose, startPostActionPolling } = usePostActionPolling();

  // Load positions from API when summary changes
  useEffect(() => {
    if (summary?.openPositions && summary.openPositions > 0) {
      loadPositions();
    } else {
      setPositions([]);
    }
  }, [summary?.openPositions]);

  const loadPositions = async () => {
    try {
      const response = await fetch('/api/drift/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const handleClose = async (marketIndex: number) => {
    if (!confirm('Are you sure you want to close this position?')) return;

    setClosingMarketIndex(marketIndex);
    try {
      const response = await fetch('/api/drift/position/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIndex }),
      });

      if (!response.ok) {
        throw new Error('Failed to close position');
      }
      
      // Start post-action polling to confirm position is closed
      startPostActionPolling({
        checkCondition: async () => {
          await refreshSummary();
          await loadPositions();
          // Check if position is gone
          return !positions.some(p => p.marketIndex === marketIndex);
        },
        onSuccess: () => {
          setClosingMarketIndex(null);
        },
        onTimeout: () => {
          setClosingMarketIndex(null);
          alert('Position close is taking longer than expected. Please check your positions.');
        },
        maxAttempts: 15,
        interval: 1000,
      });
    } catch (error) {
      console.error('Close error:', error);
      alert((error as Error).message || 'Failed to close position');
      setClosingMarketIndex(null);
    }
  };

  // Get market symbol from index
  const getMarketSymbol = (marketIndex: number) => {
    const market = markets[marketIndex];
    return market?.symbol || `Market ${marketIndex}`;
  };

  if (isLoading && positions.length === 0) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-6">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Open Positions</h3>
        <div className="text-center py-8">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto text-primary mb-2" height={32} />
          <p className="text-muted dark:text-darklink text-sm">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && positions.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">Open Positions</h3>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Icon icon="ph:chart-line-duotone" className="text-primary" height={32} />
          </div>
          <p className="text-muted dark:text-gray-400 font-medium">No open positions</p>
          <p className="text-xs text-muted dark:text-gray-500 mt-1">Open a long or short position to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">Open Positions</h3>
          {positions.length > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              {positions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { refreshSummary(); loadPositions(); }}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-200 disabled:opacity-50"
          title="Refresh"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} 
            width={18} 
          />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200/50 dark:border-white/5">
              <th className="text-left py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Market</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Side</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Size</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Entry</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">PnL</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Leverage</th>
              <th className="text-center py-3 px-4 text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.marketIndex} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-4 px-4 text-sm font-bold text-dark dark:text-white">
                  {getMarketSymbol(position.marketIndex)}
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                    position.direction === 'long' 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-error/10 text-error border border-error/20'
                  }`}>
                    {position.direction.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-right text-dark dark:text-white font-mono font-semibold tabular-nums">
                  {position.baseAmount?.toFixed(4) || '0.0000'}
                </td>
                <td className="py-4 px-4 text-sm text-right text-dark dark:text-white font-mono font-semibold tabular-nums">
                  ${position.entryPrice?.toFixed(2) || '0.00'}
                </td>
                <td className="py-4 px-4 text-sm text-right text-dark dark:text-white font-mono font-semibold tabular-nums">
                  ${position.quoteAmount?.toFixed(2) || '0.00'}
                </td>
                <td className={`py-4 px-4 text-sm text-right font-bold font-mono tabular-nums ${
                  (position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-error'
                }`}>
                  {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}${(Number(position.unrealizedPnl) || 0).toFixed(2)}
                </td>
                <td className="py-4 px-4 text-sm text-right text-dark dark:text-white font-mono font-semibold tabular-nums">
                  {position.leverage?.toFixed(1) || '1.0'}x
                </td>
                <td className="py-4 px-4 text-center">
                  <button
                    onClick={() => handleClose(position.marketIndex)}
                    disabled={closingMarketIndex === position.marketIndex || isConfirmingClose}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-error/10 text-error hover:bg-error/20 border border-error/20 hover:border-error/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {closingMarketIndex === position.marketIndex ? (
                      isConfirmingClose ? (
                        <span className="flex items-center gap-1.5">
                          <Icon icon="svg-spinners:ring-resize" height={12} />
                          Confirming...
                        </span>
                      ) : (
                        'Closing...'
                      )
                    ) : (
                      'Close'
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
