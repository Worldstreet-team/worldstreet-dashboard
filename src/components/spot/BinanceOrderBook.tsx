'use client';

/**
 * BinanceOrderBook Component
 * 
 * Real-time order book display using WebSocket proxy
 * - Connects to wss://kucoin.watchup.site
 * - Subscribes to order book updates with configurable depth
 * - Displays top 15 bids and asks with depth visualization
 * - Auto-reconnects with exponential backoff
 */

import { useState, useEffect, useRef } from 'react';
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

interface OrderBookData {
  b: [string, string][]; // bids
  a: [string, string][]; // asks
  O?: number; // sequenceStart
  C?: number; // sequenceEnd
}

interface WebSocketMessage {
  t: 'snapshot' | 'delta'; // type
  d: OrderBookData; // data
}

// WebSocket configuration
const WS_URL = 'wss://kucoin.watchup.site';
const DEPTH = '50'; // Can be "1", "5", "50", or "increment"
const TRADE_TYPE = 'SPOT';
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export default function BinanceOrderBook({ selectedPair }: BinanceOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'both' | 'asks' | 'bids'>('both');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for WebSocket management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(INITIAL_RECONNECT_DELAY);
  const activePairRef = useRef<string>(selectedPair);
  const shouldReconnectRef = useRef<boolean>(true);
  
  // Local order book state for incremental updates
  const localOrderBookRef = useRef<{ bids: Map<string, string>, asks: Map<string, string> }>({
    bids: new Map(),
    asks: new Map()
  });

  // Connect to WebSocket
  const connectWebSocket = (pair: string) => {
    try {
      console.log('[OrderBook] Connecting to WebSocket for pair:', pair);
      
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[OrderBook] WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY; // Reset backoff
        
        // Subscribe to order book updates
        const subscribeMessage = {
          type: 'subscribe',
          symbol: pair,
          depth: DEPTH,
          tradeType: TRADE_TYPE
        };
        
        ws.send(JSON.stringify(subscribeMessage));
        console.log('[OrderBook] Subscribed to:', pair);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.t === 'snapshot') {
            // Replace entire order book
            console.log('[OrderBook] Received snapshot');
            processSnapshot(message.d);
            setLoading(false);
          } else if (message.t === 'delta') {
            // Apply incremental updates
            processDelta(message.d);
          }
        } catch (err) {
          console.error('[OrderBook] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[OrderBook] WebSocket error:', err);
        setConnected(false);
        setError('Connection error');
      };

      ws.onclose = () => {
        console.log('[OrderBook] WebSocket closed');
        setConnected(false);
        
        // Reconnect with exponential backoff if allowed
        if (shouldReconnectRef.current) {
          const delay = reconnectDelayRef.current;
          console.log(`[OrderBook] Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(activePairRef.current);
          }, delay);
          
          // Increase delay for next reconnect (exponential backoff)
          reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
        }
      };
    } catch (err) {
      console.error('[OrderBook] Error connecting:', err);
      setConnected(false);
      setError('Failed to connect');
      
      // Retry connection
      if (shouldReconnectRef.current) {
        const delay = reconnectDelayRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket(activePairRef.current);
        }, delay);
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
      }
    }
  };

  // Unsubscribe from current pair
  const unsubscribe = (pair: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        symbol: pair,
        depth: DEPTH,
        tradeType: TRADE_TYPE
      };
      wsRef.current.send(JSON.stringify(unsubscribeMessage));
      console.log('[OrderBook] Unsubscribed from:', pair);
    }
  };

  // Process snapshot (full order book replacement)
  const processSnapshot = (data: OrderBookData) => {
    // Clear local order book
    localOrderBookRef.current.bids.clear();
    localOrderBookRef.current.asks.clear();
    
    // Populate with snapshot data
    data.b.forEach(([price, size]) => {
      if (parseFloat(size) > 0) {
        localOrderBookRef.current.bids.set(price, size);
      }
    });
    
    data.a.forEach(([price, size]) => {
      if (parseFloat(size) > 0) {
        localOrderBookRef.current.asks.set(price, size);
      }
    });
    
    // Update UI
    updateOrderBookDisplay();
  };

  // Process delta (incremental updates)
  const processDelta = (data: OrderBookData) => {
    // Update bids
    data.b.forEach(([price, size]) => {
      const sizeNum = parseFloat(size);
      if (sizeNum === 0) {
        localOrderBookRef.current.bids.delete(price);
      } else {
        localOrderBookRef.current.bids.set(price, size);
      }
    });
    
    // Update asks
    data.a.forEach(([price, size]) => {
      const sizeNum = parseFloat(size);
      if (sizeNum === 0) {
        localOrderBookRef.current.asks.delete(price);
      } else {
        localOrderBookRef.current.asks.set(price, size);
      }
    });
    
    // Update UI
    updateOrderBookDisplay();
  };

  // Update the displayed order book
  const updateOrderBookDisplay = () => {
    // Convert bids map to array and sort (highest to lowest)
    const bidsArray = Array.from(localOrderBookRef.current.bids.entries())
      .map(([price, size]) => [price, size] as [string, string])
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .slice(0, 15);
    
    // Convert asks map to array and sort (lowest to highest)
    const asksArray = Array.from(localOrderBookRef.current.asks.entries())
      .map(([price, size]) => [price, size] as [string, string])
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .slice(0, 15);
    
    // Process bids
    const processedBids: OrderBookEntry[] = [];
    let bidCumulativeTotal = 0;
    
    for (const [priceStr, amountStr] of bidsArray) {
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
    
    // Process asks (reverse for display)
    const processedAsks: OrderBookEntry[] = [];
    let askCumulativeTotal = 0;
    
    for (const [priceStr, amountStr] of asksArray) {
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
      const newLastPrice = processedBids[0].price;
      const change = lastPrice > 0 ? ((newLastPrice - lastPrice) / lastPrice) * 100 : 0;
      setLastPrice(newLastPrice);
      setPriceChange(change);
    }
  };

  useEffect(() => {
    console.log('[OrderBook] Pair changed to:', selectedPair);
    
    // Unsubscribe from old pair if connected
    if (activePairRef.current !== selectedPair) {
      unsubscribe(activePairRef.current);
    }
    
    // Update active pair ref
    activePairRef.current = selectedPair;
    shouldReconnectRef.current = true;

    // Reset state
    setAsks([]);
    setBids([]);
    setLastPrice(0);
    setPriceChange(0);
    setLoading(true);
    setError(null);
    localOrderBookRef.current.bids.clear();
    localOrderBookRef.current.asks.clear();

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // If WebSocket is already connected, just subscribe to new pair
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        type: 'subscribe',
        symbol: selectedPair,
        depth: DEPTH,
        tradeType: TRADE_TYPE
      };
      wsRef.current.send(JSON.stringify(subscribeMessage));
      console.log('[OrderBook] Subscribed to new pair:', selectedPair);
    } else {
      // Otherwise, establish new connection
      connectWebSocket(selectedPair);
    }
    
    return () => {
      console.log('[OrderBook] Cleanup');
      shouldReconnectRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        unsubscribe(selectedPair);
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedPair]);

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
                key={`ask-${index}`}
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
                key={`bid-${index}`}
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
