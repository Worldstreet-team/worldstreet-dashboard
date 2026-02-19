"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, WifiOff, ExternalLink } from "lucide-react";

interface Trade {
  id: string;
  pair: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  time: Date;
  isNew?: boolean;
}

const PAIRS = ["BTC/USDC", "ETH/USDC", "SOL/USDC"];
const PAIR_TO_BINANCE: Record<string, string> = {
  "BTC/USDC": "BTCUSDC",
  "ETH/USDC": "ETHUSDC",
  "SOL/USDC": "SOLUSDC",
};

const RecentTrades = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const maxTrades = 10;

  const fetchMarketTrades = useCallback(async () => {
    try {
      // Pick a random pair to show diversity or just BTC
      const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
      const binanceSymbol = PAIR_TO_BINANCE[pair];

      let rawTrades: any[] = [];
      let source = "";

      // Helper for fetch
      const tryFetch = async (url: string) => {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.json();
        } catch (e) { }
        return null;
      };

      // 1. Try Binance
      rawTrades = await tryFetch(`https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=${maxTrades}`);
      if (rawTrades) source = "binance";

      // 2. Try Gate.io fallback
      if (!rawTrades) {
        const gateSymbol = pair.replace("/", "_");
        rawTrades = await tryFetch(`https://api.gateio.ws/api/v4/spot/trades?currency_pair=${gateSymbol}&limit=${maxTrades}`);
        if (rawTrades) source = "gate";
      }

      // 3. Proxy fallback
      if (!rawTrades) {
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=${maxTrades}`)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const wrapper = await res.json();
            rawTrades = JSON.parse(wrapper.contents);
            source = "binance";
          }
        } catch (e) { }
      }

      if (Array.isArray(rawTrades) && rawTrades.length > 0) {
        const mapped: Trade[] = rawTrades.slice(0, maxTrades).map((t: any) => ({
          id: String(t.id),
          pair,
          price: parseFloat(t.price),
          size: parseFloat(t.qty || t.amount),
          side: t.side ? t.side : (t.isBuyerMaker ? "sell" : "buy"),
          time: t.time ? new Date(t.time) : new Date(t.create_time * 1000),
          isNew: false,
        }));

        setTrades(mapped);
        setError(null);
      }
    } catch (err) {
      console.error("[RecentTrades] Fetch error:", err);
      setError("Disconnected");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketTrades();
    const interval = setInterval(fetchMarketTrades, 10000);
    return () => clearInterval(interval);
  }, [fetchMarketTrades]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2 });
    return price.toFixed(4);
  };

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full flex flex-col animate-fade-in-up" style={{ animationDelay: "120ms" }}>
      <CardHeader className="pb-3 border-b border-border/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wider">Market Activity</h5>
            <p className="text-[10px] text-muted mt-0.5">Global recent trades</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded-full">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-success uppercase">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-[300px]">
        {loading && trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error && trades.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <WifiOff className="w-8 h-8 text-muted/30 mb-2" />
            <p className="text-xs font-bold text-muted uppercase">Connection Issues</p>
            <p className="text-[10px] text-muted/60 mt-1">Retrying automatically...</p>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center px-4 py-2 border-b border-border/5 dark:border-white/5 bg-muted/5">
              <span className="w-[30%] text-[10px] font-bold text-muted uppercase">Pair</span>
              <span className="w-[30%] text-[10px] font-bold text-muted uppercase text-right">Price</span>
              <span className="w-[40%] text-[10px] font-bold text-muted uppercase text-right">Time</span>
            </div>
            <div className="divide-y divide-border/5 dark:divide-white/5">
              {trades.map((trade) => (
                <div key={trade.id} className="flex items-center px-4 py-2.5 hover:bg-muted/5 transition-colors group">
                  <div className="w-[30%] flex flex-col">
                    <span className="text-[11px] font-bold text-dark dark:text-white">{trade.pair}</span>
                    <span className={cn("text-[9px] font-black uppercase", trade.side === "buy" ? "text-success" : "text-error")}>
                      {trade.side}
                    </span>
                  </div>
                  <div className="w-[30%] text-right">
                    <span className="text-[11px] font-mono font-bold tabular-nums text-dark dark:text-white">
                      ${formatPrice(trade.price)}
                    </span>
                  </div>
                  <div className="w-[40%] text-right flex flex-col items-end">
                    <span className="text-[10px] text-muted font-medium">
                      {trade.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-muted/40 font-mono">ID: {trade.id.slice(-6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTrades;