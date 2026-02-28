'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (showPairSelector && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [showPairSelector]);

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

  // Render dropdown using Portal to escape stacking context
  const dropdownPortal = showPairSelector && typeof window !== 'undefined' ? createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998]" 
        onClick={() => setShowPairSelector(false)}
      />
      
      {/* Dropdown Menu */}
      <div 
        className="fixed bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded shadow-2xl z-[9999] min-w-[220px] max-h-[400px] overflow-y-auto"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`
        }}
      >
        {allTickers.map((ticker) => (
          <button
            key={ticker.symbol}
            onClick={() => {
              onSelectPair(ticker.symbol);
              setShowPairSelector(false);
            }}
            className={`w-full px-4 py-3 text-left hover:bg-muted/20 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
              ticker.symbol === selectedPair ? 'bg-primary/10' : ''
            }`}
          >
            <span className="text-base font-medium text-dark dark:text-white">
              {ticker.symbol.replace('-', '/')}
            </span>
            <span className={`text-sm font-semibold ${
              ticker.change24h >= 0 ? 'text-success' : 'text-error'
            }`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
      <div className="px-3 md:px-4 py-2 md:py-3 flex items-center gap-1 overflow-x-auto">
        {/* Pair Selector */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowPairSelector(!showPairSelector)}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
          >
            <span className="font-bold text-dark dark:text-white text-base md:text-sm">
              {selectedPair.replace('-', '/')}
            </span>
            <Icon 
              icon={showPairSelector ? "ph:caret-up" : "ph:caret-down"} 
              width={16} 
              className="text-muted" 
            />
          </button>

          {dropdownPortal}
        </div>

        <div className="w-px h-5 bg-border dark:bg-darkborder mx-1" />

        {/* Current Price */}
        <div className="flex items-baseline gap-2">
          <span className={`text-xl md:text-lg font-bold font-mono ${
            isPositive ? 'text-success' : 'text-error'
          }`}>
            ${formatPrice(tickerData.price)}
          </span>
          <span className={`text-sm md:text-xs font-semibold ${
            isPositive ? 'text-success' : 'text-error'
          }`}>
            {isPositive ? '+' : ''}{tickerData.change24h.toFixed(2)}%
          </span>
        </div>

        <div className="w-px h-5 bg-border dark:border-darkborder mx-1 hidden sm:block" />

        {/* 24h High - Hidden on very small screens */}
        <div className="hidden sm:flex flex-col">
          <span className="text-[11px] text-muted leading-none">24h High</span>
          <span className="text-sm font-semibold text-dark dark:text-white font-mono">
            ${formatPrice(tickerData.high24h)}
          </span>
        </div>

        <div className="w-px h-5 bg-border dark:bg-darkborder mx-1 hidden sm:block" />

        {/* 24h Low - Hidden on very small screens */}
        <div className="hidden sm:flex flex-col">
          <span className="text-[11px] text-muted leading-none">24h Low</span>
          <span className="text-sm font-semibold text-dark dark:text-white font-mono">
            ${formatPrice(tickerData.low24h)}
          </span>
        </div>

        <div className="w-px h-5 bg-border dark:bg-darkborder mx-1 hidden md:block" />

        {/* 24h Volume - Hidden on small screens */}
        <div className="hidden md:flex flex-col">
          <span className="text-[11px] text-muted leading-none">24h Volume</span>
          <span className="text-sm font-semibold text-dark dark:text-white font-mono">
            {formatVolume(tickerData.volume24h)}
          </span>
        </div>

        {/* Live Indicator */}
        <div className="ml-auto flex items-center gap-1.5 px-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted hidden sm:inline">Live</span>
        </div>
      </div>
    </div>
  );
}
