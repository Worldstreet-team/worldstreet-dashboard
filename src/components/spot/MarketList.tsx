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
  network: 'ERC20' | 'SPL' | 'TRC20';
  isFavorite?: boolean;
}

interface MarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

// Mock market data with network information
const MARKET_DATA: MarketData[] = [
  { symbol: 'BTC-USDT', baseAsset: 'BTC', quoteAsset: 'USDT', price: 43250, change24h: 2.5, volume24h: 28500000000, network: 'ERC20' },
  { symbol: 'ETH-USDT', baseAsset: 'ETH', quoteAsset: 'USDT', price: 2280, change24h: 1.8, volume24h: 15200000000, network: 'ERC20' },
  { symbol: 'SOL-USDT', baseAsset: 'SOL', quoteAsset: 'USDT', price: 98.5, change24h: -0.5, volume24h: 1200000000, network: 'SPL' },
  { symbol: 'BNB-USDT', baseAsset: 'BNB', quoteAsset: 'USDT', price: 315, change24h: 0.8, volume24h: 850000000, network: 'ERC20' },
  { symbol: 'XRP-USDT', baseAsset: 'XRP', quoteAsset: 'USDT', price: 0.52, change24h: -1.2, volume24h: 620000000, network: 'ERC20' },
  { symbol: 'ADA-USDT', baseAsset: 'ADA', quoteAsset: 'USDT', price: 0.48, change24h: 3.1, volume24h: 450000000, network: 'ERC20' },
  { symbol: 'MATIC-USDT', baseAsset: 'MATIC', quoteAsset: 'USDT', price: 0.85, change24h: 1.5, volume24h: 380000000, network: 'ERC20' },
  { symbol: 'AVAX-USDT', baseAsset: 'AVAX', quoteAsset: 'USDT', price: 36.2, change24h: -2.1, volume24h: 290000000, network: 'ERC20' },
];

export default function MarketList({ selectedPair, onSelectPair }: MarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<'USDT' | 'USDC' | 'ALL'>('USDT');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter markets based on search, quote, and network (ERC20, SPL, TRC20 only)
  const filteredMarkets = useMemo(() => {
    return MARKET_DATA.filter(market => {
      // Network filter - only show ERC20, SPL, TRC20
      const validNetworks: Array<'ERC20' | 'SPL' | 'TRC20'> = ['ERC20', 'SPL', 'TRC20'];
      if (!validNetworks.includes(market.network)) {
        return false;
      }

      // Search filter
      const matchesSearch = searchQuery === '' || 
        market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      // Quote filter
      const matchesQuote = selectedQuote === 'ALL' || market.quoteAsset === selectedQuote;

      return matchesSearch && matchesQuote;
    });
  }, [searchQuery, selectedQuote]);

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

  const getNetworkBadge = (network: string) => {
    const badges = {
      'ERC20': { icon: 'cryptocurrency:eth', color: 'text-blue-500' },
      'SPL': { icon: 'cryptocurrency:sol', color: 'text-purple-500' },
      'TRC20': { icon: 'simple-icons:tron', color: 'text-red-500' },
    };
    return badges[network as keyof typeof badges] || badges['ERC20'];
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
            placeholder="Search"
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
        <div className="text-right">Change</div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMarkets.length === 0 ? (
          <div className="p-4 text-center">
            <Icon icon="ph:magnifying-glass" className="mx-auto mb-2 text-muted" width={24} />
            <p className="text-xs text-muted">No markets found</p>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isSelected = market.symbol === selectedPair;
            const isPositive = market.change24h >= 0;
            const isFav = favorites.has(market.symbol);
            const networkBadge = getNetworkBadge(market.network);

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
                        <Icon icon={networkBadge.icon} width={8} className={networkBadge.color} />
                        <span className="text-[8px] text-muted">{market.network}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xs font-mono text-dark dark:text-white">
                      {formatPrice(market.price)}
                    </div>
                    <div className="text-[8px] text-muted">
                      {formatVolume(market.volume24h)}
                    </div>
                  </div>

                  {/* Change */}
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${
                      isPositive ? 'text-success' : 'text-error'
                    }`}>
                      {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                    </span>
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
          <span>Showing ETH, SOL, TRC networks only</span>
        </div>
      </div>
    </div>
  );
}
