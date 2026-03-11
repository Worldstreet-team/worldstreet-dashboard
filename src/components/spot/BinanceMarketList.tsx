'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useDrift, type PerpMarketInfo } from '@/app/context/driftContext';

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
  marketIndex?: number; // Drift market index
}

interface BinanceMarketListProps {
  selectedPair: string;
  onSelectPair: (pair: string, chain?: Chain, tokenAddress?: string) => void;
}

export default function BinanceMarketList({ selectedPair, onSelectPair }: BinanceMarketListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { perpMarkets, getMarketPrice, isClientReady } = useDrift();

  // Fetch market data from API route
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        setError(null);

        let finalMarkets: MarketData[] = [];

        // If Drift is ready, build market list from Drift PERP markets (for futures trading)
        if (isClientReady && perpMarkets.size > 0) {
          console.log('[BinanceMarketList] Building market list from', perpMarkets.size, 'Drift perp markets');

          perpMarkets.forEach((info: PerpMarketInfo, index: number) => {
            const driftPrice = getMarketPrice(index, 'perp');

            finalMarkets.push({
              symbol: info.symbol, // Already includes -PERP suffix
              baseAsset: info.baseAssetSymbol,
              quoteAsset: 'USDT',
              price: driftPrice || 0,
              change24h: 0, // Drift doesn't provide 24h change
              volume24h: 0, // Drift doesn't provide volume
              high24h: 0,
              low24h: 0,
              chain: 'solana',
              marketIndex: index,
            });
          });

          console.log('[BinanceMarketList] Built', finalMarkets.length, 'perp markets from Drift');
        } else {
          console.log('[BinanceMarketList] Drift not ready yet, showing empty list');
        }

        setMarkets(finalMarkets);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();

    // Refresh every 10 seconds to update prices
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, [isClientReady, perpMarkets, getMarketPrice]);

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
    return `${(vol / 1e3).toFixed(2)}K`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      {/* Search Bar */}
      <div className="p-4 border-b border-[#1e2329] shrink-0">
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
            placeholder="Search markets..."
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
            <p className="text-sm text-[#848e9c]">Loading markets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <Icon icon="ph:warning-circle" className="mx-auto mb-3 text-[#f6465d]" width={40} />
            <p className="text-sm text-[#f6465d] mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
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
                  onClick={() => onSelectPair(market.symbol, market.chain, market.mintAddress)}
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
                          {market.chain && (
                            <Icon
                              icon={
                                market.chain === 'solana'
                                  ? 'cryptocurrency:sol'
                                  : market.chain === 'ethereum'
                                    ? 'cryptocurrency:eth'
                                    : 'cryptocurrency:btc'
                              }
                              width={12}
                              className="flex-shrink-0"
                            />
                          )}
                          {market.baseAsset}<span className="text-[#848e9c]">/{market.quoteAsset}</span>
                        </div>
                        <div className="text-[10px] text-[#848e9c]">
                          Vol {formatVolume(market.volume24h)}
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
                      <div className={`text-xs font-semibold px-2.5 py-1 rounded ${isPositive ? 'bg-[rgba(14,203,129,0.12)] text-[#0ecb81]' : 'bg-[rgba(246,70,93,0.12)] text-[#f6465d]'
                        }`}>
                        {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
