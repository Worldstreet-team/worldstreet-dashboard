'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface MarketTickerProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

export default function MarketTicker({ selectedPair, onSelectPair }: MarketTickerProps) {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);

  const tradingPairs = [
    'BTC-USDT',
    'ETH-USDT',
    'BNB-USDT',
    'SOL-USDT',
    'XRP-USDT',
    'ADA-USDT'
  ];

  useEffect(() => {
    // Simulate fetching ticker data
    const fetchTickers = () => {
      const mockTickers: TickerData[] = tradingPairs.map(pair => ({
        symbol: pair,
        price: Math.random() * 50000 + 1000,
        change24h: (Math.random() - 0.5) * 10,
        volume24h: Math.random() * 1000000000
      }));
      setTickers(mockTickers);
      setLoading(false);
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-4">
        <div className="animate-pulse flex gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 w-32 bg-muted/20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border dark:border-darkborder">
        <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
        <h3 className="font-semibold text-dark dark:text-white">Market Ticker</h3>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex gap-2 p-4 min-w-max">
          {tickers.map((ticker) => (
            <button
              key={ticker.symbol}
              onClick={() => onSelectPair(ticker.symbol)}
              className={`flex-shrink-0 p-4 rounded-xl border transition-all hover:scale-105 ${
                selectedPair === ticker.symbol
                  ? 'bg-primary/10 border-primary dark:border-primary'
                  : 'bg-muted/5 border-border dark:border-darkborder hover:border-primary/50'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-dark dark:text-white text-sm">
                    {ticker.symbol.split('-')[0]}
                  </span>
                  <span className="text-xs text-muted">
                    /{ticker.symbol.split('-')[1]}
                  </span>
                </div>
                
                <div className="font-mono text-lg font-bold text-dark dark:text-white mb-1">
                  ${ticker.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
                
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  ticker.change24h >= 0 ? 'text-success' : 'text-error'
                }`}>
                  <Icon 
                    icon={ticker.change24h >= 0 ? 'ph:arrow-up' : 'ph:arrow-down'} 
                    width={14} 
                  />
                  <span>{Math.abs(ticker.change24h).toFixed(2)}%</span>
                </div>
                
                <div className="text-xs text-muted mt-1">
                  Vol: ${(ticker.volume24h / 1000000).toFixed(2)}M
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
