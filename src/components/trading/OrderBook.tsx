"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Layers, BarChart3, Loader2, WifiOff } from "lucide-react";

interface OrderLevel {
    price: number;
    size: number;
    total: number;
    percentage: number;
}

type BookView = "both" | "bids" | "asks";

// Map our pair symbols to Binance symbols
const PAIR_TO_BINANCE: Record<string, string> = {
    "SOL/USDC": "SOLUSDC",
    "ETH/USDC": "ETHUSDC",
    "BTC/USDC": "BTCUSDC",
    "XRP/USDC": "XRPUSDC",
    "LINK/USDC": "LINKUSDC",
    // Fallback — also support just the base symbol for convenience
    SOL: "SOLUSDC",
    ETH: "ETHUSDC",
    BTC: "BTCUSDC",
    XRP: "XRPUSDC",
    LINK: "LINKUSDC",
};

function processLevels(
    rawLevels: [string, string][],
    side: "bid" | "ask",
    maxLevels: number
): OrderLevel[] {
    let levels = rawLevels.slice(0, maxLevels).map(([p, q]) => ({
        price: parseFloat(p),
        size: parseFloat(q),
        total: 0,
        percentage: 0,
    }));

    // For bids: keep descending (highest first)  |  asks: keep ascending (lowest first)
    if (side === "bid") {
        levels.sort((a, b) => b.price - a.price);
    } else {
        levels.sort((a, b) => a.price - b.price);
    }

    // Compute cumulative totals
    let cumTotal = 0;
    for (const lvl of levels) {
        cumTotal += lvl.size;
        lvl.total = cumTotal;
    }

    // Depth bar percentages
    const maxTotal = cumTotal || 1;
    for (const lvl of levels) {
        lvl.percentage = (lvl.total / maxTotal) * 100;
    }

    return levels;
}

