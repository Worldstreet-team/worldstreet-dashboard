"use client";
import React, { useContext, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { Icon } from "@iconify/react";
import { CustomizerContext } from "@/app/context/customizerContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const mockPriceData: Record<string, { prices: number[]; dates: string[]; currentPrice: number; change: number; high: number; low: number; volume: string }> = {
  "BTC/USD": {
    prices: [42100, 42350, 41800, 42500, 43100, 42800, 43200, 42950, 43500, 43800, 44100, 43900, 44200, 44500, 44850],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 44850.00, change: 6.53, high: 45200.00, low: 41800.00, volume: "2.4B"
  },
  "ETH/USD": {
    prices: [2250, 2280, 2240, 2300, 2320, 2290, 2350, 2380, 2340, 2400, 2420, 2390, 2450, 2480, 2510],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 2510.00, change: 11.56, high: 2520.00, low: 2240.00, volume: "890M"
  },
  "EUR/USD": {
    prices: [1.0850, 1.0862, 1.0845, 1.0878, 1.0890, 1.0875, 1.0895, 1.0910, 1.0898, 1.0920, 1.0935, 1.0918, 1.0940, 1.0955, 1.0968],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 1.0968, change: 1.09, high: 1.0980, low: 1.0845, volume: "5.2B"
  },
  "GBP/USD": {
    prices: [1.2680, 1.2695, 1.2665, 1.2710, 1.2725, 1.2705, 1.2740, 1.2760, 1.2745, 1.2780, 1.2800, 1.2785, 1.2815, 1.2835, 1.2850],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 1.2850, change: 1.34, high: 1.2865, low: 1.2665, volume: "3.1B"
  },
  "XRP/USD": {
    prices: [0.52, 0.525, 0.518, 0.535, 0.542, 0.538, 0.548, 0.555, 0.550, 0.562, 0.570, 0.565, 0.575, 0.582, 0.590],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 0.590, change: 13.46, high: 0.595, low: 0.518, volume: "420M"
  },
};

const assetCategories = {
  crypto: ["BTC/USD", "ETH/USD", "XRP/USD"],
  forex: ["EUR/USD", "GBP/USD"],
};

