'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  network: 'SPL'; // All Drift markets are on Solana
  isFavorite?: boolean;
  marketIndex: number; // Drift market index
}

interface MarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

export default function MarketList({ selectedPair, onSelectPair }: MarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<'USDT' | 'USDC' | 'ALL'>('USDT');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [markets, setMarkets] = useState<MarketData[]>([]);

  const { spotMarkets, getMarketPrice, isClientReady } = useDrift();

  // Build market list from Drift spot markets
  useEffect(() => {
    if (!isClientReady || spotMarkets.size === 0) return;

    const marketList: MarketData[] = [];

    spotMarkets.forEach((info, index) => {
      // Skip stablecoins as base assets (they're quote assets)
      const isStablecoin = ['USDC', 'USDT', 'USDS', 'PYUSD', 'USDe', 'USDY', 'AUSD', 'EURC'].includes(info.symbol);
      
      // Only skip if they're in pool 0 (primary pool)
      // Pool-specific versions (like USDC-1, USDC-4) should be included
      if (isStablecoin && !info.symbol.includes('-')) {
        return;
      }

      const baseSymbol = info.symbol.split('-')[0]; // Handle pool-specific symbols
      const price = getMarketPrice(index, 'spot');

      // Create market entry with USDT as quote (Drift uses USDC but we show as USDT for consistency)
      marketList.push({
        symbol: `${info.symbol}-USDT`,
        baseAsset: info.symbol,
        quoteAsset: 'USDT',
        price: price || 0,
        change24h: 0, // Drift doesn't provide 24h change
        volume24h: 0, // Drift doesn't provide volume
        network: 'SPL',
        marketIndex: index,
      });
    });

    setMarkets(marketList);
  }, [isClientReady, spotMarkets, getMarketPrice]);

  // Filter markets based on search, quote
  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      // Quote filter
      const matchesQuote = selectedQuote === 'ALL' || market.quoteAsset === selectedQuote;

      return matchesSearch && matchesQuote;
    });
  }, [markets, searchQuery, selectedQuote]);

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
    <div className="h-full flex flex-col bg-white dark:bg-darkgray border-l border-border dark:border-darkborder">
      {/* Search Bar */}
      <div className="p-2 border-b border-border dark:border-darkborder">
        <div className="relative">
          <Icon 
            icon="ph:magnifying-glass" 
            width={14} 
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets"
            className="w-full pl-7 pr-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Quote Tabs */}
      <div className="flex border-b border-border dark:border-darkborder">
        {(['USDT', 'USDC', 'ALL'] as const).map((quote) => (
          <button
            key={quote}
            onClick={() => setSelectedQuote(quote)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
              selectedQuote === quote
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-dark dark:hover:text-white'
            }`}
          >
            {quote}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="px-2 py-1 border-b border-border dark:border-darkborder grid grid-cols-[1fr_auto_auto] gap-2 text-[9px] text-muted font-medium">
        <div className="text-left">Pair</div>
        <div className="text-right">Price</div>
        <div className="text-right">Network</div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto">
        {!isClientReady ? (
          <div className="p-4 text-center">
            <Icon icon="ph:spinner" className="mx-auto mb-2 text-muted animate-spin" width={24} />
            <p className="text-xs text-muted">Loading markets...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="p-4 text-center">
            <Icon icon="ph:magnifying-glass" className="mx-auto mb-2 text-muted" width={24} />
            <p className="text-xs text-muted">No markets found</p>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isSelected = market.symbol === selectedPair;
            const isFav = favorites.has(market.symbol);

            return (
              <div
                key={market.symbol}
                onClick={() => onSelectPair(market.symbol)}
                className={`px-2 py-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border-l-2 border-primary'
                    : 'hover:bg-muted/20 dark:hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  {/* Pair + Network */}
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(market.symbol);
                      }}
                      className="flex-shrink-0"
                    >
                      <Icon
                        icon={isFav ? 'ph:star-fill' : 'ph:star'}
                        width={10}
                        className={isFav ? 'text-warning' : 'text-muted hover:text-warning'}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-dark dark:text-white truncate">
                          {market.baseAsset}
                        </span>
                        <span className="text-[9px] text-muted">/{market.quoteAsset}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Icon icon="cryptocurrency:sol" width={8} className="text-purple-500" />
                        <span className="text-[8px] text-muted">Drift #{market.marketIndex}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xs font-mono text-dark dark:text-white">
                      {market.price > 0 ? formatPrice(market.price) : '-'}
                    </div>
                  </div>

                  {/* Network Badge */}
                  <div className="text-right">
                    <Icon icon="cryptocurrency:sol" width={14} className="text-purple-500" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Network Filter Info */}
      <div className="px-2 py-1.5 border-t border-border dark:border-darkborder bg-muted/20 dark:bg-white/5">
        <div className="flex items-center gap-1 text-[9px] text-muted">
          <Icon icon="ph:info" width={10} />
          <span>Drift Protocol • {markets.length} Solana markets</span>
        </div>
      </div>
    </div>
  );
}
