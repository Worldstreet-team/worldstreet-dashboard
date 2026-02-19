"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Target, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    amount: number;
    total: number;
    stopLoss?: number;
    takeProfit?: number;
    status: "PENDING" | "OPEN" | "CLOSED" | "FAILED" | "CANCELED";
    timestamp: string;
}

interface TradeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    trade: Trade | null;
    onTradeClosed?: () => void;
}

const TradeDetailModal = ({ isOpen, onClose, trade, onTradeClosed }: TradeDetailModalProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !trade || !chartContainerRef.current) return;

        let isMounted = true;
        const abortController = new AbortController();
        const container = chartContainerRef.current;

        // Initialize Chart
        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            width: container.clientWidth || 600,
            height: 300,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = (chart as any).addCandlestickSeries({
            upColor: "#10b981",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        const fetchChartData = async () => {
            if (!isMounted) return;
            setLoading(true);
            setError(null);

            try {
                // Ensure symbol is formatted correctly for Binance (e.g., BTCUSDT)
                const base = trade.symbol.split('/')[0].split('USDT')[0].split('USDC')[0];
                const binanceSymbol = `${base}USDT`;

                console.log("[Chart] Fetching data for", binanceSymbol);

                const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=100`;
                const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
                    signal: abortController.signal
                });

                if (!res.ok) throw new Error(`API Connection Failed: ${res.status}`);

                const data = await res.json();
                if (!isMounted) return;

                if (Array.isArray(data) && data.length > 0) {
                    const formattedData: CandlestickData[] = data.map((d: any) => ({
                        time: (d[0] / 1000) as Time,
                        open: parseFloat(d[1]),
                        high: parseFloat(d[2]),
                        low: parseFloat(d[3]),
                        close: parseFloat(d[4]),
                    }));

                    candlestickSeries.setData(formattedData);
                    setCurrentPrice(formattedData[formattedData.length - 1].close);

                    if (trade.price) {
                        candlestickSeries.createPriceLine({
                            price: trade.price, color: "#3b82f6", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "Entry",
                        });
                    }
                    if (trade.stopLoss) {
                        candlestickSeries.createPriceLine({
                            price: trade.stopLoss, color: "#ef4444", lineWidth: 2, lineStyle: 1, axisLabelVisible: true, title: "SL",
                        });
                    }
                    if (trade.takeProfit) {
                        candlestickSeries.createPriceLine({
                            price: trade.takeProfit, color: "#10b981", lineWidth: 2, lineStyle: 1, axisLabelVisible: true, title: "TP",
                        });
                    }

                    chart.timeScale().fitContent();
                    setLoading(false);
                } else {
                    throw new Error("No recent market data found");
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error("[Chart] Load error:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load chart");
                    setLoading(false);
                }
            }
        };

        // Fetch immediately
        fetchChartData();

        const resizeObserver = new ResizeObserver(() => {
            if (isMounted && container && chart) {
                chart.applyOptions({ width: container.clientWidth });
                chart.timeScale().fitContent();
            }
        });
        resizeObserver.observe(container);

        return () => {
            isMounted = false;
            abortController.abort();
            resizeObserver.disconnect();
            if (chart) chart.remove();
        };
    }, [isOpen, trade?.id]);

    const handleCloseTrade = async () => {
        if (!trade || closing) return;
        setClosing(true);
        try {
            const res = await fetch("/api/trades/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tradeId: trade.id,
                    exitPrice: currentPrice || trade.price,
                }),
            });
            const result = await res.json();
            if (result.success) {
                if (onTradeClosed) onTradeClosed();
                onClose();
            }
        } catch (error) {
            console.error("Failed to close trade", error);
        } finally {
            setClosing(false);
        }
    };

    if (!trade) return null;

    const pnl = currentPrice ? (trade.side === "buy" ? (currentPrice - trade.price) * trade.amount : (trade.price - currentPrice) * trade.amount) : 0;
    const pnlPercent = currentPrice ? ((trade.side === "buy" ? (currentPrice - trade.price) / trade.price : (trade.price - currentPrice) / trade.price) * 100) : 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] bg-[#1a1a1a] border-[#333] text-white">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {trade.symbol}
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                trade.side === "buy" ? "bg-success/20 text-success" : "bg-error/20 text-error"
                            )}>
                                {trade.side}
                            </span>
                        </DialogTitle>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Trade ID</p>
                            <p className="text-[10px] font-mono text-gray-500">{trade.id}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Left: Stats */}
                    <div className="space-y-4">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">PnL Analysis</p>
                            <div className={cn(
                                "text-2xl font-black tabular-nums",
                                pnl >= 0 ? "text-success" : "text-error"
                            )}>
                                {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} USDC
                            </div>
                            <div className={cn(
                                "text-xs font-bold",
                                pnl >= 0 ? "text-success" : "text-error"
                            )}>
                                {pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-medium">Entry Price</span>
                                <span className="font-bold tabular-nums">{trade.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-medium">Current Price</span>
                                <span className="font-bold tabular-nums text-primary">{currentPrice?.toLocaleString() || "---"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-medium">Size</span>
                                <span className="font-bold tabular-nums">{trade.amount.toFixed(4)} {trade.symbol.split('/')[0]}</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5 text-rose-500">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span className="font-bold">SL</span>
                                </div>
                                <span className="font-bold tabular-nums">{trade.stopLoss ? trade.stopLoss.toLocaleString() : "None"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5 text-emerald-500">
                                    <Target className="w-3.5 h-3.5" />
                                    <span className="font-bold">TP</span>
                                </div>
                                <span className="font-bold tabular-nums">{trade.takeProfit ? trade.takeProfit.toLocaleString() : "None"}</span>
                            </div>
                        </div>

                        {trade.status === "OPEN" && (
                            <Button
                                onClick={handleCloseTrade}
                                disabled={closing}
                                className="w-full bg-error hover:bg-error/90 text-white font-black uppercase text-xs h-12 shadow-lg shadow-error/20"
                            >
                                {closing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                                Close Position
                            </Button>
                        )}
                    </div>

                    {/* Right: Chart */}
                    <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold">1M Timeframe</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Live Chart</span>
                            </div>
                        </div>
                        <div
                            ref={chartContainerRef}
                            className="w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 relative min-h-[300px]"
                        >
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading Market Data...</p>
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 p-4 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-error/10 rounded-full">
                                            <ShieldAlert className="w-6 h-6 text-error" />
                                        </div>
                                        <p className="text-xs text-error font-bold">{error}</p>
                                        <Button
                                            onClick={() => window.location.reload()}
                                            variant="outline"
                                            className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TradeDetailModal;