const TradingChart = () => {
  const { activeMode } = useContext(CustomizerContext);
  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("1D");
  const [category, setCategory] = useState<"crypto" | "forex">("crypto");

  const data = mockPriceData[selectedAsset];
  const isPositive = data.change >= 0;

  const chartOptions: ApexOptions = {
    chart: {
      type: "area", height: 350, fontFamily: "inherit",
      foreColor: activeMode === "dark" ? "#94a3b8" : "#64748b",
      toolbar: { show: false }, sparkline: { enabled: false },
      animations: { enabled: true, speed: 600, dynamicAnimation: { speed: 350 } },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth", width: 2,
      colors: [isPositive ? "var(--color-success)" : "var(--color-error)"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100],
        colorStops: [
          { offset: 0, color: isPositive ? "var(--color-success)" : "var(--color-error)", opacity: 0.3 },
          { offset: 100, color: isPositive ? "var(--color-success)" : "var(--color-error)", opacity: 0.05 },
        ],
      },
    },
    xaxis: {
      categories: data.dates,
      labels: { style: { colors: activeMode === "dark" ? "#94a3b8" : "#64748b", fontSize: "11px" } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: activeMode === "dark" ? "#94a3b8" : "#64748b", fontSize: "11px" },
        formatter: (val) => {
          if (selectedAsset.includes("BTC")) return "$" + val.toLocaleString();
          if (selectedAsset.includes("ETH")) return "$" + val.toLocaleString();
          if (selectedAsset.includes("XRP")) return "$" + val.toFixed(3);
          return val.toFixed(4);
        },
      },
    },
    grid: {
      borderColor: activeMode === "dark" ? "#1e293b" : "#f1f5f9",
      strokeDashArray: 4, xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: activeMode === "dark" ? "dark" : "light",
      x: { show: true },
      y: {
        formatter: (val) => {
          if (selectedAsset.includes("BTC") || selectedAsset.includes("ETH")) return "$" + val.toLocaleString();
          if (selectedAsset.includes("XRP")) return "$" + val.toFixed(3);
          return val.toFixed(4);
        },
      },
    },
  };

  const chartSeries = [{ name: selectedAsset, data: data.prices }];

  const formatPrice = (price: number) => {
    if (selectedAsset.includes("BTC") || selectedAsset.includes("ETH")) {
      return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (selectedAsset.includes("XRP")) return "$" + price.toFixed(3);
    return price.toFixed(4);
  };

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder overflow-hidden animate-fade-in-up">
      <CardHeader className="pb-0">
        {/* Category & Timeframe */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <Tabs value={category} onValueChange={(val) => {
            setCategory(val as "crypto" | "forex");
            setSelectedAsset(assetCategories[val as "crypto" | "forex"][0]);
          }}>
            <TabsList className="bg-muted/40 dark:bg-white/5 p-0.5 rounded-lg h-9">
              <TabsTrigger value="crypto" className="rounded-md px-4 py-1.5 text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-darkgray data-[state=active]:shadow-sm transition-all">
                <Icon icon="cryptocurrency:btc" className="mr-1.5 h-3.5 w-3.5" /> Crypto
              </TabsTrigger>
              <TabsTrigger value="forex" className="rounded-md px-4 py-1.5 text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-darkgray data-[state=active]:shadow-sm transition-all">
                <Icon icon="mdi:currency-usd" className="mr-1.5 h-3.5 w-3.5" /> Forex
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-0.5 bg-muted/40 dark:bg-white/5 p-0.5 rounded-lg">
            {["1H", "4H", "1D", "1W", "1M"].map((tf) => (
              <Button key={tf} variant="ghost" size="sm" onClick={() => setTimeframe(tf)}
                className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md transition-all h-7",
                  timeframe === tf ? "bg-white dark:bg-darkgray shadow-sm text-dark dark:text-white" : "text-muted hover:text-dark dark:hover:text-white"
                )}>
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* Asset selector pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {assetCategories[category].map((asset) => {
            const assetData = mockPriceData[asset];
            const isActive = selectedAsset === asset;
            const isUp = assetData.change >= 0;
            return (
              <button key={asset} onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-200",
                  isActive
                    ? "bg-primary/5 border-primary/30 dark:bg-primary/10"
                    : "bg-white dark:bg-darkgray/20 border-border dark:border-darkborder hover:border-primary/30"
                )}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                  asset.includes("BTC") && "bg-amber-500/10", asset.includes("ETH") && "bg-indigo-500/10",
                  asset.includes("XRP") && "bg-gray-500/10", asset.includes("EUR") && "bg-blue-500/10",
                  asset.includes("GBP") && "bg-red-500/10",
                )}>
                  <Icon icon={
                    asset.includes("BTC") ? "cryptocurrency-color:btc" : asset.includes("ETH") ? "cryptocurrency-color:eth" :
                    asset.includes("XRP") ? "cryptocurrency-color:xrp" : asset.includes("EUR") ? "circle-flags:eu" : "circle-flags:gb"
                  } className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={cn("font-medium text-xs", isActive ? "text-primary" : "text-dark dark:text-white")}>{asset}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted">{formatPrice(assetData.currentPrice)}</span>
                    <span className={cn("text-[10px] font-medium", isUp ? "text-success" : "text-error")}>
                      {isUp ? "+" : ""}{assetData.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Price display */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-3xl font-bold text-dark dark:text-white tracking-tight">{formatPrice(data.currentPrice)}</h1>
              <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-medium rounded border-0",
                isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                <Icon icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} className="mr-0.5 h-3 w-3" />
                {isPositive ? "+" : ""}{data.change.toFixed(2)}%
              </Badge>
            </div>
            <p className="text-xs text-muted">Last updated: {new Date().toLocaleTimeString()} &bull; {timeframe} Chart</p>
          </div>
          <div className="flex gap-5">
            {[
              { label: "24h High", value: formatPrice(data.high) },
              { label: "24h Low", value: formatPrice(data.low) },
              { label: "Volume", value: "$" + data.volume },
            ].map((stat, i) => (
              <div key={i} className="text-right">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className="font-semibold text-sm text-dark dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-1">
        <Chart options={chartOptions} series={chartSeries} type="area" height={300} width="100%" />
      </CardContent>
      <div className="px-6 pb-5">
        <div className="flex gap-2.5">
          <Button className="flex-1 bg-success hover:bg-success/90 text-white font-medium py-5 rounded-lg text-sm shadow-sm transition-all duration-200 hover:shadow-md">
            <Icon icon="solar:arrow-up-bold" className="mr-1.5 h-4 w-4" /> Buy {selectedAsset.split("/")[0]}
          </Button>
          <Button className="flex-1 bg-error hover:bg-error/90 text-white font-medium py-5 rounded-lg text-sm shadow-sm transition-all duration-200 hover:shadow-md">
            <Icon icon="solar:arrow-down-bold" className="mr-1.5 h-4 w-4" /> Sell {selectedAsset.split("/")[0]}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TradingChart;
