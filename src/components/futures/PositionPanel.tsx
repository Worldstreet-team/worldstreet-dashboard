"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { useDriftTrading, DriftPosition } from '@/hooks/useDriftTrading';
import { useFuturesPolling, usePostActionPolling } from '@/hooks/useFuturesPolling';
import { Icon } from '@iconify/react';

export const PositionPanel: React.FC = () => {
  const { selectedChain, markets } = useFuturesStore();
  const { closePosition, fetchPositions } = useDriftTrading();
  const [positions, setPositions] = useState<DriftPosition[]>([]);
  const [closingMarketIndex, setClosingMarketIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { isPolling: isConfirmingClose, startPostActionPolling } = usePostActionPolling();

  // Load positions function
  const loadPositions = useCallback(async () => {
    if (loading) return; // Prevent overlapping requests
    
    setLoading(true);
    try {
      const data = await fetchPositions();
      setPositions(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load positions:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchPositions, loading]);

  // Auto-polling every 5 seconds
  useFuturesPolling({
    interval: 5000,
    enabled: true,
    onPoll: loadPositions,
    dependencies: [selectedChain],
  });

  const handleClose = async (marketIndex: number) => {
    if (!confirm('Are you sure you want to close this position?')) return;

    setClosingMarketIndex(marketIndex);
    try {
      const result = await closePosition(marketIndex);
      
      // Start post-action polling to confirm position is closed
      startPostActionPolling({
        checkCondition: async () => {
          const data = await fetchPositions();
          setPositions(data);
          // Check if position is gone
          return !data.some(p => p.marketIndex === marketIndex);
        },
        onSuccess: () => {
          setClosingMarketIndex(null);
          // Success feedback handled by UI
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

  if (loading && positions.length === 0) {
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

  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-6">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Open Positions</h3>
        <div className="text-center py-8">
          <Icon icon="ph:chart-line-duotone" className="mx-auto text-muted dark:text-darklink mb-2" height={48} />
          <p className="text-muted dark:text-darklink">No open positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-dark dark:text-white">Open Positions</h3>
          {lastUpdate && (
            <span className="text-xs text-muted dark:text-darklink">
              {loading ? 'Updating...' : `Updated ${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago`}
            </span>
          )}
        </div>
        <button
          onClick={loadPositions}
          disabled={loading}
          className="p-1.5 hover:bg-muted/30 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted ${loading ? 'animate-spin' : ''}`} 
            width={18} 
          />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-darkborder">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Market</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Side</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Size</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Entry</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Value</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">PnL</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Leverage</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.marketIndex} className="border-b border-border dark:border-darkborder hover:bg-gray-50 dark:hover:bg-dark">
                <td className="py-3 px-2 text-sm font-medium text-dark dark:text-white">
                  {getMarketSymbol(position.marketIndex)}
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    position.direction === 'long' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-error/10 text-error'
                  }`}>
                    {position.direction.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">
                  {position.baseAmount?.toFixed(4) || '0.0000'}
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">
                  ${position.entryPrice?.toFixed(2) || '0.00'}
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">
                  ${position.quoteAmount?.toFixed(2) || '0.00'}
                </td>
                <td className={`py-3 px-2 text-sm text-right font-semibold ${
                  (position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-error'
                }`}>
                  {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}${(position.unrealizedPnl || 0).toFixed(2)}
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">
                  {position.leverage?.toFixed(1) || '1.0'}x
                </td>
                <td className="py-3 px-2 text-center">
                  <button
                    onClick={() => handleClose(position.marketIndex)}
                    disabled={closingMarketIndex === position.marketIndex || isConfirmingClose}
                    className="px-3 py-1 rounded text-xs font-medium bg-error/10 text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {closingMarketIndex === position.marketIndex ? (
                      isConfirmingClose ? (
                        <span className="flex items-center gap-1">
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
