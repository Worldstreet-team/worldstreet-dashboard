'use client';

/**
 * MarketTrades Component
 * 
 * Displays recent market trades using KuCoin REST API
 * - Fetches from /api/v1/market/histories
 * - Updates every 3 seconds
 * - Shows price, amount, time, and side (buy/sell)
 * 
 * My Trades Tab:
 * - Shows Drift Protocol spot positions (all markets)
 * - Paginated display (10 per page)
 * - Real-time balance updates
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useDrift } from '@/app/context/driftContext';

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: Date;
  side: 'buy' | 'sell';
}

interface UserTrade {
  id: string;
  user_id: string;
  chain_from: string;
  chain_to: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  price: string;
  status: string;
  created_at: string;
}

interface MarketTradesProps {
  selectedPair: string;
}

interface KuCoinTrade {
  sequence: string;
  tradeId: string;
  price: string;
  size: string;
  side: 'buy' | 'sell';
  time: number;
}

export default function MarketTrades({ selectedPair }: MarketTradesProps) {
  const { user } = useAuth();
  const { spotPositions, summary, isClientReady, refreshPositions } = useDrift();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userTrades, setUserTrades] = useState<UserTrade[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');
  const [loading, setLoading] = useState(true);
  const [userTradesLoading, setUserTradesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination for My Trades (Drift positions)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Convert pair format: Replace USDC with USDT for KuCoin API
    const apiSymbol = selectedPair.replace('-USDC', '-USDT').replace('USDC', 'USDT');
    
    fetchTrades();
    const interval = setInterval(fetchTrades, 3000);
    return () => clearInterval(interval);
    
    async function fetchTrades() {
      try {
        const response = await fetch(
          `/api/kucoin/trades?symbol=${apiSymbol}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch trades');
        }

        const result = await response.json();

        if (result.code !== '200000' || !result.data) {
          throw new Error('Invalid response');
        }

        const kucoinTrades: KuCoinTrade[] = result.data;

        const formattedTrades: Trade[] = kucoinTrades.map((trade) => ({
          id: trade.tradeId,
          price: parseFloat(trade.price),
          amount: parseFloat(trade.size),
          time: new Date(trade.time / 1000000), // Convert nanoseconds to milliseconds
          side: trade.side
        }));

        setTrades(formattedTrades);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Failed to fetch trades');
        setLoading(false);
      }
    }
  }, [selectedPair]);

  // Fetch user trades when switching to "My Trades" tab
  useEffect(() => {
    if (activeTab === 'my' && user?.userId && isClientReady) {
      refreshPositions(); // Refresh Drift positions
      setCurrentPage(1); // Reset to first page
    }
  }, [activeTab, user?.userId, isClientReady, refreshPositions]);

  const fetchUserTrades = async () => {
    if (!user?.userId) return;
    
    setUserTradesLoading(true);
    try {
      const response = await fetch(`/api/trades/${user.userId}?status=COMPLETED&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user trades');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user trades');
      }

      setUserTrades(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching user trades:', err);
      setError('Failed to fetch your trades');
    } finally {
      setUserTradesLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      // Convert pair format: Replace USDC with USDT for KuCoin API
      const apiSymbol = selectedPair.replace('-USDC', '-USDT').replace('USDC', 'USDT');
      
      const response = await fetch(
        `/api/kucoin/trades?symbol=${apiSymbol}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const result = await response.json();

      if (result.code !== '200000' || !result.data) {
        throw new Error('Invalid response');
      }

      const kucoinTrades: KuCoinTrade[] = result.data;

      const formattedTrades: Trade[] = kucoinTrades.map((trade) => ({
        id: trade.tradeId,
        price: parseFloat(trade.price),
        amount: parseFloat(trade.size),
        time: new Date(trade.time / 1000000), // Convert nanoseconds to milliseconds
        side: trade.side
      }));

      setTrades(formattedTrades);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to fetch trades');
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(4);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#181a20] scrollbar-hide">
      {/* Tabs */}
      <div className="flex border-b border-[#2b3139]">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'market'
              ? 'border-[#fcd535] text-[#fcd535]'
              : 'border-transparent text-[#848e9c] hover:text-white'
          }`}
        >
          Market Trades
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
            activeTab === 'my'
              ? 'border-[#fcd535] text-[#fcd535]'
              : 'border-transparent text-[#848e9c] hover:text-white'
          }`}
        >
          My Trades
        </button>
      </div>

      {activeTab === 'market' ? (
        <>
          {/* Column Headers */}
          <div className="px-2 py-1 border-b border-[#2b3139] grid grid-cols-3 gap-2 text-[9px] text-[#848e9c] font-medium">
            <div className="text-left">Price(USDT)</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Time</div>
          </div>

          {/* Loading State */}
          {loading && trades.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon icon="ph:spinner" className="mx-auto mb-2 text-[#848e9c] animate-spin" width={24} />
                <p className="text-xs text-[#848e9c]">Loading trades...</p>
              </div>
            </div>
          ) : error && trades.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Icon icon="ph:warning" className="mx-auto mb-2 text-[#f6465d]" width={24} />
                <p className="text-xs text-[#f6465d]">{error}</p>
              </div>
            </div>
          ) : (
            /* Trades List */
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="px-2 py-0.5 hover:bg-[#2b3139]/50 transition-colors"
                >
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className={`font-semibold ${
                      trade.side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                    }`}>
                      {formatPrice(trade.price)}
                    </div>
                    <div className="text-right text-white">
                      {formatAmount(trade.amount)}
                    </div>
                    <div className="text-right text-[#848e9c]">
                      {formatTime(trade.time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Trades Tab - Show Drift Spot Positions */
        <>
          {/* Column Headers */}
          <div className="px-2 py-1 border-b border-[#2b3139] grid grid-cols-4 gap-2 text-[9px] text-[#848e9c] font-medium">
            <div className="text-left">Token</div>
            <div className="text-right">Balance</div>
            <div className="text-right">Price</div>
            <div className="text-right">Value</div>
          </div>

          {/* Loading State */}
          {!isClientReady ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon icon="ph:spinner" className="mx-auto mb-2 text-[#848e9c] animate-spin" width={24} />
                <p className="text-xs text-[#848e9c]">Loading positions...</p>
              </div>
            </div>
          ) : !user?.userId ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Icon icon="ph:user" className="mx-auto mb-2 text-[#848e9c]" width={24} />
                <p className="text-xs text-[#848e9c]">Sign in to view positions</p>
              </div>
            </div>
          ) : (() => {
            // Prepare all positions including USDC
            const allPositions = [];
            
            // Add USDC collateral
            if (summary?.freeCollateral) {
              allPositions.push({
                marketIndex: 0,
                marketName: 'USDC',
                amount: summary.freeCollateral,
                price: 1.00,
                value: summary.freeCollateral,
                balanceType: 'deposit',
                isCollateral: true,
              });
            }
            
            // Add all other spot positions
            spotPositions.forEach(pos => {
              if (pos.marketIndex === 0) return; // Skip USDC (already added)
              allPositions.push({
                ...pos,
                isCollateral: false,
              });
            });

            // Pagination
            const totalPages = Math.ceil(allPositions.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPositions = allPositions.slice(startIndex, endIndex);

            if (allPositions.length === 0) {
              return (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <Icon icon="ph:coins" className="mx-auto mb-2 text-[#848e9c]" width={24} />
                    <p className="text-xs text-[#848e9c]">No positions yet</p>
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Positions List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {currentPositions.map((position, index) => (
                    <div
                      key={`${position.marketIndex}-${index}`}
                      className="px-2 py-0.5 hover:bg-[#2b3139]/50 transition-colors"
                    >
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                        <div className="text-left flex items-center gap-1">
                          <span className="text-white truncate font-semibold">
                            {position.marketName}
                          </span>
                          {position.isCollateral && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535]">
                              COL
                            </span>
                          )}
                        </div>
                        <div className={`text-right ${
                          position.balanceType === 'deposit' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        }`}>
                          {position.amount.toFixed(4)}
                        </div>
                        <div className="text-right text-white">
                          ${position.price.toFixed(2)}
                        </div>
                        <div className="text-right text-[#848e9c]">
                          ${position.value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-2 py-1 border-t border-[#2b3139] flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="text-[9px] px-2 py-1 rounded bg-[#2b3139] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
                    >
                      <Icon icon="ph:caret-left" height={12} />
                    </button>
                    <span className="text-[9px] text-[#848e9c]">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="text-[9px] px-2 py-1 rounded bg-[#2b3139] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
                    >
                      <Icon icon="ph:caret-right" height={12} />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
