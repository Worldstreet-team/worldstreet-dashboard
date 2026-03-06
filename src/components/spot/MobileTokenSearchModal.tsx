'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

type Chain = 'solana' | 'ethereum' | 'bitcoin';

interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  chain?: Chain;
  mintAddress?: string;
  logoURI?: string;
}

interface MobileTokenSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPair: (pair: string, chain?: Chain, tokenAddress?: string) => void;
  selectedPair: string;
}

export default function MobileTokenSearchModal({
  isOpen,
  onClose,
  onSelectPair,
  selectedPair,
}: MobileTokenSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<Chain | 'all'>('all');
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchMarkets();
    }
  }, [isOpen]);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kucoin/markets');
      const data = await response.json();

      if (data.success) {
        setMarkets(data.data);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = searchQuery === '' || 
      market.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain = selectedChain === 'all' || market.chain === selectedChain;
    
    return matchesSearch && matchesChain && market.quoteAsset === 'USDT';
  });

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

  const handleSelectPair = (market: MarketData) => {
    onSelectPair(market.symbol, market.chain, market.mintAddress);
    onClose();
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#181a20]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
        <h2 className="text-lg font-semibold text-white">Search Tokens</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#2b3139] rounded-lg transition-colors"
        >
          <Icon icon="ph:x" width={24} className="text-[#848e9c]" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-[#2b3139]">
        <div className="relative">
          <Icon 
            icon="ph:magnifying-glass" 
            width={20} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848e9c]" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search token name or symbol..."
            className="w-full pl-10 pr-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
            autoFocus
          />
        </div>
      </div>

      {/* Chain Filter */}
      <div className="flex gap-2 px-4 py-3 border-b border-[#2b3139] overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedChain('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            selectedChain === 'all'
              ? 'bg-[#fcd535] text-[#181a20]'
              : 'bg-[#2b3139] text-[#848e9c]'
          }`}
        >
          All Chains
        </button>
        {(['solana', 'ethereum', 'bitcoin'] as const).map((chain) => (
          <button
            key={chain}
            onClick={() => setSelectedChain(chain)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              selectedChain === chain
                ? 'bg-[#fcd535] text-[#181a20]'
                : 'bg-[#2b3139] text-[#848e9c]'
            }`}
          >
            {chain === 'solana' && <Icon icon="cryptocurrency:sol" width={14} />}
            {chain === 'ethereum' && <Icon icon="cryptocurrency:eth" width={14} />}
            {chain === 'bitcoin' && <Icon icon="cryptocurrency:btc" width={14} />}
            {chain.charAt(0).toUpperCase() + chain.slice(1)}
          </button>
        ))}
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="ph:spinner" className="text-[#fcd535] animate-spin" width={32} />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Icon icon="ph:magnifying-glass" className="text-[#848e9c] mb-3" width={48} />
            <p className="text-sm text-[#848e9c]">No tokens found</p>
            <p className="text-xs text-[#848e9c] mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2b3139]">
            {filteredMarkets.map((market) => {
              const isSelected = market.symbol === selectedPair;
              const isPositive = market.change24h >= 0;
              const isFav = favorites.has(market.symbol);

              return (
                <button
                  key={market.symbol}
                  onClick={() => handleSelectPair(market)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-[#2b3139]' : 'hover:bg-[#2b3139]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(market.symbol);
                        }}
                        className="flex-shrink-0"
                      >
                        <Icon
                          icon={isFav ? 'ph:star-fill' : 'ph:star'}
                          width={16}
                          className={isFav ? 'text-[#fcd535]' : 'text-[#848e9c]'}
                        />
                      </button>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {market.chain && (
                          <Icon
                            icon={
                              market.chain === 'solana'
                                ? 'cryptocurrency:sol'
                                : market.chain === 'ethereum'
                                ? 'cryptocurrency:eth'
                                : 'cryptocurrency:btc'
                            }
                            width={16}
                            className="flex-shrink-0"
                          />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {market.baseAsset}
                        </span>
                        <span className="text-xs text-[#848e9c]">/USDT</span>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      isPositive ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
                    }`}>
                      {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-mono">${formatPrice(market.price)}</span>
                    <span className="text-[#848e9c]">
                      Vol {market.volume24h >= 1e6 ? `${(market.volume24h / 1e6).toFixed(2)}M` : `${(market.volume24h / 1e3).toFixed(2)}K`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
