"use client";

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquidFuturesMarkets } from '@/hooks/useHyperliquidFuturesMarkets';

interface FuturesMarketListProps {
  selectedMarketSymbol: string | null;
  onSelectMarket: (symbol: string) => void;
}

export default function FuturesMarketList({ selectedMarketSymbol, onSelectMarket }: FuturesMarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change'>('change');

  const { markets, loading, error } = useHyperliquidFuturesMarkets({
    enabled: true,
    refreshInterval: 180000 // 3 minutes
  });

  const filteredMarkets = useMemo(() => {
    let filtered = markets.filter(market => {
      const matchesSearch = searchQuery === '' ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort markets
    filtered.sort((a, b) => {
      if (sortBy === 'change') return b.price - a.price; // Sort by price since no change24h
      if (sortBy === 'price') return b.price - a.price;
      return a.symbol.localeCompare(b.symbol);
    });

    return filtered;
  }, [markets, searchQuery, sortBy]);

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
            placeholder="Search markets"
            className="w-full pl-9 pr-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
          />
        </div>
      </div>

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1e2329]">
        <h3 className="text-xs font-bold text-white uppercase">Futures</h3>
      </div>

      {/* Column Headers */}
      <div className="px-3 py-2 border-b border-[#1e2329] grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] text-[#848e9c] font-medium">
        <button onClick={() => setSortBy('symbol')} className="text-left hover:text-white flex items-center gap-1">
          Market
          {sortBy === 'symbol' && <Icon icon="ph:caret-down" width={10} />}
        </button>
        <button onClick={() => setSortBy('price')} className="text-right hover:text-white flex items-center justify-end gap-1">
          Mark Price
          {sortBy === 'price' && <Icon icon="ph:caret-down" width={10} />}
        </button>
        <button onClick={() => setSortBy('change')} className="text-right hover:text-white flex items-center justify-end gap-1">
          Leverage
          {sortBy === 'change' && <Icon icon="ph:caret-down" width={10} />}
        </button>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="p-6 text-center">
            <Icon icon="ph:spinner" className="mx-auto mb-2 text-[#848e9c] animate-spin" width={32} />
            <p className="text-xs text-[#848e9c]">Loading markets...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-xs text-error">{error}</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="p-6 text-center">
            <Icon icon="ph:magnifying-glass" className="mx-auto mb-2 text-[#848e9c]" width={32} />
            <p className="text-xs text-[#848e9c]">No markets found</p>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isSelected = market.symbol === selectedMarketSymbol;
            const isFav = favorites.has(market.symbol);

            return (
              <div
                key={market.symbol}
                onClick={() => onSelectMarket(market.symbol)}
                className={`px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'
                  }`}
              >
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
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
                        {market.symbol}
                      </div>
                      <div className="text-[9px] text-[#848e9c]">
                        {market.base}/{market.quote}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono text-white">
                      {formatPrice(market.price)}
                    </div>
                  </div>

                  <div className="text-right min-w-[60px]">
                    <div className="text-xs font-semibold text-[#848e9c]">
                      {market.maxLeverage ? `${market.maxLeverage}x` : 'N/A'}
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
