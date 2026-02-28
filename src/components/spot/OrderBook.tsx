'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  selectedPair: string;
}

export default function OrderBook({ selectedPair }: OrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    // Generate mock order book data
    // In production, this would fetch from a real order book API
    generateMockOrderBook();
    
    const interval = setInterval(generateMockOrderBook, 2000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const generateMockOrderBook = () => {
    // Base price from pair (mock)
    const basePrices: Record<string, number> = {
      'BTC-USDT': 43250,
      'ETH-USDT': 2280,
      'SOL-USDT': 98.5,
      'BNB-USDT': 315,
      'XRP-USDT': 0.52,
      'ADA-USDT': 0.48
    };

    const basePrice = basePrices[selectedPair] || 100;
    const spread = basePrice * 0.0002; // 0.02% spread

    // Generate asks (sell orders) - prices above current
    const newAsks: OrderBookEntry[] = [];
    for (let i = 10; i >= 1; i--) {
      const price = basePrice + spread + (i * basePrice * 0.0001);
      const amount = Math.random() * 5 + 0.1;
      const total = price * amount;
      newAsks.push({ price, amount, total });
    }

    // Generate bids (buy orders) - prices below current
    const newBids: OrderBookEntry[]= [];
    for (let i = 1; i <= 10; i++) {
      const price = basePrice - spread - (i * basePrice * 0.0001);
      const amount = Math.random() * 5 + 0.1;
      const total = price * amount;
      newBids.push({ price, amount, total });
    }

    setAsks(newAsks);
    setBids(newBids);
    
    // Set last price (mid-market)
    const newLastPrice = basePrice + (Math.random() - 0.5) * spread;
    const change = lastPrice > 0 ? ((newLastPrice - lastPrice) / lastPrice) * 100 : 0;
    
    setLastPrice(newLastPrice);
    setPriceChange(change);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(4);
  };

  const getVolumePercentage = (total: number, maxTotal: number): number => {
    return (total / maxTotal) * 100;
  };

  const maxAskTotal = Math.max(...asks.map(a => a.total), 1);
  const maxBidTotal = Math.max(...bids.map(b => b.total), 1);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-darkgray border-r border-border dark:border-darkborder relative z-10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border dark:border-darkborder flex items-center justify-between">
        <span className="text-xs font-semibold text-dark dark:text-white">Order Book</span>
        <button className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors">
          <Icon icon="ph:gear" width={14} className="text-muted" />
        </button>
      </div>

      {/* Column Headers */}
      <div className="px-3 py-1 border-b border-border dark:border-darkborder grid grid-cols-3 gap-2 text-[10px] text-muted font-medium">
        <div className="text-left">Price(USDT)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (Sell Orders) - Red */}
        <div className="flex-1 overflow-y-auto flex flex-col-reverse">
          {asks.map((ask, index) => {
            const volumePercent = getVolumePercentage(ask.total, maxAskTotal);
            return (
              <div
                key={`ask-${index}`}
                className="relative px-3 py-0.5 hover:bg-error/5 cursor-pointer group"
              >
                {/* Volume bar background */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-error/10"
                  style={{ width: `${volumePercent}%` }}
                />
                
                {/* Content */}
                <div className="relative grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="text-error font-semibold">{formatPrice(ask.price)}</div>
                  <div className="text-right text-dark dark:text-white">{formatAmount(ask.amount)}</div>
                  <div className="text-right text-muted">{ask.total.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Last Price */}
        <div className={`px-3 py-2 border-y border-border dark:border-darkborder flex items-center justify-between ${
          priceChange >= 0 ? 'bg-success/5' : 'bg-error/5'
        }`}>
          <div className="flex items-center gap-2">
            <Icon 
              icon={priceChange >= 0 ? "ph:arrow-up" : "ph:arrow-down"} 
              width={14} 
              className={priceChange >= 0 ? 'text-success' : 'text-error'}
            />
            <span className={`text-sm font-bold font-mono ${
              priceChange >= 0 ? 'text-success' : 'text-error'
            }`}>
              {formatPrice(lastPrice)}
            </span>
          </div>
          <span className="text-xs text-muted">
            ≈ ${lastPrice.toFixed(2)}
          </span>
        </div>

        {/* Bids (Buy Orders) - Green */}
        <div className="flex-1 overflow-y-auto">
          {bids.map((bid, index) => {
            const volumePercent = getVolumePercentage(bid.total, maxBidTotal);
            return (
              <div
                key={`bid-${index}`}
                className="relative px-3 py-0.5 hover:bg-success/5 cursor-pointer group"
              >
                {/* Volume bar background */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-success/10"
                  style={{ width: `${volumePercent}%` }}
                />
                
                {/* Content */}
                <div className="relative grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="text-success font-semibold">{formatPrice(bid.price)}</div>
                  <div className="text-right text-dark dark:text-white">{formatAmount(bid.amount)}</div>
                  <div className="text-right text-muted">{bid.total.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-border dark:border-darkborder">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted">Spread:</span>
          <span className="text-dark dark:text-white font-mono">
            {asks.length > 0 && bids.length > 0 
              ? ((asks[asks.length - 1].price - bids[0].price) / bids[0].price * 100).toFixed(3)
              : '0.000'}%
          </span>
        </div>
      </div>
    </div>
  );
}
