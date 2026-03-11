"use client";

import React, { useEffect } from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { useDrift } from '@/app/context/driftContext';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';
import { Icon } from '@iconify/react';

export const PositionPanel: React.FC = () => {
  const { markets } = useFuturesStore();
  const { positions, refreshPositions, refreshSummary, isLoading, closePosition: closePositionClient, getMarketName } = useDrift();
  const [closingMarketIndex, setClosingMarketIndex] = React.useState<number | null>(null);
  const { isPolling: isConfirmingClose, startPostActionPolling } = usePostActionPolling();

  // Refresh positions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPositions();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshPositions]);

  const handleClose = async (marketIndex: number) => {
    if (!confirm('Are you sure you want to close this position?')) return;

    setClosingMarketIndex(marketIndex);
    try {
      const result = await closePositionClient(marketIndex);

      if (!result.success) {
        throw new Error(result.error || 'Failed to close position');
      }

      // Start post-action polling to confirm position is closed
      startPostActionPolling({
        checkCondition: async () => {
          await refreshSummary();
          await refreshPositions();
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

  // Get market symbol from index using stable mapping
  const getMarketSymbol = (marketIndex: number) => {
    return getMarketName(marketIndex);
  };

  if (isLoading && positions.length === 0) {
    return (
      <div className="bg-[#0b0e11] h-full flex flex-col items-center justify-center">
        <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535] mb-2" height={28} />
        <p className="text-[#848e9c] text-[11px]">Loading positions...</p>
      </div>
    );
  }

  if (!isLoading && positions.length === 0) {
    return (
      <div className="bg-[#0b0e11] h-full flex flex-col items-center justify-center">
        <Icon icon="ph:chart-line" className="text-[#848e9c] mb-3" height={28} />
        <p className="text-[#848e9c] text-[11px]">No open positions</p>
        <p className="text-[10px] text-[#848e9c]/60 mt-1">Open a long or short position to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e11] h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-medium text-[#848e9c] uppercase">Open Positions</h3>
          {positions.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535] text-[10px] font-bold">
              {positions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { refreshSummary(); refreshPositions(); }}
          disabled={isLoading}
          className="p-1.5 hover:bg-[#2b3139] active:bg-[#2b3139]/80 rounded transition-all duration-200 disabled:opacity-50 active:scale-95"
          title="Refresh"
        >
          <Icon
            icon="ph:arrow-clockwise"
            className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`}
            width={14}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#1f2329]">
              <th className="text-left py-1.5 px-2 font-medium text-[#848e9c] uppercase">Market</th>
              <th className="text-left py-1.5 px-2 font-medium text-[#848e9c] uppercase">Side</th>
              <th className="text-right py-1.5 px-2 font-medium text-[#848e9c] uppercase">Size</th>
              <th className="text-right py-1.5 px-2 font-medium text-[#848e9c] uppercase">Entry</th>
              <th className="text-right py-1.5 px-2 font-medium text-[#848e9c] uppercase">Value</th>
              <th className="text-right py-1.5 px-2 font-medium text-[#848e9c] uppercase">PnL</th>
              <th className="text-right py-1.5 px-2 font-medium text-[#848e9c] uppercase">Leverage</th>
              <th className="text-center py-1.5 px-2 font-medium text-[#848e9c] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.marketIndex} className="border-b border-[#1f2329] hover:bg-[#1a1f26] transition-colors">
                <td className="py-2 px-2 font-semibold text-white">
                  {getMarketSymbol(position.marketIndex)}
                </td>
                <td className="py-2 px-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${position.direction === 'long'
                      ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                      : 'bg-[#f6465d]/10 text-[#f6465d]'
                    }`}>
                    {position.direction.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-white font-mono tabular-nums">
                  {position.baseAmount?.toFixed(4) || '0.0000'}
                </td>
                <td className="py-2 px-2 text-right text-white font-mono tabular-nums">
                  ${position.entryPrice?.toFixed(2) || '0.00'}
                </td>
                <td className="py-2 px-2 text-right text-white font-mono tabular-nums">
                  ${position.quoteAmount?.toFixed(2) || '0.00'}
                </td>
                <td className={`py-2 px-2 text-right font-bold font-mono tabular-nums ${(position.unrealizedPnl || 0) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                  }`}>
                  {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}${(Number(position.unrealizedPnl) || 0).toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right text-white font-mono tabular-nums">
                  {position.leverage?.toFixed(1) || '1.0'}x
                </td>
                <td className="py-2 px-2 text-center">
                  <button
                    onClick={() => handleClose(position.marketIndex)}
                    disabled={closingMarketIndex === position.marketIndex || isConfirmingClose}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-[#f6465d]/10 text-[#f6465d] hover:bg-[#f6465d]/20 active:bg-[#f6465d]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                  >
                    {closingMarketIndex === position.marketIndex ? (
                      isConfirmingClose ? (
                        <span className="flex items-center gap-1">
                          <Icon icon="svg-spinners:ring-resize" height={10} />
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
