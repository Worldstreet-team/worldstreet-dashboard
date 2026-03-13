'use client';

import { useHyperliquidOrderbook } from '@/hooks/useSimpleHyperliquid';
import { Icon } from '@iconify/react';

interface SimpleOrderBookProps {
  symbol: string;
  className?: string;
}

export default function SimpleOrderBook({ symbol, className = '' }: SimpleOrderBookProps) {
  const { orderbook, loading, error, refetch } = useHyperliquidOrderbook(symbol, !!symbol);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
        <span className="ml-2 text-sm text-muted">Loading orderbook...</span>
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

  if (!orderbook || !orderbook.levels) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <span className="text-sm text-muted">No orderbook data</span>
      </div>
    );
  }

  // Separate bids and asks
  const bids = orderbook.levels.filter((level: any) => parseFloat(level.sz) > 0 && level.side === 'B');
  const asks = orderbook.levels.filter((level: any) => parseFloat(level.sz) > 0 && level.side === 'A');

  const formatPrice = (price: string) => parseFloat(price).toFixed(2);
  const formatSize = (size: string) => parseFloat(size).toFixed(4);

  return (
    <div className={`bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <h3 className="text-sm font-medium text-dark dark:text-white">
          Order Book - {symbol}
        </h3>
        <button
          onClick={refetch}
          className="p-1 hover:bg-muted/20 rounded"
        >
          <Icon icon="ph:arrow-clockwise" width={14} className="text-muted" />
        </button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs text-muted font-medium border-b border-border dark:border-darkborder">
        <div className="text-left">Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Data */}
      <div className="max-h-96 overflow-y-auto">
        {/* Asks (Sell Orders) */}
        <div className="space-y-0.5 p-2">
          {asks.slice(0, 10).reverse().map((ask: any, index: number) => (
            <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-xs py-0.5">
              <div className="text-left text-error font-mono">
                {formatPrice(ask.px)}
              </div>
              <div className="text-right text-dark dark:text-white font-mono">
                {formatSize(ask.sz)}
              </div>
              <div className="text-right text-muted font-mono">
                {(parseFloat(ask.px) * parseFloat(ask.sz)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="px-3 py-2 border-y border-border dark:border-darkborder bg-muted/10">
          <div className="text-xs text-center text-muted">
            Spread: {bids.length > 0 && asks.length > 0 
              ? (parseFloat(asks[0]?.px || '0') - parseFloat(bids[0]?.px || '0')).toFixed(2)
              : '--'
            }
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="space-y-0.5 p-2">
          {bids.slice(0, 10).map((bid: any, index: number) => (
            <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-xs py-0.5">
              <div className="text-left text-success font-mono">
                {formatPrice(bid.px)}
              </div>
              <div className="text-right text-dark dark:text-white font-mono">
                {formatSize(bid.sz)}
              </div>
              <div className="text-right text-muted font-mono">
                {(parseFloat(bid.px) * parseFloat(bid.sz)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border dark:border-darkborder bg-muted/5">
        <div className="text-xs text-muted text-center">
          Hyperliquid • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}