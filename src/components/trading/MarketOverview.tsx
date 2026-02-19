"use client";
import React, { useContext, useMemo } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomizerContext } from "@/app/context/customizerContext";
import { cn } from "@/lib/utils";
import { ApexOptions } from "apexcharts";
import { usePrices, formatLargeNumber, CoinData } from "@/lib/wallet/usePrices";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Icon mapping for crypto symbols
const CRYPTO_ICONS: Record<string, string> = {
  BTC: "cryptocurrency-color:btc",
  ETH: "cryptocurrency-color:eth",
  SOL: "cryptocurrency-color:sol",
  XRP: "cryptocurrency-color:xrp",
  ADA: "cryptocurrency-color:ada",
  DOGE: "cryptocurrency-color:doge",
  DOT: "cryptocurrency-color:dot",
  LINK: "cryptocurrency-color:link",
  AVAX: "cryptocurrency-color:avax",
  MATIC: "cryptocurrency-color:matic",
  LTC: "cryptocurrency-color:ltc",
  UNI: "cryptocurrency-color:uni",
  XLM: "cryptocurrency-color:xlm",
  ATOM: "cryptocurrency-color:atom",
  NEAR: "cryptocurrency-color:near",
  APT: "simple-icons:aptos",
  SUI: "token-branded:sui",
};

const MarketOverview = () => {
  const { activeMode } = useContext(CustomizerContext);
  const { coins, globalStats, loading } = usePrices();

  // Calculate top movers (biggest gainers and losers)
  const topMovers = useMemo(() => {
    if (!coins.length) return [];
    
    // Filter out stablecoins
    const tradableCoins = coins.filter(c => 
      c.symbol !== "USDT" && c.symbol !== "USDC"
    );
    
    // Sort by absolute change to get biggest movers
    const sorted = [...tradableCoins].sort((a, b) => 
      Math.abs(b.change24h) - Math.abs(a.change24h)
    );
    
    // Take top 4 movers
    return sorted.slice(0, 4);
  }, [coins]);

  // Calculate market cap distribution for allocation chart
  const allocationData = useMemo(() => {
    if (!coins.length) return { series: [0, 0, 0, 0], labels: [] };
    
    const btc = coins.find(c => c.symbol === "BTC");
    const eth = coins.find(c => c.symbol === "ETH");
    const sol = coins.find(c => c.symbol === "SOL");
    
    const totalCap = globalStats.totalMarketCap || 1;
    const btcPct = btc ? Math.round((btc.marketCap / totalCap) * 100) : 0;
    const ethPct = eth ? Math.round((eth.marketCap / totalCap) * 100) : 0;
    const solPct = sol ? Math.round((sol.marketCap / totalCap) * 100) : 0;
    const otherPct = Math.max(0, 100 - btcPct - ethPct - solPct);
    
    return {
      series: [btcPct, ethPct, solPct, otherPct],
      labels: ["Bitcoin", "Ethereum", "Solana", "Others"],
    };
  }, [coins, globalStats]);

  // Market stats from global data
  const marketStats = useMemo(() => [
    { 
      label: "Crypto Market Cap", 
      value: formatLargeNumber(globalStats.totalMarketCap),
      change: `${globalStats.marketCapChange24h >= 0 ? "+" : ""}${globalStats.marketCapChange24h.toFixed(1)}%`
    },
    { 
      label: "24h Volume", 
      value: formatLargeNumber(globalStats.totalVolume),
      change: "+0.0%" // CoinGecko doesn't provide volume change
    },
    { 
      label: "BTC Dominance", 
      value: `${globalStats.btcDominance.toFixed(1)}%`,
      change: "" // No change data available
    },
  ], [globalStats]);

  const allocationOptions: ApexOptions = {
    chart: { type: "donut", height: 180, fontFamily: "inherit" },
    labels: allocationData.labels,
    colors: ["#f7931a", "#627eea", "#9945FF", "var(--color-muted)"],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [activeMode === "dark" ? "#0a0f1e" : "#ffffff"] },
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: { show: true, fontSize: "11px", color: activeMode === "dark" ? "#94a3b8" : "#64748b" },
            value: { show: true, fontSize: "18px", fontWeight: 600, color: activeMode === "dark" ? "#ffffff" : "#0f172a", formatter: (val) => val + "%" },
            total: { show: true, label: "Market", fontSize: "11px", color: activeMode === "dark" ? "#94a3b8" : "#64748b", formatter: () => "100%" },
          },
        },
      },
    },
    tooltip: { enabled: true, y: { formatter: (val) => val + "%" } },
  };

  if (loading) {
    return (
      <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full animate-fade-in-up">
        <CardHeader className="pb-2">
          <div>
            <h5 className="text-base font-semibold text-dark dark:text-white">Market Overview</h5>
            <p className="text-xs text-muted mt-0.5">Loading market data...</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full animate-fade-in-up" style={{ animationDelay: "180ms" }}>
      <CardHeader className="pb-2">
        <div>
          <h5 className="text-base font-semibold text-dark dark:text-white">Market Overview</h5>
          <p className="text-xs text-muted mt-0.5">Live market statistics</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-2">
          {marketStats.map((stat, index) => (
            <div key={index} className="text-center p-2.5 rounded-lg bg-muted/20 dark:bg-white/3 overflow-hidden">
              <p className="text-[10px] text-muted mb-1 leading-tight truncate">{stat.label}</p>
              <p className="font-bold text-sm text-dark dark:text-white truncate">{stat.value}</p>
              {stat.change && (
                <p className={cn("text-[10px] font-medium mt-0.5", 
                  stat.change.startsWith("+") ? "text-success" : 
                  stat.change.startsWith("-") ? "text-error" : "text-muted"
                )}>{stat.change}</p>
              )}
            </div>
          ))}
        </div>

        {/* Market Cap Distribution */}
        <div>
          <h6 className="text-xs font-semibold text-dark dark:text-white mb-2 uppercase tracking-wider">Market Cap Distribution</h6>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full min-w-0">
              <Chart options={allocationOptions} series={allocationData.series} type="donut" height={150} />
            </div>
            <div className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-1 gap-2 pt-2 sm:pt-0 shrink-0">
              {[
                { label: "Bitcoin", color: "bg-[#f7931a]", value: `${allocationData.series[0]}%` },
                { label: "Ethereum", color: "bg-[#627eea]", value: `${allocationData.series[1]}%` },
                { label: "Solana", color: "bg-[#9945FF]", value: `${allocationData.series[2]}%` },
                { label: "Others", color: "bg-muted", value: `${allocationData.series[3]}%` },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                  <span className="text-[11px] text-muted">{item.label}</span>
                  <span className="text-[11px] font-semibold text-dark dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Movers */}
        <div>
          <h6 className="text-xs font-semibold text-dark dark:text-white mb-2 uppercase tracking-wider">Top Movers (24h)</h6>
          <div className="space-y-1">
            {topMovers.map((mover, index) => {
              const isPositive = mover.change24h >= 0;
              const icon = CRYPTO_ICONS[mover.symbol] || "cryptocurrency:generic";
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 dark:hover:bg-white/3 transition-colors duration-150">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-muted/40 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                      {mover.image ? (
                        <img src={mover.image} alt={mover.symbol} className="h-4 w-4" />
                      ) : (
                        <Icon icon={icon} className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs text-dark dark:text-white truncate">{mover.symbol}</p>
                      <p className="text-[10px] text-muted truncate">{mover.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 rounded px-1.5 shrink-0 ml-2",
                    isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                    <Icon icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(mover.change24h).toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketOverview;
