'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depthPercent: number;
}

interface BinanceOrderBookProps {
  selectedPair: string;
}

export default function BinanceOrderBook({ selectedPair }: BinanceOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'both' | 'asks' | 'bids'>('both');

  useEffect(() => {
    generateMockOrderBook();
    const interval = setInterval(generateMockOrderBook, 2000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const generateMockOrderBook = () => {
    const basePrices: Record<string, number> = {
      'BTC-USDT': 69201.46,
      'ETH-USDT': 3842.15,
      'SOL-USDT': 198.73,
    };

    const basePrice = basePrices[selectedPair] || 100;
    const spread = basePrice * 0.0002;

    // Generate asks (sell orders)
    const newAsks: OrderBookEntry[] = [];
    let askCumulativeTotal = 0;
    for (let i = 15; i >= 1; i--) {
      const price = basePrice + spread + (i * basePrice * 0.0001);
      const amount = Math.random() * 2 + 0.1;
      const total = price * amount;
      askCumulativeTotal += total;
      newAsks.push({ price, amount, total, depthPercent: 0 });
    }

    // Calculate depth percentages for asks
    newAsks.forEach((ask, idx) => {
      const cumulativeToThis = newAsks.slice(idx).reduce((sum, a) => sum + a.total, 0);
      ask.depthPercent = (cumulativeToThis / askCumulativeTotal) * 100;
    });

    // Generate bids (buy orders)
    const newBids: OrderBookEntry[] = [];
    let bidCumulativeTotal = 0;
    for (let i = 1; i <= 15; i++) {
      const price = basePrice - spread - (i * basePrice * 0.0001);
      const amount = Math.random() * 2 + 0.1;
      const total = price * amount;
      bidCumulativeTotal += total;
      newBids.push({ price, amount, total, depthPercent: 0 });
    }

    // Calculate depth percentages for bids
    newBids.forEach((bid, idx) => {
      const cumulativeToThis = newBids.slice(0, idx + 1).reduce((sum, b) => sum + b.total, 0);
      bid.depthPercent = (cumulativeToThis / bidCumulativeTotal) * 100;
    });

    setAsks(newAsks);
    setBids(newBids);
    
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

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1e2329] flex items-center justify-between">
        <span className="text-xs font-medium text-[#848e9c]">Order Book</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('both')}
            className={`p-1 rounded ${viewMode === 'both' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:rows" width={14} className="text-[#848e9c]" />
          </button>
          <button 
            onClick={() => setViewMode('asks')}
            className={`p-1 rounded ${viewMode === 'asks' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:align-top" width={14} className="text-[#f6465d]" />
          </button>
          <button 
            onClick={() => setViewMode('bids')}
            className={`p-1 rounded ${viewMode === 'bids' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:align-bottom" width={14} className="text-[#0ecb81]" />
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="px-3 py-1 grid grid-cols-3 gap-2 text-[10px] text-[#848e9c] font-medium">
        <div className="text-left">Price(USDT)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Content */}
      <div className="flex flex-col">
        {/* Asks (Sell Orders) */}
        {(viewMode === 'both' || viewMode === 'asks') && (
          <div className="h-[38vh] overflow-y-auto flex flex-col-reverse scrollbar-hide">
            {asks.map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group"
              >
                {/* Depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-[rgba(246,70,93,0.12)]"
                  style={{ width: `${ask.depthPercent}%` }}
                />
                
                {/* Content */}
                <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="text-[#f6465d] font-medium">{formatPrice(ask.price)}</div>
                  <div className="text-right text-white">{formatAmount(ask.amount)}</div>
                  <div className="text-right text-[#848e9c] text-[10px]">{ask.total.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Last Price */}
        <div className="px-3 py-2 border-y border-[#1e2329] flex items-center justify-between bg-[#11161c]">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold font-mono ${priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {formatPrice(lastPrice)}
            </span>
            <Icon 
              icon={priceChange >= 0 ? "ph:arrow-up" : "ph:arrow-down"} 
              width={14} 
              className={priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}
            />
          </div>
          <span className="text-[10px] text-[#848e9c]">
            ≈ ${lastPrice.toFixed(2)}
          </span>
        </div>

        {/* Bids (Buy Orders) */}
        {(viewMode === 'both' || viewMode === 'bids') && (
          <div className="h-[38vh] overflow-y-auto scrollbar-hide">
            {bids.map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group"
              >
                {/* Depth bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-[rgba(14,203,129,0.12)]"
                  style={{ width: `${bid.depthPercent}%` }}
                />
                
                {/* Content */}
                <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="text-[#0ecb81] font-medium">{formatPrice(bid.price)}</div>
                  <div className="text-right text-white">{formatAmount(bid.amount)}</div>
                  <div className="text-right text-[#848e9c] text-[10px]">{bid.total.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
