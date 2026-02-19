"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Clock, TrendingUp, Loader2, WifiOff } from "lucide-react";

interface Trade {
    id: string;
    price: number;
    size: number;
    side: "buy" | "sell";
    time: Date;
    isNew?: boolean;
}

// Map our pair symbols to KuCoin symbols
const PAIR_TO_KUCOIN: Record<string, string> = {
    "SOL/USDC": "SOL-USDC",
    "ETH/USDC": "ETH-USDC",
    "BTC/USDC": "BTC-USDC",
    "XRP/USDC": "XRP-USDC",
    "LINK/USDC": "LINK-USDC",
    SOL: "SOL-USDC",
    ETH: "ETH-USDC",
    BTC: "BTC-USDC",
    XRP: "XRP-USDC",
    LINK: "LINK-USDC",
};

// Map our pair symbols to Binance symbols
const PAIR_TO_BINANCE: Record<string, string> = {
    "SOL/USDC": "SOLUSDC",
    "ETH/USDC": "ETHUSDC",
    "BTC/USDC": "BTCUSDC",
    "XRP/USDC": "XRPUSDC",
    "LINK/USDC": "LINKUSDC",
    SOL: "SOLUSDC",
    ETH: "ETHUSDC",
    BTC: "BTCUSDC",
    XRP: "XRPUSDC",
    LINK: "LINKUSDC",
};

const SpotTradeHistory = ({ pair = "SOL/USDC" }: { pair?: string; midPrice?: number }) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastTradeIdRef = useRef<string | null>(null);
    const maxTrades = 50;

    const kucoinSymbol = PAIR_TO_KUCOIN[pair] || PAIR_TO_KUCOIN[(pair || "BTC/USDC").split("/")[0]] || "BTC-USDC";
    const binanceSymbol = PAIR_TO_BINANCE[pair] || PAIR_TO_BINANCE[(pair || "BTC/USDC").split("/")[0]] || "BTCUSDC";

    // Fetch recent trades with fallback logic
    const fetchTrades = useCallback(async (isInitial = false) => {
        try {
            let rawTrades: any[] = [];
            let source: "binance" | "kucoin" | null = null;

            // 1. Try Binance first
            try {
                const res = await fetch(`https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=${maxTrades}`);
                if (res.ok) {
                    rawTrades = await res.json();
                    source = "binance";
                }
            } catch (e) {
                console.warn("[SpotTradeHistory] Binance fetch failed, falling back...");
            }

            // 2. Fallback to KuCoin
            if (rawTrades.length === 0) {
                try {
                    const res = await fetch(`https://api.kucoin.com/api/v1/market/histories?symbol=${kucoinSymbol}`);
                    if (res.ok) {
                        const json = await res.json();
                        rawTrades = json.data;
                        source = "kucoin";
                    }
                } catch (e) {
                    console.warn("[SpotTradeHistory] KuCoin fetch failed.");
                }
            }

            if (!Array.isArray(rawTrades) || rawTrades.length === 0) {
                if (isInitial) throw new Error("No trade data available from any provider");
                return;
            }

            const newTrades: Trade[] = source === "binance"
                ? rawTrades.map((t: any) => ({
                    id: String(t.id),
                    price: parseFloat(t.price),
                    size: parseFloat(t.qty),
                    side: t.isBuyerMaker ? "sell" : "buy",
                    time: new Date(t.time),
                    isNew: false,
                }))
                : rawTrades.map((t: any) => ({
                    id: String(t.sequence),
                    price: parseFloat(t.price),
                    size: parseFloat(t.size),
                    side: t.side,
                    time: new Date(Math.floor(t.time / 1000000)),
                    isNew: false,
                }));

            // Sort newest first
            newTrades.sort((a, b) => b.time.getTime() - a.time.getTime());

            if (isInitial) {
                setTrades(newTrades.slice(0, maxTrades));
                lastTradeIdRef.current = newTrades[0]?.id || null;
            } else {
                // Only add trades newer than what we already have
                setTrades((prev) => {
                    const existingIds = new Set(prev.map((t) => t.id));
                    const fresh = newTrades
                        .filter((t) => !existingIds.has(t.id))
                        .map((t) => ({ ...t, isNew: true }));

                    if (fresh.length === 0) return prev;

                    // Mark all existing as not new
                    const updated = prev.map((t) => ({ ...t, isNew: false }));
                    return [...fresh, ...updated].slice(0, maxTrades);
                });

                if (newTrades[0]) {
                    lastTradeIdRef.current = newTrades[0].id;
                }
            }

            setError(null);
        } catch (err) {
            console.error("[SpotTradeHistory] All providers failed:", err);
            setError((prev) => prev !== "Disconnected" ? "Disconnected" : prev);
        } finally {
            setLoading(false);
        }
    }, [kucoinSymbol, binanceSymbol]);

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        setTrades([]);
        setError(null);
        fetchTrades(true);
    }, [fetchTrades]);

    // Poll for new trades every 5s (slower is better for stability)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchTrades(false);
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchTrades]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const formatSize = (size: number) => {
        if (size >= 1000) return size.toFixed(1);
        if (size >= 100) return size.toFixed(2);
        if (size >= 1) return size.toFixed(4);
        return size.toFixed(6);
    };

    const formatPrice = (price: number) => {
        if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 100) return price.toFixed(2);
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    return (
        <Card className="border border-border/50 shadow-xl dark:bg-black dark:border-darkborder h-full overflow-hidden flex flex-col animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] dark:bg-[#1f1f1f] border-b border-border/10">
                <span className="text-[11px] font-bold text-dark dark:text-white uppercase tracking-wider">Market Trades</span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">Live</span>
                </div>
            </div>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {/* Column Headers */}
                <div className="flex items-center text-[9px] font-black text-muted uppercase tracking-widest px-3 py-2 border-b border-border/10 dark:border-white/5">
                    <span className="w-[34%]">Price (USD)</span>
                    <span className="w-[33%] text-right">Size</span>
                    <span className="w-[33%] text-right">Time</span>
                </div>

                {loading && !trades.length ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <p className="text-[10px] font-bold text-muted">Loading trades...</p>
                        </div>
                    </div>
                ) : error && !trades.length ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                            <WifiOff className="w-6 h-6 text-muted/40" />
                            <p className="text-[10px] font-bold text-muted">Trades unavailable</p>
                            <p className="text-[9px] text-muted/60">Retrying automatically...</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="pb-1">
                            {trades.map((trade) => (
                                <div
                                    key={trade.id}
                                    className={cn(
                                        "flex items-center text-[11px] font-mono h-[26px] px-3 transition-all duration-500 hover:bg-white/5 cursor-pointer",
                                        trade.isNew && "bg-primary/5 animate-fade-in"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-[34%] tabular-nums font-semibold",
                                            trade.side === "buy" ? "text-success" : "text-error"
                                        )}
                                    >
                                        {formatPrice(trade.price)}
                                    </span>
                                    <span className="w-[33%] text-right tabular-nums text-dark/80 dark:text-white/70">
                                        {formatSize(trade.size)}
                                    </span>
                                    <span className="w-[33%] text-right tabular-nums text-muted">
                                        {formatTime(trade.time)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};

export default SpotTradeHistory;
