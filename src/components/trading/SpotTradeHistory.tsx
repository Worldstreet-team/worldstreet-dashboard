"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface UserTrade {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    amount: number;
    total: number;
    fee: number;
    pnl: number;
    status: "PENDING" | "COMPLETED" | "FAILED";
    timestamp: string;
}

const SpotTradeHistory = ({ pair = "BTC/USDC" }: { pair?: string }) => {
    const [trades, setTrades] = useState<UserTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch from the real API
                const res = await fetch(`/api/trades/history?symbol=${encodeURIComponent(pair)}&page=${page}&limit=10`);
                const result = await res.json();
                if (result.success) {
                    setTrades(result.data);
                    setTotalPages(result.pagination.pages || 1);
                }
            } catch (e) {
                console.error("Trade history fetch failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [page, pair]);

    return (
        <Card className="border-0 shadow-none bg-transparent dark:bg-transparent text-gray-200">
            <CardHeader className="pb-3 border-b border-white/5 bg-transparent">
                <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Spot Activity</h5>
                    <button className="p-1 hover:bg-white/5 rounded"><Filter className="w-3 h-3 text-gray-500" /></button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] sm:text-[11px] text-left">
                        <thead>
                            <tr className="border-b border-border/10 text-gray-500 uppercase font-bold">
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Side</th>
                                <th className="px-4 py-3">Price</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                                    </td>
                                </tr>
                            ) : trades.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-muted-foreground">No transactions found</td>
                                </tr>
                            ) : (
                                trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                            {new Date(trade.timestamp).toLocaleDateString()} {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-foreground">{trade.symbol}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                                trade.side === "buy" ? "bg-success/20 text-success" : "bg-error/20 text-error"
                                            )}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium tabular-nums text-foreground">{trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-medium tabular-nums text-foreground">{trade.amount.toFixed(4)}</td>
                                        <td className="px-4 py-3 font-medium tabular-nums text-foreground">{trade.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={cn(
                                                "text-[10px] font-bold",
                                                trade.status === "COMPLETED" ? "text-success" :
                                                    trade.status === "PENDING" ? "text-warning" : "text-error"
                                            )}>
                                                {trade.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t border-border/10">
                    <span className="text-[10px] text-muted-foreground">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1.5 disabled:opacity-30 hover:bg-white/5 rounded border border-border/20 transition-all font-bold text-[10px]"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1.5 disabled:opacity-30 hover:bg-white/5 rounded border border-border/20 transition-all font-bold text-[10px]"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SpotTradeHistory;
