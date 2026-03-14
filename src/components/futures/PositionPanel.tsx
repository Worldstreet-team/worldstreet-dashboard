"use client";

import React, { useEffect, useState } from 'react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';
import { Icon } from '@iconify/react';

export const PositionPanel: React.FC = () => {
  const { positions, refreshPositions, refreshSummary, isLoading, closePosition } = useHyperliquid();
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const { isPolling: isConfirmingClose, startPostActionPolling } = usePostActionPolling();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPositions();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  const handleClose = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close ${symbol} position?`)) return;

    setClosingSymbol(symbol);
    try {
      const result = await closePosition(symbol);

      if (!result.success) {
        throw new Error(result.error || 'Failed to close position');
      }

      startPostActionPolling({
        checkCondition: async () => {
          await refreshSummary();
          await refreshPositions();
          return !positions.some(p => p.position.coin === symbol);
        },
        onSuccess: () => {
          setClosingSymbol(null);
        },
        onTimeout: () => {
          setClosingSymbol(null);
          alert('Position close is taking longer than expected. Please check your positions.');
        },
        maxAttempts: 15,
        interval: 1000,
      });
    } catch (error) {
      console.error('Close error:', error);
      alert((error as Error).message || 'Failed to close position');
      setClosingSymbol(null);
    }
  };

  if (isLoading && positions.length === 0) {
    return (
      <div className="bg-[#0b0e11] h-full flex flex-col items-center justify-center">
        <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535] mb-2" height={28} />
        <p className="text-[#848e9c] text-[11px]">Loading positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-[#0b0e11] h-full flex flex-col items-center justify-center">
        <Icon icon="ph:chart-line" className="text-[#848e9c] mb-3" height={28} />
        <p className="text-[#848e9c] text-[11px]">No open positions</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e11] h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2329]">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-medium text-[#848e9c] uppercase">Open Positions</h3>
          <span className="px-2 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535] text-[10px] font-bold">
            {positions.length}
          </span>
        </div>
        <button
          onClick={() => { refreshSummary(); refreshPositions(); }}
          className="p-1.5 hover:bg-[#2b3139] rounded transition-all"
        >
          <Icon icon="ph:arrow-clockwise" className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`} width={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-[#161a1e] sticky top-0">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-[#848e9c] uppercase">Market</th>
              <th className="text-right py-2 px-3 font-medium text-[#848e9c] uppercase">Size</th>
              <th className="text-right py-2 px-3 font-medium text-[#848e9c] uppercase">Entry Price</th>
              <th className="text-right py-2 px-3 font-medium text-[#848e9c] uppercase">Unrealized PnL</th>
              <th className="text-center py-2 px-3 font-medium text-[#848e9c] uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2329]">
            {positions.map((p, idx) => {
              const pos = p.position;
              const isLong = parseFloat(pos.szi) > 0;
              const pnl = parseFloat(pos.unrealizedPnl);
              
              return (
                <tr key={idx} className="hover:bg-[#1f2329] transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-white uppercase">{pos.coin}</span>
                      <span className={`text-[9px] font-bold ${isLong ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {isLong ? 'LONG' : 'SHORT'} {pos.leverage.value}x
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-white font-mono">
                    {Math.abs(parseFloat(pos.szi)).toFixed(4)}
                  </td>
                  <td className="py-3 px-3 text-right text-white font-mono">
                    ${parseFloat(pos.entryPx).toFixed(2)}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold font-mono ${pnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleClose(pos.coin)}
                      disabled={closingSymbol === pos.coin || isConfirmingClose}
                      className="px-3 py-1 bg-[#f6465d]/10 text-[#f6465d] hover:bg-[#f6465d]/20 rounded text-[10px] font-bold disabled:opacity-50"
                    >
                      {closingSymbol === pos.coin ? 'Closing...' : 'CLOSE'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