const OrderBook = ({
    pair = "SOL/USDC",
    midPrice: midPriceFallback = 145.2,
}: {
    pair?: string;
    midPrice?: number;
}) => {
    const [view, setView] = useState<BookView>("both");
    const [bids, setBids] = useState<OrderLevel[]>([]);
    const [asks, setAsks] = useState<OrderLevel[]>([]);
    const [lastPrice, setLastPrice] = useState(midPriceFallback);
    const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const prevPriceRef = useRef(midPriceFallback);

    const LEVELS = view === "both" ? 14 : 24;

    const binanceSymbol = PAIR_TO_BINANCE[pair] || PAIR_TO_BINANCE[pair.split("/")[0]] || "SOLUSDC";

    // Fetch order book from Binance
    const fetchOrderBook = useCallback(async () => {
        try {
            const res = await fetch(
                `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${LEVELS}`
            );

            if (!res.ok) {
                throw new Error(`Binance API returned ${res.status}`);
            }

            const data = await res.json();

            if (data.bids && data.asks) {
                const processedBids = processLevels(data.bids, "bid", LEVELS);
                const processedAsks = processLevels(data.asks, "ask", LEVELS);

                setBids(processedBids);
                setAsks(processedAsks);

                // Derive mid-price from best bid/ask
                const bestBid = processedBids[0]?.price || 0;
                const bestAsk = processedAsks[0]?.price || 0;
                const newMid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk || midPriceFallback;

                // Track price direction
                if (newMid > prevPriceRef.current) {
                    setPriceDirection("up");
                } else if (newMid < prevPriceRef.current) {
                    setPriceDirection("down");
                } else {
                    setPriceDirection("neutral");
                }

                setLastPrice(newMid);
                prevPriceRef.current = newMid;
                setError(null);
            }
        } catch (err) {
            console.error("[OrderBook] Fetch error:", err);
            setError("Failed to load order book");
        } finally {
            setLoading(false);
        }
    }, [binanceSymbol, LEVELS, midPriceFallback]);

    // Initial fetch + polling every 2s
    useEffect(() => {
        setLoading(true);
        fetchOrderBook();
        const interval = setInterval(fetchOrderBook, 2000);
        return () => clearInterval(interval);
    }, [fetchOrderBook]);

    // Reset on pair change
    useEffect(() => {
        setLoading(true);
        setBids([]);
        setAsks([]);
        setError(null);
    }, [pair]);

    const spread = useMemo(() => {
        if (!asks.length || !bids.length) return { value: 0, pct: "0.00" };
        const bestAsk = asks[0]?.price || 0;
        const bestBid = bids[0]?.price || 0;
        const val = bestAsk - bestBid;
        const pct = bestBid > 0 ? ((val / bestBid) * 100).toFixed(3) : "0.000";
        return { value: parseFloat(val.toFixed(4)), pct };
    }, [asks, bids]);

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

    const renderRow = (
        order: OrderLevel,
        side: "bid" | "ask",
        index: number
    ) => {
        const isBid = side === "bid";
        return (
            <div
                key={`${side}-${index}`}
                className="relative flex items-center text-[11px] font-mono h-[26px] px-3 hover:bg-white/5 group transition-colors cursor-pointer"
            >
                {/* Depth bar background */}
                <div
                    className={cn(
                        "absolute top-0 h-full transition-all duration-500 pointer-events-none",
                        isBid
                            ? "right-0 bg-success/8 dark:bg-success/6"
                            : "right-0 bg-error/8 dark:bg-error/6"
                    )}
                    style={{ width: `${order.percentage}%` }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center w-full">
                    <span
                        className={cn(
                            "w-[34%] tabular-nums font-semibold",
                            isBid ? "text-success" : "text-error"
                        )}
                    >
                        {formatPrice(order.price)}
                    </span>
                    <span className="w-[33%] text-right tabular-nums text-dark/80 dark:text-white/70">
                        {formatSize(order.size)}
                    </span>
                    <span className="w-[33%] text-right tabular-nums text-muted">
                        {formatSize(order.total)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <Card className="border border-border/50 shadow-xl dark:bg-black dark:border-darkborder h-full overflow-hidden flex flex-col animate-fade-in-up">
            <CardHeader className="pb-3 border-b border-border/10 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Layers className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-dark dark:text-white leading-tight">
                                Order Book
                            </h3>
                            <p className="text-[9px] text-muted font-medium uppercase tracking-widest">
                                {error ? "Reconnecting..." : "Binance Live"}
                            </p>
                        </div>
                    </div>

                    {/* View Toggles */}
                    <div className="flex gap-1 p-0.5 bg-muted/10 dark:bg-white/5 rounded-lg border border-border/10">
                        {(
                            [
                                { key: "both", label: "Both", icon: <ArrowUpDown className="w-3 h-3" /> },
                                { key: "bids", label: "Bids", icon: <BarChart3 className="w-3 h-3 text-success" /> },
                                { key: "asks", label: "Asks", icon: <BarChart3 className="w-3 h-3 text-error rotate-180" /> },
                            ] as const
                        ).map((v) => (
                            <button
                                key={v.key}
                                onClick={() => setView(v.key)}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    view === v.key
                                        ? "bg-white dark:bg-white/10 shadow-sm"
                                        : "hover:bg-white/50 dark:hover:bg-white/5"
                                )}
                                title={v.label}
                            >
                                {v.icon}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {/* Column Headers */}
                <div className="flex items-center text-[9px] font-black text-muted uppercase tracking-widest px-3 py-2 border-b border-border/10 dark:border-white/5">
                    <span className="w-[34%]">Price (USD)</span>
                    <span className="w-[33%] text-right">Size</span>
                    <span className="w-[33%] text-right">Total</span>
                </div>

                {loading && !bids.length ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <p className="text-[10px] font-bold text-muted">Loading order book...</p>
                        </div>
                    </div>
                ) : error && !bids.length ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                            <WifiOff className="w-6 h-6 text-muted/40" />
                            <p className="text-[10px] font-bold text-muted">Order book unavailable</p>
                            <p className="text-[9px] text-muted/60">Retrying automatically...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Asks (sell orders) - reversed so lowest is at bottom */}
                        {(view === "both" || view === "asks") && (
                            <ScrollArea className={cn("flex-1", view === "both" ? "max-h-[calc(50%-20px)]" : "")}>
                                <div className="flex flex-col-reverse">
                                    {asks.map((order, i) => renderRow(order, "ask", i))}
                                </div>
                            </ScrollArea>
                        )}

                        {/* Spread / Last Price Indicator */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/5 dark:bg-white/3 border-y border-border/10 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "text-lg font-black tabular-nums transition-colors",
                                        priceDirection === "up"
                                            ? "text-success"
                                            : priceDirection === "down"
                                                ? "text-error"
                                                : "text-dark dark:text-white"
                                    )}
                                >
                                    {formatPrice(lastPrice)}
                                </span>
                                {priceDirection !== "neutral" && (
                                    <span
                                        className={cn(
                                            "text-xs",
                                            priceDirection === "up" ? "text-success" : "text-error"
                                        )}
                                    >
                                        {priceDirection === "up" ? "↑" : "↓"}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-muted uppercase">Spread</p>
                                <p className="text-[10px] font-bold text-muted tabular-nums">
                                    ${spread.value < 0.01 ? spread.value.toFixed(4) : spread.value.toFixed(2)} ({spread.pct}%)
                                </p>
                            </div>
                        </div>

                        {/* Bids (buy orders) */}
                        {(view === "both" || view === "bids") && (
                            <ScrollArea className={cn("flex-1", view === "both" ? "max-h-[calc(50%-20px)]" : "")}>
                                {bids.map((order, i) => renderRow(order, "bid", i))}
                            </ScrollArea>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default OrderBook;
