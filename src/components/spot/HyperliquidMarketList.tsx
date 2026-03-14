'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquidMarkets, type HyperliquidMarket } from '@/hooks/useHyperliquidMarkets';

type Chain = 'solana' | 'ethereum' | 'bitcoin';

interface HyperliquidMarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string, chain?: Chain, tokenAddress?: string) => void;
  includeStats?: boolean;
}

export default function HyperliquidMarketList({
  selectedPair,
  onSelectPair,
  includeStats = false
}: HyperliquidMarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { markets, loading, error, refetch, lastUpdated } = useHyperliquidMarkets({
    includeStats,
    refreshInterval: 10000, // 10 seconds
    enabled: true
  });

  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      const matchesSearch = searchQuery === '' ||
        market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [markets, searchQuery]);

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
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e2329] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Icon icon="cryptocurrency:eth" width={16} />
            Spot
          </h3>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-[#848e9c]">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={refetch}
              className="p-1 hover:bg-[#1e2329] rounded"
              disabled={loading}
            >
              <Icon
                icon="ph:arrow-clockwise"
                width={14}
                className={`text-[#848e9c] ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Icon
            icon="ph:magnifying-glass"
            width={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848e9c]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Trading markets..."
            className="w-full pl-10 pr-3 py-2.5 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="px-4 py-3 border-b border-[#1e2329] grid grid-cols-[1fr_auto_auto] gap-4 text-xs text-[#848e9c] font-medium shrink-0">
        <div className="text-left">Pair</div>
        <div className="text-right">Last Price</div>
        <div className="text-right">Change</div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="p-8 text-center">
            <Icon icon="ph:spinner" className="mx-auto mb-3 text-[#848e9c] animate-spin" width={40} />
            <p className="text-sm text-[#848e9c]">Loading Trading markets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <Icon icon="ph:warning-circle" className="mx-auto mb-3 text-[#f6465d]" width={40} />
            <p className="text-sm text-[#f6465d] mb-3">{error}</p>
            <button
              onClick={refetch}
              className="text-sm text-[#f0b90b] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="p-8 text-center">
            <Icon icon="ph:magnifying-glass" className="mx-auto mb-3 text-[#848e9c]" width={40} />
            <p className="text-sm text-[#848e9c]">No markets found</p>
          </div>
        ) : (
          <>
            {filteredMarkets.map((market) => {
              const isSelected = market.symbol === selectedPair;
              const isPositive = market.change24h >= 0;
              const isFav = favorites.has(market.symbol);

              return (
                <div
                  key={market.symbol}
                  onClick={() => onSelectPair(market.symbol, 'ethereum')}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-[#1e2329]/50 ${isSelected
                    ? 'bg-[#1e2329]'
                    : 'hover:bg-[#1e2329]'
                    }`}
                >
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                    {/* Pair */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(market.symbol);
                        }}
                        className="flex-shrink-0"
                      >
                        <Icon
                          icon={isFav ? 'ph:star-fill' : 'ph:star'}
                          width={14}
                          className={isFav ? 'text-[#f0b90b]' : 'text-[#848e9c] hover:text-[#f0b90b]'}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white flex items-center gap-1.5 mb-0.5">
                          <Icon
                            icon="cryptocurrency:eth"
                            width={12}
                            className="flex-shrink-0"
                          />
                          {market.baseAsset}<span className="text-[#848e9c]">/{market.quoteAsset}</span>
                        </div>
                        <div className="text-[10px] text-[#848e9c] flex items-center gap-2">
                          {includeStats && (
                            <span>Vol {formatVolume(market.volume24h)}</span>
                          )}
                          <span>Max {market.maxLeverage}x</span>
                          {market.onlyIsolated && (
                            <span className="text-[#f0b90b]">ISO</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm font-mono text-white">
                        {formatPrice(market.price)}
                      </div>
                    </div>

                    {/* Change */}
                    <div className="text-right min-w-[70px]">
                      {includeStats ? (
                        <div className={`text-xs font-semibold px-2.5 py-1 rounded ${isPositive ? 'bg-[rgba(14,203,129,0.12)] text-[#0ecb81]' : 'bg-[rgba(246,70,93,0.12)] text-[#f6465d]'
                          }`}>
                          {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-xs text-[#848e9c] px-2.5 py-1">
                          --
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-[#1e2329] shrink-0">
        <div className="text-xs text-[#848e9c] flex items-center justify-between">
          <span>{filteredMarkets.length} markets</span>
          <span className="flex items-center gap-1">
            <Icon icon="cryptocurrency:eth" width={12} />
            Ethereum
          </span>
        </div>
      </div>
    </div>
  );
}