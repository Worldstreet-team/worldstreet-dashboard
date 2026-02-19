"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowUpDown, BarChart3, Loader2 } from "lucide-react";
import { useTradingStore, OrderLevel } from "@/store/useTradingStore";
import { binanceWS } from "@/lib/trading/binance-ws";

type BookView = "both" | "bids" | "asks";

const OrderBookRow = memo(({
    order,
    side,
    maxTotal
}: {
    order: OrderLevel;
    side: "buy" | "sell";
    maxTotal: number;
}) => {
    const isBid = side === "buy";
    const depthPercent = (order.total / maxTotal) * 100;

    return (
        <div className="relative flex items-center text-[11px] font-mono h-[22px] px-3 hover:bg-white/5 transition-colors cursor-pointer group">
            {/* Depth bar background */}
            <div
                className={cn(
                    "absolute top-0 right-0 h-full transition-all duration-300 pointer-events-none opacity-20",
                    isBid ? "bg-emerald-500" : "bg-rose-500"
                )}
                style={{ width: `${depthPercent}%` }}
            />

            <div className="relative z-10 flex items-center w-full">
                <span className={cn("w-[34%] tabular-nums font-semibold", isBid ? "text-emerald-500" : "text-rose-500")}>
                    {parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="w-[33%] text-right tabular-nums text-gray-400">
                    {parseFloat(order.amount).toFixed(4)}
                </span>
                <span className="w-[33%] text-right tabular-nums text-gray-500">
                    {order.total.toFixed(2)}
                </span>
            </div>
        </div>
    );
});

OrderBookRow.displayName = "OrderBookRow";

const OrderBook = ({ pair = "BTCUSDC" }: { pair?: string }) => {
    const [view, setView] = useState<BookView>("both");
    const { bids, asks, lastPrice, priceDirection } = useTradingStore();

    useEffect(() => {
        binanceWS.connect(pair);

        // Fallback polling if WS is not providing data
        const fallbackInterval = setInterval(async () => {
            const state = useTradingStore.getState();
            if (state.bids.length === 0 && state.asks.length === 0) {
                console.log("[OrderBook] Attempting fallback fetch...");
                const [base, quote] = pair.split("/");
                const kucoinSymbol = `${base}-${quote}`;

                try {
                    const targetUrl = `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${kucoinSymbol}`;
                    const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.data) {
                            state.setOrderBook(json.data.bids, json.data.asks);
                            return; // Stop if KuCoin worked
                        }
                    }
                } catch (e) {
                    console.warn("[OrderBook] KuCoin fallback failed.");
                }

                // If KuCoin failed, try Gate.io
                try {
                    const gateSymbol = `${base}_${quote}`;
                    const targetUrl = `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${gateSymbol}`;
                    const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.bids && json.asks) {
                            state.setOrderBook(json.bids, json.asks);
                        }
                    }
                } catch (e) {
                    console.warn("[OrderBook] Gate.io fallback failed.");
                }
            }
        }, 5000);

        return () => {
            binanceWS.disconnect();
            clearInterval(fallbackInterval);
        };
    }, [pair]);

    const spread = useMemo(() => {
        if (!asks.length || !bids.length) return { val: 0, pct: 0 };
        const bestAsk = parseFloat(asks[0].price);
        const bestBid = parseFloat(bids[0].price);
        const val = bestAsk - bestBid;
        const pct = (val / bestAsk) * 100;
        return { val, pct };
    }, [asks, bids]);

    const maxTotal = useMemo(() => {
        const bMax = bids.length > 0 ? bids[bids.length - 1].total : 0;
        const aMax = asks.length > 0 ? asks[asks.length - 1].total : 0;
        return Math.max(bMax, aMax);
    }, [bids, asks]);

    const displayBids = view === "both" ? bids.slice(0, 15) : bids.slice(0, 30);
    const displayAsks = view === "both" ? asks.slice(0, 15) : asks.slice(0, 30);

    return (
        <Card className="border border-border/50 shadow-xl bg-[#0b0e11] text-gray-200 h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#161a1e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Order Book</span>
                <div className="flex gap-1">
                    <button onClick={() => setView("both")} className={cn("p-1 rounded", view === "both" ? "bg-white/10" : "opacity-50")}><ArrowUpDown className="w-3 h-3" /></button>
                    <button onClick={() => setView("asks")} className={cn("p-1 rounded", view === "asks" ? "bg-white/10" : "opacity-50")}><BarChart3 className="w-3 h-3 text-rose-500 rotate-180" /></button>
                    <button onClick={() => setView("bids")} className={cn("p-1 rounded", view === "bids" ? "bg-white/10" : "opacity-50")}><BarChart3 className="w-3 h-3 text-emerald-500" /></button>
                </div>
            </div>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                {/* Column Headers */}
                <div className="flex items-center text-[9px] font-bold text-gray-500 uppercase px-3 py-2 border-b border-white/5">
                    <span className="w-[34%] text-left">Price(USDT)</span>
                    <span className="w-[33%] text-right">Amount(BTC)</span>
                    <span className="w-[33%] text-right">Total</span>
                </div>

                {!bids.length && !asks.length ? (
                    <div className="flex-1 flex items-center justify-center font-mono text-xs text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Synchronizing...
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Asks (Sells) */}
                        {(view === "both" || view === "asks") && (
                            <div className="flex-1 flex flex-col-reverse overflow-hidden">
                                {displayAsks.map((order, i) => (
                                    <OrderBookRow key={`ask-${order.price}`} order={order} side="sell" maxTotal={maxTotal} />
                                ))}
                            </div>
                        )}

                        {/* Price/Spread Midbar */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#1e2329] border-y border-white/5">
                            <div className={cn("text-lg font-bold tabular-nums",
                                priceDirection === "up" ? "text-emerald-500" :
                                    priceDirection === "down" ? "text-rose-500" : "text-gray-200"
                            )}>
                                {parseFloat(lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium">
                                Spread: <span className="text-gray-300">{spread.pct.toFixed(3)}%</span>
                            </div>
                        </div>

                        {/* Bids (Buys) */}
                        {(view === "both" || view === "bids") && (
                            <div className="flex-1 overflow-hidden">
                                {displayBids.map((order, i) => (
                                    <OrderBookRow key={`bid-${order.price}`} order={order} side="buy" maxTotal={maxTotal} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default memo(OrderBook);

