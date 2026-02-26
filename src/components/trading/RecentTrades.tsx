"use client";

import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";

interface Trade {
  id: string;
  price: string;
  amount: string;
  side: "buy" | "sell";
  time: number;
}

const REFRESH_INTERVAL = 10_000; // 10 seconds

const RecentTrades = ({ symbol = "BTC" }: { symbol?: string }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pair = `${symbol}USDT`;

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/trading/trades?symbol=${encodeURIComponent(pair)}&limit=50`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrades(json.data);
        setError(null);
      } else {
        throw new Error(json.error || "No data");
      }
    } catch {
      setError("Could not load trades");
    } finally {
      setLoading(false);
    }
  }, [pair]);

  // Fetch on mount & when symbol changes, then poll
  useEffect(() => {
    setLoading(true);
    setTrades([]);
    fetchTrades();

    intervalRef.current = setInterval(fetchTrades, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTrades]);

  const formatPrice = (price: string) => {
    const n = parseFloat(price);
    if (n >= 1000) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(2);
    return n.toFixed(6);
  };

  const formatAmount = (amount: string) => {
    const n = parseFloat(amount);
    if (n >= 1000) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full flex flex-col animate-fade-in-up" style={{ animationDelay: "80ms" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-base font-semibold text-dark dark:text-white">Recent Trades</h5>
            <p className="text-xs text-muted mt-0.5">{symbol}/USDT &bull; 10s refresh</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 rounded-md">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-success uppercase">Live</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-[300px] overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center px-4 py-2 border-b border-border/30 dark:border-darkborder text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="w-[35%]">Price (USDT)</span>
          <span className="w-[30%] text-right">Amount ({symbol})</span>
          <span className="w-[35%] text-right">Time</span>
        </div>

        {/* Loading */}
        {loading && trades.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
          </div>
        )}

        {/* Error */}
        {error && trades.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Icon icon="solar:danger-triangle-linear" className="h-6 w-6 text-muted" />
            <p className="text-xs text-muted">{error}</p>
            <button onClick={fetchTrades} className="text-xs text-primary hover:underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Trade rows */}
        {trades.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={`${trade.id}-${trade.time}`}
                className="flex items-center px-4 py-1.5 hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
              >
                <div
                  className={cn(
                    "w-[35%] text-[11px] font-mono font-medium tabular-nums",
                    trade.side === "buy" ? "text-success" : "text-error"
                  )}
                >
                  {formatPrice(trade.price)}
                </div>
                <div className="w-[30%] text-right text-[11px] font-mono text-dark dark:text-gray-300 tabular-nums">
                  {formatAmount(trade.amount)}
                </div>
                <div className="w-[35%] text-right text-[10px] font-mono text-muted tabular-nums">
                  {new Date(trade.time).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(RecentTrades);
