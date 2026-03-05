'use client';

/**
 * BinanceOrderBook Component
 * 
 * Real-time order book display using Gate.io REST API with polling
 * - Polls /api/orderbook every 3 seconds
 * - Fetches order book data from Gate.io
 * - Displays top 20 bids and asks with depth visualization
 * - Shows spread and last update time
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@iconify/react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depthPercent: number;
}

interface BinanceOrderBookProps {
  selectedPair: string;
}

interface GateIOOrderBookData {
  sequence: number;
  timestamp: number;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
}

const POLLING_INTERVAL = 3000;

export default function BinanceOrderBook({ selectedPair }: BinanceOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'both' | 'asks' | 'bids'>('both');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const formatSymbol = (pair: string): string => {
    return pair.replace('-', '_');
  };

  const fetchOrderBook = async (pair: string) => {
    try {
      const symbol = formatSymbol(pair);
      const response = await fetch(`/api/orderbook?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GateIOOrderBookData = await response.json();
      
      if (!isMountedRef.current) return;

      processOrderBookUpdate(data);
      setConnected(true);
      setLoading(false);
      setError(null);
      setLastUpdate(data.timestamp || Date.now());
    } catch (err) {
      console.error('[OrderBook] Error fetching data:', err);
      
      if (isMountedRef.current) {
        setConnected(false);
        setError(err instanceof Error ? err.message : 'Failed to fetch order book');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    setAsks([]);
    setBids([]);
    setLastPrice(0);
    setPriceChange(0);
    setConnected(false);
    setLoading(true);
    setError(null);

    fetchOrderBook(selectedPair);

    intervalRef.current = setInterval(() => {
      fetchOrderBook(selectedPair);
    }, POLLING_INTERVAL);
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedPair]);

  const processOrderBookUpdate = (data: GateIOOrderBookData) => {
    try {
      const processedAsks: OrderBookEntry[] = [];
      let askCumulativeTotal = 0;
      
      const sortedAsks = [...data.asks]
        .sort((a, b) => a.price - b.price)
        .slice(0, 20);
      
      for (const { price, size } of sortedAsks) {
        const total = price * size;
        askCumulativeTotal += total;
        processedAsks.push({ price, amount: size, total, depthPercent: 0 });
      }

      processedAsks.reverse();
      processedAsks.forEach((ask, idx) => {
        const cumulativeToThis = processedAsks.slice(idx).reduce((sum, a) => sum + a.total, 0);
        ask.depthPercent = askCumulativeTotal > 0 ? (cumulativeToThis / askCumulativeTotal) * 100 : 0;
      });

      const processedBids: OrderBookEntry[] = [];
      let bidCumulativeTotal = 0;
      
      const sortedBids = [...data.bids]
        .sort((a, b) => b.price - a.price)
        .slice(0, 20);
      
      for (const { price, size } of sortedBids) {
        const total = price * size;
        bidCumulativeTotal += total;
        processedBids.push({ price, amount: size, total, depthPercent: 0 });
      }

      processedBids.forEach((bid, idx) => {
        const cumulativeToThis = processedBids.slice(0, idx + 1).reduce((sum, b) => sum + b.total, 0);
        bid.depthPercent = bidCumulativeTotal > 0 ? (cumulativeToThis / bidCumulativeTotal) * 100 : 0;
      });

      setAsks(processedAsks);
      setBids(processedBids);

      if (processedBids.length > 0) {
        const newLastPrice = processedBids[0].price;
        const change = lastPrice > 0 ? ((newLastPrice - lastPrice) / lastPrice) * 100 : 0;
        setLastPrice(newLastPrice);
        setPriceChange(change);
      }
    } catch (error) {
      console.error('Error processing order book update:', error);
    }
  };

  const spread = useMemo(() => {
    if (asks.length > 0 && bids.length > 0) {
      return asks[asks.length - 1].price - bids[0].price;
    }
    return 0;
  }, [asks, bids]);

  const bestBid = useMemo(() => bids.length > 0 ? bids[0].price : 0, [bids]);
  const bestAsk = useMemo(() => asks.length > 0 ? asks[asks.length - 1].price : 0, [asks]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(4);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1e2329] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#848e9c]">Order Book</span>
          {loading ? (
            <div className="flex items-center gap-1">
              <Icon icon="ph:spinner" width={12} className="text-[#848e9c] animate-spin" />
              <span className="text-[10px] text-[#848e9c]">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f6465d]" />
              <span className="text-[10px] text-[#f6465d]">Error</span>
            </div>
          ) : connected ? (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
              <span className="text-[10px] text-[#0ecb81]">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#848e9c]" />
              <span className="text-[10px] text-[#848e9c]">Connecting...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('both')}
            className={`p-1 rounded ${viewMode === 'both' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:rows" width={14} className="text-[#848e9c]" />
          </button>
          <button 
            onClick={() => setViewMode('asks')}
            className={`p-1 rounded ${viewMode === 'asks' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:align-top" width={14} className="text-[#f6465d]" />
          </button>
          <button 
            onClick={() => setViewMode('bids')}
            className={`p-1 rounded ${viewMode === 'bids' ? 'bg-[#1e2329]' : 'hover:bg-[#1e2329]'}`}
          >
            <Icon icon="ph:align-bottom" width={14} className="text-[#0ecb81]" />
          </button>
        </div>
      </div>

      {/* Spread & Update Time */}
      {spread > 0 && (
        <div className="px-3 py-1 border-b border-[#1e2329] flex items-center justify-between text-[10px]">
          <div className="text-[#848e9c]">
            Spread: <span className="text-white">{formatPrice(spread)}</span>
          </div>
          {lastUpdate > 0 && (
            <div className="text-[#848e9c]">
              Updated: {formatTime(lastUpdate)}
            </div>
          )}
        </div>
      )}

      {/* Column Headers */}
      <div className="px-3 py-1 grid grid-cols-3 gap-2 text-[10px] text-[#848e9c] font-medium">
        <div className="text-left">Price(USDT)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Content */}
      <div className="flex flex-col">
        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 bg-[#f6465d]/10 border-b border-[#f6465d]/20">
            <div className="flex items-center gap-2 text-[10px] text-[#f6465d]">
              <Icon icon="ph:warning" width={14} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Asks (Sell Orders) */}
        {(viewMode === 'both' || viewMode === 'asks') && (
          <div className="h-[38vh] overflow-y-auto scrollbar-hide flex flex-col-reverse">
            {loading && asks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Icon icon="ph:spinner" width={24} className="text-[#848e9c] animate-spin" />
              </div>
            ) : asks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-[#848e9c]">No data</span>
              </div>
            ) : (
              asks.map((ask, index) => (
                <div
                  key={`ask-${index}`}
                  className={`relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group ${
                    ask.price === bestAsk ? 'bg-[rgba(246,70,93,0.15)]' : ''
                  }`}
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(246,70,93,0.12)]"
                    style={{ width: `${ask.depthPercent}%` }}
                  />
                  
                  <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className={`font-medium ${ask.price === bestAsk ? 'text-[#f6465d] font-bold' : 'text-[#f6465d]'}`}>
                      {formatPrice(ask.price)}
                    </div>
                    <div className="text-right text-white">{formatAmount(ask.amount)}</div>
                    <div className="text-right text-[#848e9c] text-[10px]">{ask.total.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Last Price */}
        <div className="px-3 py-2 border-y border-[#1e2329] flex items-center justify-between bg-[#11161c]">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold font-mono ${priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {formatPrice(lastPrice)}
            </span>
            <Icon 
              icon={priceChange >= 0 ? "ph:arrow-up" : "ph:arrow-down"} 
              width={14} 
              className={priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}
            />
          </div>
          <span className="text-[10px] text-[#848e9c]">
            ≈ ${lastPrice.toFixed(2)}
          </span>
        </div>

        {/* Bids (Buy Orders) */}
        {(viewMode === 'both' || viewMode === 'bids') && (
          <div className="h-[38vh] overflow-y-auto scrollbar-hide">
            {loading && bids.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Icon icon="ph:spinner" width={24} className="text-[#848e9c] animate-spin" />
              </div>
            ) : bids.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-[#848e9c]">No data</span>
              </div>
            ) : (
              bids.map((bid, index) => (
                <div
                  key={`bid-${index}`}
                  className={`relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group ${
                    bid.price === bestBid ? 'bg-[rgba(14,203,129,0.15)]' : ''
                  }`}
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(14,203,129,0.12)]"
                    style={{ width: `${bid.depthPercent}%` }}
                  />
                  
                  <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className={`font-medium ${bid.price === bestBid ? 'text-[#0ecb81] font-bold' : 'text-[#0ecb81]'}`}>
                      {formatPrice(bid.price)}
                    </div>
                    <div className="text-right text-white">{formatAmount(bid.amount)}</div>
                    <div className="text-right text-[#848e9c] text-[10px]">{bid.total.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
