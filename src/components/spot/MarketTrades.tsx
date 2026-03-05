'use client';

/**
 * MarketTrades Component
 * 
 * Displays recent market trades using KuCoin REST API
 * - Fetches from /api/v1/market/histories
 * - Updates every 3 seconds
 * - Shows price, amount, time, and side (buy/sell)
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: Date;
  side: 'buy' | 'sell';
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 3000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const fetchTrades = async () => {
    try {
      const response = await fetch(
        `/api/kucoin/trades?symbol=${selectedPair}`
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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Icon icon="ph:swap" className="mx-auto mb-2 text-[#848e9c]" width={24} />
            <p className="text-xs text-[#848e9c]">No trades yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
