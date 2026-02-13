"use client";

import React, { useState } from "react";
import TradingChart from "@/components/trading/TradingChart";
import SpotInterface from "@/components/trading/SpotInterface";
import OrderBook from "@/components/trading/OrderBook";
import SpotTradeHistory from "@/components/trading/SpotTradeHistory";
import MarketTicker from "@/components/trading/MarketTicker";
import Footer from "@/components/dashboard/Footer";

export default function SpotTradingPage() {
    const [selectedPair, setSelectedPair] = useState("BTC/USDC");

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#0a0a0a] flex flex-col font-sans">
            {/* Top Bar - Bybit Style */}
            <div className="bg-white dark:bg-[#1a1a1a] border-b border-border/50 dark:border-white/5 shadow-sm sticky top-0 z-50">
                <MarketTicker
                    selectedPair={selectedPair}
                    onPairChange={(pair) => setSelectedPair(pair.symbol)}
                />
            </div>

            {/* Trading Grid */}
            <main className="flex-1 flex flex-col xl:flex-row p-1 gap-1">

                {/* Left Panel - Order Book (Bybit often has this on the right too, but let's try this layout) */}
                <div className="hidden xl:flex w-[280px] 2xl:w-[320px] flex-col gap-1 shrink-0">
                    <div className="flex-1 bg-white dark:bg-[#1a1a1a] border border-border/50 dark:border-white/5 rounded-sm overflow-hidden min-h-[500px]">
                        <OrderBook pair={selectedPair} />
                    </div>
                </div>

                {/* Center Panel - Chart & Trades */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="bg-white dark:bg-[#1a1a1a] border border-border/50 dark:border-white/5 rounded-sm overflow-hidden h-[600px] 2xl:h-[700px]">
                        <TradingChart pair={selectedPair} />
                    </div>

                    <div className="flex-1 bg-white dark:bg-[#1a1a1a] border border-border/50 dark:border-white/5 rounded-sm overflow-hidden min-h-[350px]">
                        <div className="flex flex-col h-full">
                            <div className="flex bg-[#F9FAFB] dark:bg-[#1f1f1f] border-b border-border/10">
                                {["Open Orders", "Order History", "Trade History", "Assets"].map((tab, i) => (
                                    <button
                                        key={tab}
                                        className={`px-6 py-2.5 text-[11px] font-bold transition-all border-b-2 ${i === 2 ? 'text-primary border-primary bg-white dark:bg-[#1a1a1a]' : 'text-muted border-transparent hover:text-dark dark:hover:text-white'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-auto">
                                <SpotTradeHistory pair={selectedPair} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Order Placement */}
                <div className="w-full xl:w-[300px] 2xl:w-[340px] flex flex-col gap-1 shrink-0">
                    <div className="bg-white dark:bg-[#1a1a1a] border border-border/50 dark:border-white/5 rounded-sm overflow-hidden">
                        <SpotInterface pair={selectedPair} />
                    </div>

                    {/* Compact stats or info */}
                    <div className="bg-white dark:bg-[#1a1a1a] border border-border/50 dark:border-white/5 rounded-sm p-4">
                        <h4 className="text-[10px] font-bold text-muted uppercase mb-3">Asset Info</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted">Trading Fee</span>
                                <span className="font-bold">0.1%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted">Settlement</span>
                                <span className="font-bold">On-chain</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
