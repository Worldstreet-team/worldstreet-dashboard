'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: Date;
  side: 'buy' | 'sell';
}

interface MarketTradesProps {
  selectedPair: string;
}

export default function MarketTrades({ selectedPair }: MarketTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');

  useEffect(() => {
    // Generate mock trades
    generateMockTrades();
    const interval = setInterval(generateMockTrades, 3000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const generateMockTrades = () => {
    const basePrices: Record<string, number> = {
      'BTC-USDT': 43250,
      'ETH-USDT': 2280,
      'SOL-USDT': 98.5,
      'BNB-USDT': 315,
      'XRP-USDT': 0.52,
      'ADA-USDT': 0.48
    };

    const basePrice = basePrices[selectedPair] || 100;
    
    const newTrades: Trade[] = Array.from({ length: 20 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      price: basePrice + (Math.random() - 0.5) * basePrice * 0.001,
      amount: Math.random() * 2 + 0.01,
      time: new Date(Date.now() - i * 1000),
      side: Math.random() > 0.5 ? 'buy' : 'sell'
    }));

    setTrades(newTrades);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(4);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-darkgray">
      {/* Tabs */}
      <div className="flex border-b border-border dark:border-darkborder">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'market'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-dark dark:hover:text-white'
          }`}
        >
          Market Trades
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'my'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-dark dark:hover:text-white'
          }`}
        >
          My Trades
        </button>
      </div>

      {activeTab === 'market' ? (
        <>
          {/* Column Headers */}
          <div className="px-2 py-1 border-b border-border dark:border-darkborder grid grid-cols-3 gap-2 text-[9px] text-muted font-medium">
            <div className="text-left">Price(USDT)</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Time</div>
          </div>

          {/* Trades List */}
          <div className="flex-1 overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="px-2 py-0.5 hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
              >
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className={`font-semibold ${
                    trade.side === 'buy' ? 'text-success' : 'text-error'
                  }`}>
                    {formatPrice(trade.price)}
                  </div>
                  <div className="text-right text-dark dark:text-white">
                    {formatAmount(trade.amount)}
                  </div>
                  <div className="text-right text-muted">
                    {formatTime(trade.time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Icon icon="ph:swap" className="mx-auto mb-2 text-muted" width={24} />
            <p className="text-xs text-muted">No trades yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
