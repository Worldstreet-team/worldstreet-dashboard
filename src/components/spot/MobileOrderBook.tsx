'use client';

/**
 * MobileOrderBook Component
 * 
 * Mobile-optimized order book using KuCoin WebSocket API
 * - Displays top 5 bids and asks
 * - Real-time updates via WebSocket
 * - Compact layout for mobile screens
 */

import { useState, useEffect, useRef } from 'react';

interface OrderBookEntry {
  price: number;
  amount: number;
}

interface MobileOrderBookProps {
  selectedPair: string;
}

interface KuCoinOrderBookData {
  bids: [string, string][];
  asks: [string, string][];
  sequence: number;
}

export default function MobileOrderBook({ selectedPair }: MobileOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('wss://ws-api-spot.kucoin.com/');
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        
        const subscribeMessage = {
          id: Date.now().toString(),
          type: 'subscribe',
          topic: `/spotMarket/level2Depth5:${selectedPair}`,
          privateChannel: false,
          response: true
        };
        
        ws.send(JSON.stringify(subscribeMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message' && data.topic?.includes('level2Depth5')) {
            processOrderBookUpdate(data.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnected(false);
    }
  };

  const processOrderBookUpdate = (data: KuCoinOrderBookData) => {
    try {
      // Process asks (sell orders)
      const processedAsks: OrderBookEntry[] = data.asks
        .slice(0, 5)
        .map(([priceStr, amountStr]) => ({
          price: parseFloat(priceStr),
          amount: parseFloat(amountStr)
        }))
        .sort((a, b) => a.price - b.price)
        .reverse();

      // Process bids (buy orders)
      const processedBids: OrderBookEntry[] = data.bids
        .slice(0, 5)
        .map(([priceStr, amountStr]) => ({
          price: parseFloat(priceStr),
          amount: parseFloat(amountStr)
        }))
        .sort((a, b) => b.price - a.price);

      setAsks(processedAsks);
      setBids(processedBids);

      // Update last price
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

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(6);
  };

  return (
    <div className="flex flex-col border-l border-border dark:border-darkborder px-2 py-2 bg-white dark:bg-darkgray h-full overflow-hidden">
      {/* Header Row */}
      <div className="flex justify-between text-[10px] text-muted font-medium mb-1 px-1">
        <span>Price(USDT)</span>
        <div className="flex items-center gap-1">
          <span>Amount</span>
          {connected && (
            <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
          )}
        </div>
      </div>

      {/* Sell Orders (Red) - Scrollable */}
      <div className="flex flex-col-reverse overflow-y-auto flex-1">
        {asks.length > 0 ? (
          asks.map((ask, index) => (
            <div
              key={`ask-${index}`}
              className="flex justify-between text-[10px] font-mono py-0.5 px-1 hover:bg-error/5"
            >
              <span className="text-error font-semibold">{formatPrice(ask.price)}</span>
              <span className="text-dark dark:text-white">{formatAmount(ask.amount)}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-muted">
            Loading...
          </div>
        )}
      </div>

      {/* Current Price (Center Highlight) */}
      <div className="text-center py-2 border-y border-border dark:border-darkborder my-1">
        <div className={`text-lg font-semibold font-mono ${
          priceChange >= 0 ? 'text-success' : 'text-error'
        }`}>
          {formatPrice(lastPrice)}
        </div>
        <div className="text-[10px] text-muted mt-0.5">
          ≈ ${lastPrice.toFixed(2)}
        </div>
      </div>

      {/* Buy Orders (Green) - Scrollable */}
      <div className="flex flex-col overflow-y-auto flex-1">
        {bids.length > 0 ? (
          bids.map((bid, index) => (
            <div
              key={`bid-${index}`}
              className="flex justify-between text-[10px] font-mono py-0.5 px-1 hover:bg-success/5"
            >
              <span className="text-success font-semibold">{formatPrice(bid.price)}</span>
              <span className="text-dark dark:text-white">{formatAmount(bid.amount)}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-muted">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
