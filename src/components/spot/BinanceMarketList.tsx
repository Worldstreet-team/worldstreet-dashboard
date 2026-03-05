'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';

type Chain = 'solana' | 'ethereum' | 'bitcoin';

interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  chain?: Chain;
  mintAddress?: string;
  logoURI?: string;
}

interface BinanceMarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

export default function BinanceMarketList({ selectedPair, onSelectPair }: BinanceMarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'favorites' | 'spot' | 'margin'>('spot');
  const [selectedQuote, setSelectedQuote] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [selectedChain, setSelectedChain] = useState<Chain | 'all'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'pair' | 'price' | 'change'>('change');
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch market data from API route
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/kucoin/markets');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch market data');
        }

        setMarkets(data.data);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    
    // Refresh every 3 minutes (180000ms)
    const interval = setInterval(fetchMarketData, 180000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = useMemo(() => {
    let filtered = markets.filter(market => {
      const matchesSearch = searchQuery === '' || 
        market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesQuote = market.quoteAsset === selectedQuote;
      const matchesFavorites = selectedTab !== 'favorites' || favorites.has(market.symbol);
      const matchesChain = selectedChain === 'all' || market.chain === selectedChain;
      
      return matchesSearch && matchesQuote && matchesFavorites && matchesChain;
    });

    // Sort markets
    filtered.sort((a, b) => {
      if (sortBy === 'change') return Math.abs(b.change24h) - Math.abs(a.change24h);
      if (sortBy === 'price') return b.price - a.price;
      return a.baseAsset.localeCompare(b.baseAsset);
    });

    return filtered;
  }, [markets, searchQuery, selectedQuote, selectedTab, selectedChain, favorites, sortBy]);

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
    <div className="h-full max-h-[calc(80vh-200px)] flex flex-col bg-[#0b0e11] text-white overflow-hidden">
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

      {/* Chain Filter */}
      <div className="flex border-b border-[#1e2329] px-3 gap-2 py-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedChain('all')}
          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
            selectedChain === 'all'
              ? 'bg-[#1e2329] text-white'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          All Chains
        </button>
        {(['solana', 'ethereum', 'bitcoin'] as const).map((chain) => (
          <button
            key={chain}
            onClick={() => setSelectedChain(chain)}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
              selectedChain === chain
                ? 'bg-[#1e2329] text-white'
                : 'text-[#848e9c] hover:text-white'
            }`}
          >
            {chain === 'solana' && <Icon icon="cryptocurrency:sol" width={12} />}
            {chain === 'ethereum' && <Icon icon="cryptocurrency:eth" width={12} />}
            {chain === 'bitcoin' && <Icon icon="cryptocurrency:btc" width={12} />}
            {chain.charAt(0).toUpperCase() + chain.slice(1)}
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
        {loading ? (
          <div className="p-6 text-center">
            <Icon icon="ph:spinner" className="mx-auto mb-2 text-[#848e9c] animate-spin" width={32} />
            <p className="text-xs text-[#848e9c]">Loading markets...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <Icon icon="ph:warning-circle" className="mx-auto mb-2 text-[#f6465d]" width={32} />
            <p className="text-xs text-[#f6465d] mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-[#f0b90b] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
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
                      <div className="text-xs font-medium text-white flex items-center gap-1">
                        {market.chain && (
                          <Icon
                            icon={
                              market.chain === 'solana'
                                ? 'cryptocurrency:sol'
                                : market.chain === 'ethereum'
                                ? 'cryptocurrency:eth'
                                : 'cryptocurrency:btc'
                            }
                            width={10}
                            className="flex-shrink-0"
                          />
                        )}
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
