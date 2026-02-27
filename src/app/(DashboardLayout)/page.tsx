"use client";

import React, { useState, Suspense, lazy, Component, type ReactNode, type ErrorInfo } from "react";

import Footer from "@/components/dashboard/Footer";
import TradingChart from "@/components/trading/TradingChart";
import PortfolioStats from "@/components/trading/PortfolioStats";
import Watchlist from "@/components/trading/Watchlist";
import RecentTrades from "@/components/trading/RecentTrades";
import MarketOverview from "@/components/trading/MarketOverview";
import Link from "next/link";
import { Icon } from "@iconify/react";

// Lazy-load the swap widget so its heavy dependencies don't block the dashboard
const SwapInterface = lazy(() =>
  import("@/components/swap/SwapInterface").then((m) => ({
    default: m.SwapInterface,
  }))
);

// Error boundary so a swap crash doesn't take down the whole dashboard
class SwapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SwapWidget] Crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm p-6 flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <Icon icon="solar:refresh-circle-linear" className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted text-center">Swap widget couldn&apos;t load</p>
          <Link
            href="/swap"
            className="text-sm text-primary font-medium hover:underline"
          >
            Open full Swap page &rarr;
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <SwapErrorBoundary>
          <Suspense
            fallback={
              <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm p-6 flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
              </div>
            }
          >
            <SwapInterface />
          </Suspense>
        </SwapErrorBoundary>
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
