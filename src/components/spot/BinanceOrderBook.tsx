'use client';

/**
 * BinanceOrderBook Component
 * 
 * Real-time order book display using Binance REST API with polling
 * - Polls /api/binance/orderbook every 3 seconds
 * - Fetches order book data from Binance
 * - Displays top 15 bids and asks with depth visualization
 * - Handles errors and connection status
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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

interface BinanceOrderBookData {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
  error?: string;
}

// Polling configuration
const POLLING_INTERVAL = 3000; // 3 seconds

export default function BinanceOrderBook({ selectedPair }: BinanceOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'both' | 'asks' | 'bids'>('both');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for polling management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activePairRef = useRef<string>(selectedPair);
  const isMountedRef = useRef<boolean>(true);

  // Convert pair format (BTC-USDT -> BTCUSDT)
  const formatSymbol = (pair: string): string => {
    return pair.replace('-', '');
  };

  // Fetch order book data from API
  const fetchOrderBook = useCallback(async (pair: string) => {
    try {
      const symbol = formatSymbol(pair);
      const response = await fetch(`/api/binance/orderbook?symbol=${symbol}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: BinanceOrderBookData = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Only update if still mounted and pair hasn't changed
      if (!isMountedRef.current || activePairRef.current !== pair) {
        return;
      }

      // Process bids (buy orders) - take top 15, sorted highest to lowest
      const processedBids: OrderBookEntry[] = [];
      let bidCumulativeTotal = 0;
      
      const sortedBids = [...data.bids]
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .slice(0, 15);
      
      for (const [priceStr, amountStr] of sortedBids) {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        const total = price * amount;
        bidCumulativeTotal += total;
        processedBids.push({ price, amount, total, depthPercent: 0 });
      }
      
      // Calculate depth percentages for bids
      processedBids.forEach((bid, idx) => {
        const cumulativeToThis = processedBids.slice(0, idx + 1).reduce((sum, b) => sum + b.total, 0);
        bid.depthPercent = bidCumulativeTotal > 0 ? (cumulativeToThis / bidCumulativeTotal) * 100 : 0;
      });
      
      // Process asks (sell orders) - take top 15, sorted lowest to highest
      const processedAsks: OrderBookEntry[] = [];
      let askCumulativeTotal = 0;
      
      const sortedAsks = [...data.asks]
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .slice(0, 15);
      
      for (const [priceStr, amountStr] of sortedAsks) {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        const total = price * amount;
        askCumulativeTotal += total;
        processedAsks.push({ price, amount, total, depthPercent: 0 });
      }
      
      // Reverse asks for display and calculate depth
      processedAsks.reverse();
      processedAsks.forEach((ask, idx) => {
        const cumulativeToThis = processedAsks.slice(idx).reduce((sum, a) => sum + a.total, 0);
        ask.depthPercent = askCumulativeTotal > 0 ? (cumulativeToThis / askCumulativeTotal) * 100 : 0;
      });
      
      setAsks(processedAsks);
      setBids(processedBids);
      
      // Update last price (best bid)
      if (processedBids.length > 0) {
        setLastPrice(prev => {
          const newLastPrice = processedBids[0].price;
          const change = prev > 0 ? ((newLastPrice - prev) / prev) * 100 : 0;
          setPriceChange(change);
          return newLastPrice;
        });
      }
      
      setConnected(true);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('[OrderBook] Error fetching data:', err);
      
      if (isMountedRef.current && activePairRef.current === pair) {
        setConnected(false);
        setError(err instanceof Error ? err.message : 'Failed to fetch order book');
        setLoading(false);
      }
    }
  }, []);

  // Start polling
  const startPolling = useCallback((pair: string) => {
    console.log('[OrderBook] Starting polling for pair:', pair);
    
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Fetch immediately
    fetchOrderBook(pair);

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchOrderBook(pair);
    }, POLLING_INTERVAL);
  }, [fetchOrderBook]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('[OrderBook] Stopping polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('[OrderBook] Pair changed to:', selectedPair);
    
    // Update active pair ref
    activePairRef.current = selectedPair;
    isMountedRef.current = true;

    // Reset state
    setAsks([]);
    setBids([]);
    setLastPrice(0);
    setPriceChange(0);
    setConnected(false);
    setLoading(true);
    setError(null);

    // Start polling for new pair
    startPolling(selectedPair);
    
    return () => {
      console.log('[OrderBook] Cleanup');
      isMountedRef.current = false;
      stopPolling();
    };
  }, [selectedPair, startPolling, stopPolling]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(4);
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
                  key={`ask-${ask.price}-${index}`}
                  className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group"
                >
                  {/* Depth bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(246,70,93,0.12)]"
                    style={{ width: `${ask.depthPercent}%` }}
                  />
                  
                  {/* Content */}
                  <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="text-[#f6465d] font-medium">{formatPrice(ask.price)}</div>
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
                  key={`bid-${bid.price}-${index}`}
                  className="relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer group"
                >
                  {/* Depth bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[rgba(14,203,129,0.12)]"
                    style={{ width: `${bid.depthPercent}%` }}
                  />
                  
                  {/* Content */}
                  <div className="relative grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="text-[#0ecb81] font-medium">{formatPrice(bid.price)}</div>
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
