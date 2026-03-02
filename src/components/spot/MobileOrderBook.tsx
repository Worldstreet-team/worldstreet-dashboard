'use client';

import { useState, useEffect } from 'react';

interface OrderBookEntry {
  price: number;
  amount: number;
}

interface MobileOrderBookProps {
  selectedPair: string;
}

export default function MobileOrderBook({ selectedPair }: MobileOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(65526.20);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    generateMockOrderBook();
    const interval = setInterval(generateMockOrderBook, 2000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const generateMockOrderBook = () => {
    const basePrices: Record<string, number> = {
      'BTC-USDT': 65526,
      'ETH-USDT': 2280,
      'SOL-USDT': 98.5,
    };

    const basePrice = basePrices[selectedPair] || 100;
    const spread = basePrice * 0.0001;

    // Generate 5 asks (sell orders)
    const newAsks: OrderBookEntry[] = [];
    for (let i = 5; i >= 1; i--) {
      const price = basePrice + spread + (i * basePrice * 0.00005);
      const amount = Math.random() * 2 + 0.01;
      newAsks.push({ price, amount });
    }

    // Generate 5 bids (buy orders)
    const newBids: OrderBookEntry[] = [];
    for (let i = 1; i <= 5; i++) {
      const price = basePrice - spread - (i * basePrice * 0.00005);
      const amount = Math.random() * 2 + 0.01;
      newBids.push({ price, amount });
    }

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
    return amount.toFixed(6);
  };

  return (
    <div className="flex flex-col border-l border-border dark:border-darkborder px-2 py-2 bg-white dark:bg-darkgray h-full overflow-hidden">
      {/* Header Row */}
      <div className="flex justify-between text-[10px] text-muted font-medium mb-1 px-1">
        <span>Price(USDT)</span>
        <span>Amount(BTC)</span>
      </div>

      {/* Sell Orders (Red) - Scrollable */}
      <div className="flex flex-col-reverse overflow-y-auto flex-1">
        {asks.map((ask, index) => (
          <div
            key={`ask-${index}`}
            className="flex justify-between text-[10px] font-mono py-0.5 px-1 hover:bg-error/5"
          >
            <span className="text-error font-semibold">{formatPrice(ask.price)}</span>
            <span className="text-dark dark:text-white">{formatAmount(ask.amount)}</span>
          </div>
        ))}
      </div>

      {/* Current Price (Center Highlight) */}
      <div className="text-center py-2 border-y border-border dark:border-darkborder my-1">
        <div className={`text-lg font-semibold font-mono ${
          priceChange >= 0 ? 'text-success' : 'text-error'
        }`}>
          {formatPrice(lastPrice)}
        </div>
        <div className="text-[10px] text-muted mt-0.5">
          ≈ ${lastPrice.toFixed(2)}
        </div>
      </div>

      {/* Buy Orders (Green) - Scrollable */}
      <div className="flex flex-col overflow-y-auto flex-1">
        {bids.map((bid, index) => (
          <div
            key={`bid-${index}`}
            className="flex justify-between text-[10px] font-mono py-0.5 px-1 hover:bg-success/5"
          >
            <span className="text-success font-semibold">{formatPrice(bid.price)}</span>
            <span className="text-dark dark:text-white">{formatAmount(bid.amount)}</span>
          </div>
        ))}
      </div>

      {/* Depth Bar */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-[10px] text-success font-semibold">2.38%</span>
        <div className="relative flex-1 h-1 bg-muted/30 dark:bg-white/10 rounded overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 bg-success" style={{ width: '2.38%' }} />
          <div className="absolute right-0 top-0 bottom-0 bg-error" style={{ width: '97.62%' }} />
        </div>
        <span className="text-[10px] text-error font-semibold">97.62%</span>
      </div>
    </div>
  );
}
