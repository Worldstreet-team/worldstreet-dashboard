"use client";

import React, { useState } from "react";
import TradingChart from "@/components/trading/TradingChart";
import SpotInterface from "@/components/trading/SpotInterface";
import OrderBook from "@/components/trading/OrderBook";
import SpotTradeHistory from "@/components/trading/SpotTradeHistory";
import MarketTicker from "@/components/trading/MarketTicker";
import Footer from "@/components/dashboard/Footer";

export default function SpotTradingPage() {
    const [selectedPair, setSelectedPair] = useState("SOL/USDC");

    return (
        <div className="space-y-5">
            {/* Market Ticker Bar */}
            <MarketTicker
                selectedPair={selectedPair}
                onPairChange={(pair) => setSelectedPair(pair.symbol)}
            />

            {/* Main Trading Grid */}
            <div className="grid grid-cols-12 gap-5">
                {/* Chart - Main Area */}
                <div className="col-span-12 xl:col-span-8 2xl:col-span-9">
                    <TradingChart />
                </div>

                {/* Spot Interface - Right Side */}
                <div className="col-span-12 xl:col-span-4 2xl:col-span-3">
                    <SpotInterface />
                </div>

                {/* Order Book */}
                <div className="col-span-12 lg:col-span-6 xl:col-span-4">
                    <div className="h-[520px]">
                        <OrderBook pair={selectedPair} />
                    </div>
                </div>

                {/* Trade History */}
                <div className="col-span-12 lg:col-span-6 xl:col-span-4">
                    <div className="h-[520px]">
                        <SpotTradeHistory pair={selectedPair} />
                    </div>
                </div>

                {/* Market Info Cards */}
                <div className="col-span-12 xl:col-span-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-5 h-full">
                        {/* Trading Rules Card */}
                        <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-secondary/10 rounded-lg">
                                    <svg
                                        className="w-4 h-4 text-secondary"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-dark dark:text-white">
                                    Trading Info
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Min. Order</span>
                                    <span className="font-bold text-dark dark:text-white">$1.00</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Trading Fee</span>
                                    <span className="font-bold text-dark dark:text-white">0.10%</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Settlement</span>
                                    <span className="font-bold text-dark dark:text-white">Instant</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Price Source</span>
                                    <span className="font-bold text-dark dark:text-white">Li.Fi DEX Agg.</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Max. Slippage</span>
                                    <span className="font-bold text-dark dark:text-white">0.50%</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted font-medium">Data Source</span>
                                    <span className="font-bold text-dark dark:text-white">Binance + CoinGecko</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 dark:from-primary/5 dark:to-secondary/5 border border-border/50 dark:border-darkborder rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                    <svg
                                        className="w-4 h-4 text-primary"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-dark dark:text-white">
                                    Powered by Li.Fi
                                </h3>
                            </div>
                            <p className="text-[11px] text-muted leading-relaxed mb-4">
                                WorldStreet spot trading aggregates liquidity from 20+ DEXs and bridges for the best execution price. All trades are settled on-chain.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {["Jupiter", "Uniswap", "1inch", "Raydium", "Orca"].map((dex) => (
                                    <span
                                        key={dex}
                                        className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-white/50 dark:bg-white/5 border border-border/20 dark:border-white/5 rounded-full text-muted"
                                    >
                                        {dex}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Risk Warning */}
                        <div className="bg-warning/5 border border-warning/10 rounded-2xl p-5 animate-fade-in-up sm:col-span-2 xl:col-span-1" style={{ animationDelay: "400ms" }}>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-warning/10 rounded-lg shrink-0 mt-0.5">
                                    <svg
                                        className="w-4 h-4 text-warning"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-warning mb-1">Risk Disclosure</h4>
                                    <p className="text-[10px] text-muted leading-relaxed">
                                        Crypto trading carries significant risk. Prices are volatile and you may lose your entire investment. Only trade with funds you can afford to lose.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
