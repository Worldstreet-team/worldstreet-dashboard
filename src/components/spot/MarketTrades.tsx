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
    <div className="h-full flex flex-col bg-[#181a20] scrollbar-hide">
      {/* Tabs */}
      <div className="flex border-b border-[#2b3139]">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'market'
              ? 'border-[#fcd535] text-[#fcd535]'
              : 'border-transparent text-[#848e9c] hover:text-white'
          }`}
        >
          Market Trades
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'my'
              ? 'border-[#fcd535] text-[#fcd535]'
              : 'border-transparent text-[#848e9c] hover:text-white'
          }`}
        >
          My Trades
        </button>
      </div>

      {activeTab === 'market' ? (
        <>
          {/* Column Headers */}
          <div className="px-2 py-1 border-b border-[#2b3139] grid grid-cols-3 gap-2 text-[9px] text-[#848e9c] font-medium">
            <div className="text-left">Price(USDT)</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Time</div>
          </div>

          {/* Trades List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="px-2 py-0.5 hover:bg-[#2b3139]/50 transition-colors"
              >
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className={`font-semibold ${
                    trade.side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                  }`}>
                    {formatPrice(trade.price)}
                  </div>
                  <div className="text-right text-white">
                    {formatAmount(trade.amount)}
                  </div>
                  <div className="text-right text-[#848e9c]">
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
            <Icon icon="ph:swap" className="mx-auto mb-2 text-[#848e9c]" width={24} />
            <p className="text-xs text-[#848e9c]">No trades yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
