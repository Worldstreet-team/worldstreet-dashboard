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
    fee: number;
    pnl: number;
    timestamp: string;
}

const SpotTradeHistory = ({ pair = "BTC/USDC" }: { pair?: string }) => {
    const [trades, setTrades] = useState<UserTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setTrades([]); // Clear old trades immediately
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Change 'pair' to 'symbol' to match backend API
                const res = await fetch(`/api/trades/history?symbol=${encodeURIComponent(pair)}&page=${page}&limit=10`);
                const result = await res.json();
                if (result.success) {
                    setTrades(result.data);
                    setTotalPages(result.pagination.pages);
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
        <Card className="border border-border/50 shadow-sm bg-[#0b0e11] text-gray-200">
            <CardHeader className="pb-3 border-b border-white/5 bg-[#161a1e]">
                <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Trade History</h5>
                    <button className="p-1 hover:bg-white/5 rounded"><Filter className="w-3 h-3" /></button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-500 uppercase font-bold bg-[#1e2329]/30">
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Symbol</th>
                                <th className="px-4 py-2">Side</th>
                                <th className="px-4 py-2">Price</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Fee</th>
                                <th className="px-4 py-2 text-right">P/L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500" />
                                    </td>
                                </tr>
                            ) : trades.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-gray-500">No trades found</td>
                                </tr>
                            ) : (
                                trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-2 text-gray-400">
                                            {new Date(trade.timestamp).toLocaleDateString()} {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2 font-bold text-gray-300">{trade.symbol}</td>
                                        <td className={cn("px-4 py-2 font-bold", trade.side === "buy" ? "text-emerald-500" : "text-rose-500")}>
                                            {trade.side.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-2 text-gray-300">{trade.price.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-gray-300">{trade.amount.toFixed(4)}</td>
                                        <td className="px-4 py-2 text-gray-500">{trade.fee.toFixed(6)}</td>
                                        <td className={cn("px-4 py-2 text-right font-bold", trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                            {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#161a1e]">
                    <span className="text-[10px] text-gray-500">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1 disabled:opacity-30 hover:bg-white/10 rounded border border-white/10"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1 disabled:opacity-30 hover:bg-white/10 rounded border border-white/10"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SpotTradeHistory;
