import React from "react";

import Footer from "@/components/dashboard/Footer";
import TradingChart from "@/components/trading/TradingChart";
import PortfolioStats from "@/components/trading/PortfolioStats";
import Watchlist from "@/components/trading/Watchlist";
import RecentTrades from "@/components/trading/RecentTrades";
import MarketOverview from "@/components/trading/MarketOverview";

const page = () => {
  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* Portfolio Stats - Full Width */}
        <div className="col-span-12">
          <PortfolioStats />
        </div>
        
        {/* Main Trading Chart */}
        <div className="xl:col-span-8 col-span-12">
          <TradingChart />
        </div>
        
        {/* Watchlist Sidebar */}
        <div className="xl:col-span-4 col-span-12">
          <Watchlist />
        </div>
        
        {/* Recent Trades */}
        <div className="lg:col-span-7 col-span-12">
          <RecentTrades />
        </div>
        
        {/* Market Overview */}
        <div className="lg:col-span-5 col-span-12">
          <MarketOverview />
        </div>
        
        <div className="col-span-12">
          <Footer />
        </div>
      </div>
    </>
  );
};

export default page;
