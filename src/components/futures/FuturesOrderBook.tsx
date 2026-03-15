"use client";

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depthPercent: number;
}

interface FuturesOrderBookProps {
  symbol: string;
}

export default function FuturesOrderBook({ symbol }: FuturesOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchOrderBook = async () => {
      try {
        setLoading(true);
        
        // Convert futures symbol to Gate.io format
        // BTC-PERP -> BTC_USDT, ANIME-PERP -> ANIME_USDT
        const cleanBase = symbol.replace('-PERP', '').replace(/[-_/]/g, '').replace(/(USDT|USDC|USD)$/, '').toUpperCase();
        const normalizedSymbol = `${cleanBase}_USDT`;
        
        const response = await fetch(`/api/orderbook?symbol=${normalizedSymbol}`);
        const data = await response.json();

        if (data.success && data.data) {
          const { bids: rawBids, asks: rawAsks } = data.data;

          const processEntries = (entries: any[], isAsk: boolean) => {
            let cumulativeTotal = 0;
            const processed = entries.slice(0, 20).map((entry: any) => {
              const price = parseFloat(entry[0]);
              const amount = parseFloat(entry[1]);
              const total = price * amount;
              cumulativeTotal += total;
              return { price, amount, total, depthPercent: 0 };
            });

            processed.forEach((entry, idx) => {
              const prevTotal = processed.slice(0, idx + 1).reduce((sum, e) => sum + e.total, 0);
              entry.depthPercent = (prevTotal / cumulativeTotal) * 100;
            });

            return processed;
          };

          const processedAsks = processEntries(rawAsks, true).reverse();
          const processedBids = processEntries(rawBids, false);

          setAsks(processedAsks);
          setBids(processedBids);
          if (processedBids.length > 0) setLastPrice(processedBids[0].price);
          setLoading(false);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch orderbook');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [symbol]);

  const spread = useMemo(() => {
    if (asks.length > 0 && bids.length > 0) {
      return asks[asks.length - 1].price - bids[0].price;
    }
    return 0;
  }, [asks, bids]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1e2329] flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#848e9c] uppercase">Order Book</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[#848e9c]' : 'bg-[#0ecb81] animate-pulse'}`} />
          <span className="text-[10px] text-[#848e9c]">{symbol}</span>
        </div>
      </div>

      <div className="px-3 py-1 border-b border-[#1e2329] grid grid-cols-3 gap-2 text-[10px] text-[#848e9c] font-medium">
        <div className="text-left">Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col-reverse overflow-y-auto scrollbar-hide">
          {asks.map((ask, i) => (
            <div key={i} className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer">
              <div className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/10" style={{ width: `${ask.depthPercent}%` }} />
              <div className="relative grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="text-[#f6465d]">{formatPrice(ask.price)}</div>
                <div className="text-right text-white">{ask.amount.toFixed(4)}</div>
                <div className="text-right text-[#848e9c]">{ask.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-y border-[#1e2329] flex items-center justify-between bg-[#11161c]">
          <span className="text-sm font-bold font-mono text-[#0ecb81]">{formatPrice(lastPrice)}</span>
          <span className="text-[9px] text-[#848e9c]">Spread: {formatPrice(spread)}</span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {bids.map((bid, i) => (
            <div key={i} className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer">
              <div className="absolute right-0 top-0 bottom-0 bg-[#0ecb81]/10" style={{ width: `${bid.depthPercent}%` }} />
              <div className="relative grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="text-[#0ecb81]">{formatPrice(bid.price)}</div>
                <div className="text-right text-white">{bid.amount.toFixed(4)}</div>
                <div className="text-right text-[#848e9c]">{bid.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
