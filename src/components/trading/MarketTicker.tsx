"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";
import { usePrices, CoinData } from "@/lib/wallet/usePrices";

// Map our pair symbols to CoinGecko symbol + display info
const PAIR_CONFIG = [
    {
        symbol: "SOL/USDC",
        coinSymbol: "SOL",
        name: "Solana",
        icon: "cryptocurrency-color:sol",
    },
    {
        symbol: "ETH/USDC",
        coinSymbol: "ETH",
        name: "Ethereum",
        icon: "cryptocurrency-color:eth",
    },
    {
        symbol: "BTC/USDC",
        coinSymbol: "BTC",
        name: "Bitcoin",
        icon: "cryptocurrency-color:btc",
    },
    {
        symbol: "XRP/USDC",
        coinSymbol: "XRP",
        name: "XRP",
        icon: "cryptocurrency-color:xrp",
    },
    {
        symbol: "LINK/USDC",
        coinSymbol: "LINK",
        name: "Chainlink",
        icon: "cryptocurrency-color:link",
    },
] as const;

export interface TickerPair {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    icon: string;
}

const MarketTicker = ({
    selectedPair,
    onPairChange,
}: {
    selectedPair: string;
    onPairChange: (pair: TickerPair) => void;
}) => {
    const { coins, loading: pricesLoading } = usePrices();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [binanceStats, setBinanceStats] = useState<Record<string, { high: number; low: number }>>({});

    // Fetch 24h high/low from Binance (CoinGecko free tier doesn't include this)
    useEffect(() => {
        const fetchBinanceStats = async () => {
            const binanceSymbols = ["SOLUSDC", "ETHUSDC", "BTCUSDC", "XRPUSDC", "LINKUSDC"];
            try {
                const responses = await Promise.allSettled(
                    binanceSymbols.map((sym) =>
                        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`)
                            .then((r) => {
                                if (!r.ok) return {};
                                return r.json();
                            })
                            .catch(() => ({}))
                    )
                );

                const stats: Record<string, { high: number; low: number }> = {};
                const pairSymbols = ["SOL", "ETH", "BTC", "XRP", "LINK"];

                responses.forEach((result, i) => {
                    if (result.status === "fulfilled" && result.value) {
                        const val = result.value as any;
                        if (val.highPrice) {
                            stats[pairSymbols[i]] = {
                                high: parseFloat(val.highPrice),
                                low: parseFloat(val.lowPrice),
                            };
                        }
                    }
                });

                setBinanceStats(stats);
            } catch (err) {
                console.error("[MarketTicker] Failed to fetch Binance stats:", err);
            }
        };

        fetchBinanceStats();
        // Use a longer interval for tickers (5 mins) since we have CoinGecko as primary
        const interval = setInterval(fetchBinanceStats, 300_000);
        return () => clearInterval(interval);
    }, []);

    // Build live pairs from CoinGecko data
    const livePairs: TickerPair[] = useMemo(() => {
        return PAIR_CONFIG.map((cfg) => {
            const coin = coins.find((c: CoinData) => c.symbol === cfg.coinSymbol);
            const bStats = binanceStats[cfg.coinSymbol];

            return {
                symbol: cfg.symbol,
                name: cfg.name,
                icon: cfg.icon,
                price: coin?.price ?? 0,
                change24h: coin?.change24h ?? 0,
                high24h: bStats?.high ?? (coin ? coin.price * 1.02 : 0),
                low24h: bStats?.low ?? (coin ? coin.price * 0.98 : 0),
                volume24h: coin?.volume24h ?? 0,
            };
        });
    }, [coins, binanceStats]);

    const currentPair = livePairs.find((p) => p.symbol === selectedPair) || livePairs[0];

    const formatVolume = (vol: number) => {
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
        return `$${vol.toLocaleString()}`;
    };

    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(2);
        return price.toFixed(4);
    };

    const isPositive = currentPair.change24h >= 0;

    if (pricesLoading && !coins.length) {
        return (
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl overflow-hidden animate-fade-in-up">
                <div className="flex items-center justify-center gap-3 p-4 sm:px-6 sm:py-5">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-muted font-medium">Loading market data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 p-4 sm:px-6 sm:py-4">
                {/* Pair Selector */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 hover:bg-muted/10 dark:hover:bg-white/5 rounded-xl px-3 py-2 transition-colors -ml-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-muted/20 dark:bg-white/5 flex items-center justify-center">
                            <Icon icon={currentPair.icon} width={24} height={24} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-dark dark:text-white tracking-tight">
                                    {currentPair.symbol}
                                </span>
                                <Icon
                                    icon="ph:caret-down-bold"
                                    className="w-3.5 h-3.5 text-muted"
                                />
                            </div>
                            <p className="text-[10px] text-muted font-medium">{currentPair.name}</p>
                        </div>
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setDropdownOpen(false)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#0a0a0a] border border-border dark:border-darkborder rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-2">
                                    {livePairs.map((pair) => (
                                        <button
                                            key={pair.symbol}
                                            onClick={() => {
                                                onPairChange(pair);
                                                setDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors",
                                                pair.symbol === currentPair.symbol
                                                    ? "bg-primary/10"
                                                    : "hover:bg-muted/10 dark:hover:bg-white/5"
                                            )}
                                        >
                                            <Icon icon={pair.icon} width={20} height={20} />
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-bold text-dark dark:text-white">
                                                    {pair.symbol}
                                                </p>
                                                <p className="text-[10px] text-muted">{pair.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-dark dark:text-white tabular-nums">
                                                    ${formatPrice(pair.price)}
                                                </p>
                                                <p
                                                    className={cn(
                                                        "text-[10px] font-bold tabular-nums",
                                                        pair.change24h >= 0 ? "text-success" : "text-error"
                                                    )}
                                                >
                                                    {pair.change24h >= 0 ? "+" : ""}
                                                    {pair.change24h.toFixed(2)}%
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-10 bg-border/30 dark:bg-white/5 mx-5" />

                {/* Price */}
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    <div>
                        <p
                            className={cn(
                                "text-2xl font-black tabular-nums transition-colors",
                                isPositive ? "text-success" : "text-error"
                            )}
                        >
                            ${formatPrice(currentPair.price)}
                        </p>
                    </div>

                    {/* Change */}
                    <div className="flex items-center gap-1.5">
                        {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-error" />
                        )}
                        <div>
                            <p
                                className={cn(
                                    "text-sm font-black tabular-nums",
                                    isPositive ? "text-success" : "text-error"
                                )}
                            >
                                {isPositive ? "+" : ""}
                                {currentPair.change24h.toFixed(2)}%
                            </p>
                            <p className="text-[9px] text-muted font-bold uppercase">24h</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block w-px h-8 bg-border/30 dark:bg-white/5" />

                    {/* Stats */}
                    <div className="hidden lg:flex items-center gap-6">
                        <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-wider">
                                24h High
                            </p>
                            <p className="text-sm font-bold text-dark dark:text-white tabular-nums">
                                ${formatPrice(currentPair.high24h)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-wider">
                                24h Low
                            </p>
                            <p className="text-sm font-bold text-dark dark:text-white tabular-nums">
                                ${formatPrice(currentPair.low24h)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-wider">
                                24h Volume
                            </p>
                            <p className="text-sm font-bold text-dark dark:text-white tabular-nums">
                                {formatVolume(currentPair.volume24h)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Activity indicator */}
                <div className="hidden xl:flex items-center gap-2 ml-auto px-3 py-1.5 bg-success/5 border border-success/10 rounded-full">
                    <Activity className="w-3.5 h-3.5 text-success" />
                    <span className="text-[10px] font-bold text-success">Market Open</span>
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default MarketTicker;
