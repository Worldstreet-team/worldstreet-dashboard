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

// Mock data for different assets
const mockPriceData: Record<string, { prices: number[]; dates: string[]; currentPrice: number; change: number; high: number; low: number; volume: string }> = {
  "BTC/USD": {
    prices: [42100, 42350, 41800, 42500, 43100, 42800, 43200, 42950, 43500, 43800, 44100, 43900, 44200, 44500, 44850],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 44850.00,
    change: 6.53,
    high: 45200.00,
    low: 41800.00,
    volume: "2.4B"
  },
  "ETH/USD": {
    prices: [2250, 2280, 2240, 2300, 2320, 2290, 2350, 2380, 2340, 2400, 2420, 2390, 2450, 2480, 2510],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 2510.00,
    change: 11.56,
    high: 2520.00,
    low: 2240.00,
    volume: "890M"
  },
  "EUR/USD": {
    prices: [1.0850, 1.0862, 1.0845, 1.0878, 1.0890, 1.0875, 1.0895, 1.0910, 1.0898, 1.0920, 1.0935, 1.0918, 1.0940, 1.0955, 1.0968],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 1.0968,
    change: 1.09,
    high: 1.0980,
    low: 1.0845,
    volume: "5.2B"
  },
  "GBP/USD": {
    prices: [1.2680, 1.2695, 1.2665, 1.2710, 1.2725, 1.2705, 1.2740, 1.2760, 1.2745, 1.2780, 1.2800, 1.2785, 1.2815, 1.2835, 1.2850],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 1.2850,
    change: 1.34,
    high: 1.2865,
    low: 1.2665,
    volume: "3.1B"
  },
  "XRP/USD": {
    prices: [0.52, 0.525, 0.518, 0.535, 0.542, 0.538, 0.548, 0.555, 0.550, 0.562, 0.570, 0.565, 0.575, 0.582, 0.590],
    dates: ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    currentPrice: 0.590,
    change: 13.46,
    high: 0.595,
    low: 0.518,
    volume: "420M"
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
      type: "area",
      height: 350,
      fontFamily: "inherit",
      foreColor: activeMode === "dark" ? "#7c8fac" : "#5a6a85",
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: [isPositive ? "var(--color-success)" : "var(--color-error)"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
        colorStops: [
          {
            offset: 0,
            color: isPositive ? "var(--color-success)" : "var(--color-error)",
            opacity: 0.4,
          },
          {
            offset: 100,
            color: isPositive ? "var(--color-success)" : "var(--color-error)",
            opacity: 0.1,
          },
        ],
      },
    },
    xaxis: {
      categories: data.dates,
      labels: {
        style: {
          colors: activeMode === "dark" ? "#7c8fac" : "#5a6a85",
          fontSize: "11px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: activeMode === "dark" ? "#7c8fac" : "#5a6a85",
          fontSize: "11px",
        },
        formatter: (val) => {
          if (selectedAsset.includes("BTC")) return `$${val.toLocaleString()}`;
          if (selectedAsset.includes("ETH")) return `$${val.toLocaleString()}`;
          if (selectedAsset.includes("XRP")) return `$${val.toFixed(3)}`;
          return val.toFixed(4);
        },
      },
    },
    grid: {
      borderColor: activeMode === "dark" ? "#333f55" : "#e5e7eb",
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: activeMode === "dark" ? "dark" : "light",
      x: {
        show: true,
      },
      y: {
        formatter: (val) => {
          if (selectedAsset.includes("BTC") || selectedAsset.includes("ETH")) 
            return `$${val.toLocaleString()}`;
          if (selectedAsset.includes("XRP")) return `$${val.toFixed(3)}`;
          return val.toFixed(4);
        },
      },
    },
  };

  const chartSeries = [
    {
      name: selectedAsset,
      data: data.prices,
    },
  ];

  const formatPrice = (price: number) => {
    if (selectedAsset.includes("BTC") || selectedAsset.includes("ETH")) {
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (selectedAsset.includes("XRP")) {
      return `$${price.toFixed(3)}`;
    }
    return price.toFixed(4);
  };

  return (
    <Card className="border-0 shadow-md dark:bg-black dark:shadow-dark-md overflow-hidden">
      {/* Header Section - Behance inspired clean layout */}
      <CardHeader className="pb-0">
        {/* Category Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <Tabs value={category} onValueChange={(val) => {
            setCategory(val as "crypto" | "forex");
            setSelectedAsset(assetCategories[val as "crypto" | "forex"][0]);
          }}>
            <TabsList className="bg-gray-100/80 dark:bg-darkgray/50 p-1 rounded-xl">
              <TabsTrigger 
                value="crypto" 
                className="rounded-lg px-6 py-2 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-dark data-[state=active]:shadow-sm"
              >
                <Icon icon="cryptocurrency:btc" className="mr-2 h-4 w-4" />
                Crypto
              </TabsTrigger>
              <TabsTrigger 
                value="forex"
                className="rounded-lg px-6 py-2 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-dark data-[state=active]:shadow-sm"
              >
                <Icon icon="mdi:currency-usd" className="mr-2 h-4 w-4" />
                Forex
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-darkgray/50 p-1 rounded-xl">
            {["1H", "4H", "1D", "1W", "1M"].map((tf) => (
              <Button
                key={tf}
                variant="ghost"
                size="sm"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  timeframe === tf 
                    ? "bg-white dark:bg-dark shadow-sm text-dark dark:text-white" 
                    : "text-muted hover:text-dark dark:hover:text-white"
                )}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* Asset Selector Pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {assetCategories[category].map((asset) => {
            const assetData = mockPriceData[asset];
            const isActive = selectedAsset === asset;
            const isUp = assetData.change >= 0;
            
            return (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 border-primary dark:bg-primary/20" 
                    : "bg-white dark:bg-darkgray/30 border-gray-200 dark:border-darkborder hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  asset.includes("BTC") && "bg-amber-500/10",
                  asset.includes("ETH") && "bg-indigo-500/10",
                  asset.includes("XRP") && "bg-gray-500/10",
                  asset.includes("EUR") && "bg-blue-500/10",
                  asset.includes("GBP") && "bg-red-500/10",
                )}>
                  <Icon 
                    icon={
                      asset.includes("BTC") ? "cryptocurrency-color:btc" :
                      asset.includes("ETH") ? "cryptocurrency-color:eth" :
                      asset.includes("XRP") ? "cryptocurrency-color:xrp" :
                      asset.includes("EUR") ? "circle-flags:eu" :
                      "circle-flags:gb"
                    } 
                    className="h-6 w-6"
                  />
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-semibold text-sm",
                    isActive ? "text-primary" : "text-dark dark:text-white"
                  )}>
                    {asset}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{formatPrice(assetData.currentPrice)}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      isUp ? "text-success" : "text-error"
                    )}>
                      {isUp ? "+" : ""}{assetData.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Price Display */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold text-dark dark:text-white tracking-tight">
                {formatPrice(data.currentPrice)}
              </h1>
              <Badge 
                variant="outline"
                className={cn(
                  "px-3 py-1 text-sm font-semibold rounded-full border-0",
                  isPositive 
                    ? "bg-success/10 text-success" 
                    : "bg-error/10 text-error"
                )}
              >
                <Icon 
                  icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"} 
                  className="mr-1 h-4 w-4" 
                />
                {isPositive ? "+" : ""}{data.change.toFixed(2)}%
              </Badge>
            </div>
            <p className="text-sm text-muted">
              Last updated: {new Date().toLocaleTimeString()} • {timeframe} Chart
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">24h High</p>
              <p className="font-semibold text-dark dark:text-white">{formatPrice(data.high)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">24h Low</p>
              <p className="font-semibold text-dark dark:text-white">{formatPrice(data.low)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Volume</p>
              <p className="font-semibold text-dark dark:text-white">${data.volume}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Chart Section */}
      <CardContent className="pt-4 pb-2">
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="area"
          height={320}
          width="100%"
        />
      </CardContent>

      {/* Action Buttons - Behance style */}
      <div className="px-6 pb-6">
        <div className="flex gap-3">
          <Button 
            className="flex-1 bg-success hover:bg-success/90 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-success/25 transition-all hover:shadow-xl hover:shadow-success/30"
          >
            <Icon icon="solar:arrow-up-bold" className="mr-2 h-5 w-5" />
            Buy {selectedAsset.split("/")[0]}
          </Button>
          <Button 
            className="flex-1 bg-error hover:bg-error/90 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-error/25 transition-all hover:shadow-xl hover:shadow-error/30"
          >
            <Icon icon="solar:arrow-down-bold" className="mr-2 h-5 w-5" />
            Sell {selectedAsset.split("/")[0]}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TradingChart;
