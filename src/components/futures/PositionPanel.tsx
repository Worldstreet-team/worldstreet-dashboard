"use client";

import React, { useState } from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

export const PositionPanel: React.FC = () => {
  const { positions, selectedChain } = useFuturesStore();
  const [closingPosition, setClosingPosition] = useState<string | null>(null);

  const handleClose = async (positionId: string) => {
    if (!confirm('Are you sure you want to close this position?')) return;

    setClosingPosition(positionId);
    try {
      const response = await fetch('/api/futures/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: selectedChain,
          positionId,
        }),
      });

      if (response.ok) {
        alert('Position closed successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to close position');
      }
    } catch (error) {
      console.error('Close error:', error);
      alert('Failed to close position');
    } finally {
      setClosingPosition(null);
    }
  };

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
      <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Open Positions</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-darkborder">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Market</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Side</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Size</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Entry</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Mark</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">PnL</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Leverage</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Liq. Price</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Margin Ratio</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted dark:text-darklink">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} className="border-b border-border dark:border-darkborder hover:bg-gray-50 dark:hover:bg-dark">
                <td className="py-3 px-2 text-sm font-medium text-dark dark:text-white">{position.market}</td>
                <td className="py-3 px-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    position.side === 'long' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-error/10 text-error'
                  }`}>
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">{position.size.toFixed(4)}</td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">${position.entryPrice.toFixed(2)}</td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">${position.markPrice.toFixed(2)}</td>
                <td className={`py-3 px-2 text-sm text-right font-semibold ${
                  position.unrealizedPnL >= 0 ? 'text-success' : 'text-error'
                }`}>
                  {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-sm text-right text-dark dark:text-white">{position.leverage}x</td>
                <td className="py-3 px-2 text-sm text-right text-error">${position.liquidationPrice.toFixed(2)}</td>
                <td className={`py-3 px-2 text-sm text-right font-medium ${
                  position.marginRatio < 0.2 ? 'text-error' : 'text-dark dark:text-white'
                }`}>
                  {(position.marginRatio * 100).toFixed(2)}%
                </td>
                <td className="py-3 px-2 text-center">
                  <button
                    onClick={() => handleClose(position.id)}
                    disabled={closingPosition === position.id}
                    className="px-3 py-1 rounded text-xs font-medium bg-error/10 text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {closingPosition === position.id ? 'Closing...' : 'Close'}
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
