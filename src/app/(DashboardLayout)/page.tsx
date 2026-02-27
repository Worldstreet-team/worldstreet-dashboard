"use client";

import React, { useState } from "react";

import Footer from "@/components/dashboard/Footer";
import TradingChart from "@/components/trading/TradingChart";
import PortfolioStats from "@/components/trading/PortfolioStats";
import Watchlist from "@/components/trading/Watchlist";
import RecentTrades from "@/components/trading/RecentTrades";
import MarketOverview from "@/components/trading/MarketOverview";
import { SwapInterface } from "@/components/swap/SwapInterface";

const DashboardPage = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");

  return (
    <div className="grid grid-cols-12 gap-5 lg:gap-6">
      {/* Portfolio Stats - Full Width */}
      <div className="col-span-12">
        <PortfolioStats />
      </div>

      {/* Main Trading Chart */}
      <div className="xl:col-span-8 col-span-12">
        <TradingChart symbol={selectedSymbol} />
      </div>

      {/* Watchlist Sidebar */}
      <div className="xl:col-span-4 col-span-12">
        <Watchlist selectedSymbol={selectedSymbol} onSelectPair={setSelectedSymbol} />
      </div>

      {/* Recent Trades */}
      <div className="lg:col-span-7 col-span-12">
        <RecentTrades symbol={selectedSymbol} />
      </div>

      {/* Quick Swap */}
      <div className="lg:col-span-5 col-span-12">
        <SwapInterface />
      </div>

      {/* Market Overview - Full Width */}
      <div className="col-span-12">
        <MarketOverview />
      </div>

      <div className="col-span-12">
        <Footer />
      </div>
    </div>
  );
};

export default DashboardPage;
