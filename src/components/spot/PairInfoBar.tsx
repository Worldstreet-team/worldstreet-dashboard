'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface PairInfoBarProps {
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

export default function PairInfoBar({ selectedPair, onSelectPair }: PairInfoBarProps) {
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [allTickers, setAllTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPairSelector, setShowPairSelector] = useState(false);

  const tradingPairs = Object.keys(COINGECKO_IDS);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update selected pair data when selection changes
    const selected = allTickers.find(t => t.symbol === selectedPair);
    if (selected) {
      setTickerData(selected);
    }
  }, [selectedPair, allTickers]);

  const fetchTickers = async () => {
    try {
      const coinIds = Object.values(COINGECKO_IDS).join(',');
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24hr_high=true&include_24hr_low=true`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch prices');

      const data = await response.json();

      const tickers: TickerData[] = tradingPairs.map(pair => {
        const coinId = COINGECKO_IDS[pair];
        const coinData = data[coinId];

        return {
          symbol: pair,
          price: coinData?.usd || 0,
          change24h: coinData?.usd_24h_change || 0,
          high24h: coinData?.usd_24h_high || 0,
          low24h: coinData?.usd_24h_low || 0,
          volume24h: coinData?.usd_24h_vol || 0
        };
      });

      setAllTickers(tickers);
      
      // Set initial selected pair data
      const selected = tickers.find(t => t.symbol === selectedPair);
      if (selected) {
        setTickerData(selected);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching ticker data:', err);
      setLoading(false);
    }
  };

  const formatVolume = (vol: number): string => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
    return `$${vol.toFixed(2)}`;
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  if (loading || !tickerData) {
    return (
      <div className="bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
        <div className="px-3 py-2 flex items-center gap-4">
          <div className="h-6 w-32 bg-muted/20 rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isPositive = tickerData.change24h >= 0;

  return (
    <div className="bg-white dark:bg-darkgray border-b border-border dark:border-darkborder relative">
      <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {/* Pair Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPairSelector(!showPairSelector)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
          >
            <span className="font-bold text-dark dark:text-white text-sm">
              {selectedPair.replace('-', '/')}
            </span>
            <Icon 
              icon={showPairSelector ? "ph:caret-up" : "ph:caret-down"} 
              width={14} 
              className="text-muted" 
            />
          </button>

          {/* Dropdown */}
          {showPairSelector && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowPairSelector(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded shadow-lg z-20 min-w-[200px]">
                {allTickers.map((ticker) => (
                  <button
                    key={ticker.symbol}
                    onClick={() => {
                      onSelectPair(ticker.symbol);
                      setShowPairSelector(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-muted/20 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
                      ticker.symbol === selectedPair ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-dark dark:text-white">
                      {ticker.symbol.replace('-', '/')}
                    </span>
                    <span className={`text-xs font-semibold ${
                      ticker.change24h >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-border dark:bg-darkborder mx-1" />

        {/* Current Price */}
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-bold font-mono ${
            isPositive ? 'text-success' : 'text-error'
          }`}>
            ${formatPrice(tickerData.price)}
          </span>
          <span className={`text-xs font-semibold ${
            isPositive ? 'text-success' : 'text-error'
          }`}>
            {isPositive ? '+' : ''}{tickerData.change24h.toFixed(2)}%
          </span>
        </div>

        <div className="w-px h-4 bg-border dark:bg-darkborder mx-1" />

        {/* 24h High */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted leading-none">24h High</span>
          <span className="text-xs font-semibold text-dark dark:text-white font-mono">
            ${formatPrice(tickerData.high24h)}
          </span>
        </div>

        <div className="w-px h-4 bg-border dark:bg-darkborder mx-1" />

        {/* 24h Low */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted leading-none">24h Low</span>
          <span className="text-xs font-semibold text-dark dark:text-white font-mono">
            ${formatPrice(tickerData.low24h)}
          </span>
        </div>

        <div className="w-px h-4 bg-border dark:bg-darkborder mx-1" />

        {/* 24h Volume */}
        <div className="flex flex-col">
          <span className="text-[10px] text-muted leading-none">24h Volume</span>
          <span className="text-xs font-semibold text-dark dark:text-white font-mono">
            {formatVolume(tickerData.volume24h)}
          </span>
        </div>

        {/* Live Indicator */}
        <div className="ml-auto flex items-center gap-1 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-muted">Live</span>
        </div>
      </div>
    </div>
  );
}
