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

// Map trading pairs to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  'BTC-USDT': 'bitcoin',
  'ETH-USDT': 'ethereum',
  'BNB-USDT': 'binancecoin',
  'SOL-USDT': 'solana',
  'XRP-USDT': 'ripple',
  'ADA-USDT': 'cardano'
};

export default function MarketTicker({ selectedPair, onSelectPair }: MarketTickerProps) {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tradingPairs = [
    'BTC-USDT',
    'ETH-USDT',
    'BNB-USDT',
    'SOL-USDT',
    'XRP-USDT',
    'ADA-USDT'
  ];

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const coinIds = Object.values(COINGECKO_IDS).join(',');
        
        // CoinGecko free API endpoint
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }

        const data = await response.json();

        const updatedTickers: TickerData[] = tradingPairs.map(pair => {
          const coinId = COINGECKO_IDS[pair];
          const coinData = data[coinId];

          return {
            symbol: pair,
            price: coinData?.usd || 0,
            change24h: coinData?.usd_24h_change || 0,
            volume24h: coinData?.usd_24h_vol || 0
          };
        });

        setTickers(updatedTickers);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching ticker data:', err);
        setError('Failed to fetch prices');
        setLoading(false);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 20000); // Poll every 20 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Market Ticker</h3>
        </div>
        <div className="animate-pulse flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 w-36 bg-muted/20 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Market Ticker</h3>
        </div>
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error} - Retrying...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-2">
          <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Market Ticker</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          <Icon icon="ph:arrow-clockwise" className="animate-spin-slow" width={14} />
          <span>Live prices via CoinGecko</span>
        </div>
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
                    maximumFractionDigits: ticker.price < 1 ? 4 : 2 
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
                  Vol: ${ticker.volume24h >= 1000000000 
                    ? (ticker.volume24h / 1000000000).toFixed(2) + 'B'
                    : (ticker.volume24h / 1000000).toFixed(2) + 'M'
                  }
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
