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

  // Donut chart for portfolio allocation
  const allocationOptions: ApexOptions = {
    chart: {
      type: "donut",
      height: 200,
      fontFamily: "inherit",
    },
    labels: ["Bitcoin", "Ethereum", "Forex", "Other Crypto"],
    colors: ["#f7931a", "#627eea", "var(--color-primary)", "var(--color-secondary)"],
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 0,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "12px",
              color: activeMode === "dark" ? "#7c8fac" : "#5a6a85",
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              color: activeMode === "dark" ? "#ffffff" : "#17192c",
              formatter: (val) => `${val}%`,
            },
            total: {
              show: true,
              label: "Portfolio",
              fontSize: "12px",
              color: activeMode === "dark" ? "#7c8fac" : "#5a6a85",
              formatter: () => "100%",
            },
          },
        },
      },
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${val}%`,
      },
    },
  };

  const allocationSeries = [45, 25, 20, 10];

  return (
    <Card className="border-0 shadow-md dark:bg-black dark:shadow-dark-md h-full">
      <CardHeader className="pb-2">
        <div>
          <h5 className="text-lg font-semibold text-dark dark:text-white">Market Overview</h5>
          <p className="text-sm text-muted">Global market statistics</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-3">
          {marketStats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-3 rounded-xl bg-gray-50 dark:bg-darkgray/30"
            >
              <p className="text-xs text-muted mb-1">{stat.label}</p>
              <p className="font-bold text-dark dark:text-white">{stat.value}</p>
              <p className={cn(
                "text-xs font-medium",
                stat.change.startsWith("+") ? "text-success" : "text-error"
              )}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Portfolio Allocation */}
        <div>
          <h6 className="text-sm font-semibold text-dark dark:text-white mb-3">Portfolio Allocation</h6>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Chart
                options={allocationOptions}
                series={allocationSeries}
                type="donut"
                height={160}
              />
            </div>
            <div className="space-y-2">
              {[
                { label: "Bitcoin", color: "bg-[#f7931a]", value: "45%" },
                { label: "Ethereum", color: "bg-[#627eea]", value: "25%" },
                { label: "Forex", color: "bg-primary", value: "20%" },
                { label: "Other", color: "bg-secondary", value: "10%" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", item.color)}></span>
                  <span className="text-xs text-muted">{item.label}</span>
                  <span className="text-xs font-semibold text-dark dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Movers */}
        <div>
          <h6 className="text-sm font-semibold text-dark dark:text-white mb-3">Top Movers (24h)</h6>
          <div className="space-y-2">
            {topMovers.map((mover, index) => {
              const isPositive = mover.change >= 0;
              return (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-darkgray/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-darkgray/50 flex items-center justify-center">
                      <Icon icon={mover.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-dark dark:text-white">{mover.symbol}</p>
                      <p className="text-xs text-muted">{mover.name}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold border-0 rounded-full px-2.5",
                      isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error"
                    )}
                  >
                    <Icon 
                      icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} 
                      className="h-3 w-3 mr-0.5" 
                    />
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
