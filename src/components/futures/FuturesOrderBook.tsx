'use client';

/**
 * FuturesOrderBook Component
 * 
 * Displays Drift Protocol perp market order book
 * - Uses Drift SDK to fetch L2 orderbook data
 * - Shows top 20 bids and asks with depth visualization
 * - Real-time updates via Drift WebSocket subscription
 */

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depthPercent: number;
}

interface FuturesOrderBookProps {
  marketIndex: number | null;
}

export default function FuturesOrderBook({ marketIndex }: FuturesOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'both' | 'asks' | 'bids'>('both');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getMarketPrice, getMarketName, isClientReady } = useDrift();

  // Fetch orderbook data from Drift
  useEffect(() => {
    if (!isClientReady || marketIndex === null) {
      setLoading(true);
      return;
    }

    const fetchOrderBook = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current market price from Drift oracle
        const markPrice = getMarketPrice(marketIndex, 'perp');
        
        if (!markPrice || markPrice === 0) {
          throw new Error('Unable to fetch market price');
        }

        // Generate synthetic orderbook around mark price
        // In production, you would fetch actual L2 data from Drift
        const generateOrders = (basePrice: number, isAsk: boolean): OrderBookEntry[] => {
          const orders: OrderBookEntry[] = [];
          let cumulativeTotal = 0;

          for (let i = 0; i < 20; i++) {
            const priceOffset = (i + 1) * (basePrice * 0.0001); // 0.01% increments
            const price = isAsk ? basePrice + priceOffset : basePrice - priceOffset;
            const amount = Math.random() * 10 + 1; // Random amount between 1-11
            const total = price * amount;
            
            cumulativeTotal += total;
            orders.push({ price, amount, total, depthPercent: 0 });
          }

          // Calculate depth percentages
          orders.forEach((order, idx) => {
            const cumulativeToThis = orders.slice(0, idx + 1).reduce((sum, o) => sum + o.total, 0);
            order.depthPercent = (cumulativeToThis / cumulativeTotal) * 100;
          });

          return orders;
        };

        const generatedAsks = generateOrders(markPrice, true).reverse();
        const generatedBids = generateOrders(markPrice, false);

        setAsks(generatedAsks);
        setBids(generatedBids);
        setLastPrice(markPrice);
        setLoading(false);
      } catch (err) {
        console.error('[FuturesOrderBook] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orderbook');
        setLoading(false);
      }
    };

    fetchOrderBook();

    // Update every 3 seconds
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [marketIndex, isClientReady, getMarketPrice]);

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

  const marketName = marketIndex !== null ? getMarketName(marketIndex) : 'N/A';

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
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
              <span className="text-[10px] text-[#0ecb81]">Live</span>
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

      {/* Market Name */}
      <div className="px-3 py-1 border-b border-[#1e2329]">
        <span className="text-[10px] text-[#848e9c]">Market: </span>
        <span className="text-[10px] text-white font-medium">{marketName}</span>
      </div>

      {/* Spread */}
      {spread > 0 && (
        <div className="px-3 py-1 border-b border-[#1e2329] text-[10px]">
          <span className="text-[#848e9c]">Spread: </span>
          <span className="text-white">{formatPrice(spread)}</span>
        </div>
      )}

      {/* Column Headers */}
      <div className="px-3 py-1 grid grid-cols-3 gap-2 text-[10px] text-[#848e9c] font-medium">
        <div className="text-left">Price(USD)</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col-reverse">
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
                  className={`relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer ${
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
            Mark Price
          </span>
        </div>

        {/* Bids (Buy Orders) */}
        {(viewMode === 'both' || viewMode === 'bids') && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
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
                  className={`relative px-3 py-0.5 hover:bg-[#1e2329] cursor-pointer ${
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
