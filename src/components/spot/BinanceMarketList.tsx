'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';

interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

interface BinanceMarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

// Mock market data
const MARKET_DATA: MarketData[] = [
  { symbol: 'BTC-USDT', baseAsset: 'BTC', quoteAsset: 'USDT', price: 69201.46, change24h: 3.34, volume24h: 28500000000, high24h: 70000, low24h: 68000 },
  { symbol: 'ETH-USDT', baseAsset: 'ETH', quoteAsset: 'USDT', price: 3842.15, change24h: 2.18, volume24h: 15200000000, high24h: 3900, low24h: 3750 },
  { symbol: 'SOL-USDT', baseAsset: 'SOL', quoteAsset: 'USDT', price: 198.73, change24h: -1.25, volume24h: 1200000000, high24h: 205, low24h: 195 },
  { symbol: 'BNB-USDT', baseAsset: 'BNB', quoteAsset: 'USDT', price: 615.20, change24h: 1.85, volume24h: 850000000, high24h: 625, low24h: 605 },
  { symbol: 'XRP-USDT', baseAsset: 'XRP', quoteAsset: 'USDT', price: 2.42, change24h: -2.12, volume24h: 620000000, high24h: 2.50, low24h: 2.35 },
  { symbol: 'ADA-USDT', baseAsset: 'ADA', quoteAsset: 'USDT', price: 1.08, change24h: 4.21, volume24h: 450000000, high24h: 1.12, low24h: 1.02 },
];

export default function BinanceMarketList({ selectedPair, onSelectPair }: BinanceMarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'favorites' | 'spot' | 'margin'>('spot');
  const [selectedQuote, setSelectedQuote] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'pair' | 'price' | 'change'>('change');

  const filteredMarkets = useMemo(() => {
    let markets = MARKET_DATA.filter(market => {
      const matchesSearch = searchQuery === '' || 
        market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesQuote = market.quoteAsset === selectedQuote;
      const matchesFavorites = selectedTab !== 'favorites' || favorites.has(market.symbol);
      
      return matchesSearch && matchesQuote && matchesFavorites;
    });

    // Sort markets
    markets.sort((a, b) => {
      if (sortBy === 'change') return Math.abs(b.change24h) - Math.abs(a.change24h);
      if (sortBy === 'price') return b.price - a.price;
      return a.baseAsset.localeCompare(b.baseAsset);
    });

    return markets;
  }, [searchQuery, selectedQuote, selectedTab, favorites, sortBy]);

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(symbol)) {
        newFavorites.delete(symbol);
      } else {
        newFavorites.add(symbol);
      }
      return newFavorites;
    });
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatVolume = (vol: number): string => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    return `${(vol / 1e3).toFixed(2)}K`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      {/* Search Bar */}
      <div className="p-3 border-b border-[#1e2329]">
        <div className="relative">
          <Icon 
            icon="ph:magnifying-glass" 
            width={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848e9c]" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e2329] px-3">
        {(['favorites', 'spot', 'margin'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              selectedTab === tab
                ? 'border-[#f0b90b] text-white'
                : 'border-transparent text-[#848e9c] hover:text-white'
            }`}
          >
            {tab === 'favorites' && <Icon icon="ph:star" width={12} className="inline mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Quote Tabs */}
      <div className="flex border-b border-[#1e2329] px-3 gap-2 py-2">
        {(['USDT', 'BTC', 'ETH'] as const).map((quote) => (
          <button
            key={quote}
            onClick={() => setSelectedQuote(quote)}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              selectedQuote === quote
                ? 'bg-[#1e2329] text-white'
                : 'text-[#848e9c] hover:text-white'
            }`}
          >
            {quote}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="px-3 py-2 border-b border-[#1e2329] grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] text-[#848e9c] font-medium">
        <button onClick={() => setSortBy('pair')} className="text-left hover:text-white flex items-center gap-1">
          Pair
          {sortBy === 'pair' && <Icon icon="ph:caret-down" width={10} />}
        </button>
        <button onClick={() => setSortBy('price')} className="text-right hover:text-white flex items-center justify-end gap-1">
          Last Price
          {sortBy === 'price' && <Icon icon="ph:caret-down" width={10} />}
        </button>
        <button onClick={() => setSortBy('change')} className="text-right hover:text-white flex items-center justify-end gap-1">
          Change
          {sortBy === 'change' && <Icon icon="ph:caret-down" width={10} />}
        </button>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredMarkets.length === 0 ? (
          <div className="p-6 text-center">
            <Icon icon="ph:magnifying-glass" className="mx-auto mb-2 text-[#848e9c]" width={32} />
            <p className="text-xs text-[#848e9c]">No markets found</p>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isSelected = market.symbol === selectedPair;
            const isPositive = market.change24h >= 0;
            const isFav = favorites.has(market.symbol);

            return (
              <div
                key={market.symbol}
                onClick={() => onSelectPair(market.symbol)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#1e2329]'
                    : 'hover:bg-[#1e2329]'
                }`}
              >
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  {/* Pair */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(market.symbol);
                      }}
                      className="flex-shrink-0"
                    >
                      <Icon
                        icon={isFav ? 'ph:star-fill' : 'ph:star'}
                        width={12}
                        className={isFav ? 'text-[#f0b90b]' : 'text-[#848e9c] hover:text-[#f0b90b]'}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white">
                        {market.baseAsset}<span className="text-[#848e9c]">/{market.quoteAsset}</span>
                      </div>
                      <div className="text-[9px] text-[#848e9c]">
                        Vol {formatVolume(market.volume24h)}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xs font-mono text-white">
                      {formatPrice(market.price)}
                    </div>
                  </div>

                  {/* Change */}
                  <div className="text-right min-w-[60px]">
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isPositive ? 'bg-[rgba(14,203,129,0.12)] text-[#0ecb81]' : 'bg-[rgba(246,70,93,0.12)] text-[#f6465d]'
                    }`}>
                      {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
