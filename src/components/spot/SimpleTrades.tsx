'use client';

import { useHyperliquidTrades } from '@/hooks/useSimpleHyperliquid';
import { Icon } from '@iconify/react';

interface SimpleTradesProps {
  symbol: string;
  className?: string;
}

export default function SimpleTrades({ symbol, className = '' }: SimpleTradesProps) {
  const { trades, loading, error, refetch } = useHyperliquidTrades(symbol, !!symbol);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
        <span className="ml-2 text-sm text-muted">Loading trades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <Icon icon="ph:warning" className="text-error mb-2" width={24} />
        <span className="text-sm text-error mb-2">{error}</span>
        <button
          onClick={refetch}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <span className="text-sm text-muted">No recent trades</span>
      </div>
    );
  }

  const formatPrice = (price: string) => parseFloat(price).toFixed(2);
  const formatSize = (size: string) => parseFloat(size).toFixed(4);
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  return (
    <div className={`bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <h3 className="text-sm font-medium text-dark dark:text-white">
          Recent Trades - {symbol}
        </h3>
        <button
          onClick={refetch}
          className="p-1 hover:bg-muted/20 rounded"
        >
          <Icon icon="ph:arrow-clockwise" width={14} className="text-muted" />
        </button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs text-muted font-medium border-b border-border dark:border-darkborder">
        <div className="text-left">Price</div>
        <div className="text-right">Size</div>
        <div className="text-center">Side</div>
        <div className="text-right">Time</div>
      </div>

      {/* Trades Data */}
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-0.5 p-2">
          {trades.slice(0, 50).map((trade: any, index: number) => (
            <div key={`trade-${index}`} className="grid grid-cols-4 gap-2 text-xs py-0.5 hover:bg-muted/10">
              <div className={`text-left font-mono ${trade.side === 'B' ? 'text-success' : 'text-error'
                }`}>
                {formatPrice(trade.px)}
              </div>
              <div className="text-right text-dark dark:text-white font-mono">
                {formatSize(trade.sz)}
              </div>
              <div className="text-center">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${trade.side === 'B'
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                  }`}>
                  {trade.side === 'B' ? 'BUY' : 'SELL'}
                </span>
              </div>
              <div className="text-right text-muted font-mono">
                {formatTime(trade.time)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border dark:border-darkborder bg-muted/5">
        <div className="text-xs text-muted text-center">
          WorldStreet • {trades.length} recent trades
        </div>
      </div>
    </div>
  );
}