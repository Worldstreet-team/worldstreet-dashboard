"use client";
import React, { useContext } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomizerContext } from "@/app/context/customizerContext";
import { cn } from "@/lib/utils";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const marketStats = [
  { label: "Crypto Market Cap", value: "$1.72T", change: "+2.4%" },
  { label: "24h Volume", value: "$89.2B", change: "+5.1%" },
  { label: "BTC Dominance", value: "52.3%", change: "-0.3%" },
];

const topMovers = [
  { symbol: "PEPE", name: "Pepe", change: 24.5, icon: "noto:frog" },
  { symbol: "SOL", name: "Solana", change: 12.8, icon: "cryptocurrency-color:sol" },
  { symbol: "LINK", name: "Chainlink", change: -8.2, icon: "cryptocurrency-color:link" },
  { symbol: "ADA", name: "Cardano", change: -5.6, icon: "cryptocurrency-color:ada" },
];

const MarketOverview = () => {
  const { activeMode } = useContext(CustomizerContext);

  const allocationOptions: ApexOptions = {
    chart: { type: "donut", height: 180, fontFamily: "inherit" },
    labels: ["Bitcoin", "Ethereum", "Forex", "Other Crypto"],
    colors: ["#f7931a", "#627eea", "var(--color-primary)", "var(--color-muted)"],
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
            total: { show: true, label: "Portfolio", fontSize: "11px", color: activeMode === "dark" ? "#94a3b8" : "#64748b", formatter: () => "100%" },
          },
        },
      },
    },
    tooltip: { enabled: true, y: { formatter: (val) => val + "%" } },
  };

  const allocationSeries = [45, 25, 20, 10];

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full animate-fade-in-up" style={{ animationDelay: "180ms" }}>
      <CardHeader className="pb-2">
        <div>
          <h5 className="text-base font-semibold text-dark dark:text-white">Market Overview</h5>
          <p className="text-xs text-muted mt-0.5">Global market statistics</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-2">
          {marketStats.map((stat, index) => (
            <div key={index} className="text-center p-2.5 rounded-lg bg-muted/20 dark:bg-white/3">
              <p className="text-[10px] text-muted mb-1 leading-tight">{stat.label}</p>
              <p className="font-bold text-sm text-dark dark:text-white">{stat.value}</p>
              <p className={cn("text-[10px] font-medium mt-0.5", stat.change.startsWith("+") ? "text-success" : "text-error")}>{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Portfolio Allocation */}
        <div>
          <h6 className="text-xs font-semibold text-dark dark:text-white mb-2 uppercase tracking-wider">Allocation</h6>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Chart options={allocationOptions} series={allocationSeries} type="donut" height={150} />
            </div>
            <div className="space-y-2">
              {[
                { label: "Bitcoin", color: "bg-[#f7931a]", value: "45%" },
                { label: "Ethereum", color: "bg-[#627eea]", value: "25%" },
                { label: "Forex", color: "bg-primary", value: "20%" },
                { label: "Other", color: "bg-muted", value: "10%" },
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
              const isPositive = mover.change >= 0;
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 dark:hover:bg-white/3 transition-colors duration-150">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-muted/40 dark:bg-white/5 flex items-center justify-center">
                      <Icon icon={mover.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-xs text-dark dark:text-white">{mover.symbol}</p>
                      <p className="text-[10px] text-muted">{mover.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 rounded px-1.5",
                    isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                    <Icon icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} className="h-2.5 w-2.5 mr-0.5" />
                    {Math.abs(mover.change)}%
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
