"use client";
import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ApexOptions } from "apexcharts";
import { Icon } from "@iconify/react";
import { CustomizerContext } from "@/app/context/customizerContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Asset definitions (crypto only) ────────────────────────────────────────

interface AssetInfo {
  symbol: string;
  pair: string;
  icon: string;
  bgColor: string;
}

const CRYPTO_ASSETS: AssetInfo[] = [
  { symbol: "BTC", pair: "BTC/USD", icon: "cryptocurrency-color:btc", bgColor: "bg-amber-500/10" },
  { symbol: "ETH", pair: "ETH/USD", icon: "cryptocurrency-color:eth", bgColor: "bg-indigo-500/10" },
  { symbol: "XRP", pair: "XRP/USD", icon: "cryptocurrency-color:xrp", bgColor: "bg-gray-500/10" },
];

const TIMEFRAMES = ["1H", "4H", "1D", "1W", "1M"] as const;

// ── Chart data types ───────────────────────────────────────────────────────

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

interface ChartApiResponse {
  data: ChartDataPoint[];
  high: number;
  low: number;
  volume: string;
  currentPrice: number;
  change: number;
  cached: boolean;
  error?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

const TradingChart = () => {
  const { activeMode } = useContext(CustomizerContext);
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState({ high: 0, low: 0, volume: "0", currentPrice: 0, change: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch chart data from our API route
  const fetchChartData = useCallback(async (symbol: string, tf: string) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chart?symbol=${symbol}&timeframe=${tf}`, {
        signal: controller.signal,
      });
      const data: ChartApiResponse = await res.json();

      if (data.error && data.data.length === 0) {
        setError(data.error);
        return;
      }

      setChartData(data.data);
      setStats({
        high: data.high,
        low: data.low,
        volume: data.volume,
        currentPrice: data.currentPrice,
        change: data.change,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Failed to fetch chart:", err);
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when asset or timeframe changes
  useEffect(() => {
    fetchChartData(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, fetchChartData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChartData(selectedSymbol, timeframe);
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedSymbol, timeframe, fetchChartData]);

  const isPositive = stats.change >= 0;

  // Format timestamps for x-axis labels
  const dateLabels = chartData.map((point) => {
    const d = new Date(point.timestamp);
    if (timeframe === "1H" || timeframe === "4H" || timeframe === "1D") {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  });

  const priceValues = chartData.map((point) => point.price);

  // Chart config
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 350,
      fontFamily: "inherit",
      foreColor: activeMode === "dark" ? "#94a3b8" : "#64748b",
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: { enabled: true, speed: 600, dynamicAnimation: { speed: 350 } },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: [isPositive ? "var(--color-success)" : "var(--color-error)"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 90, 100],
        colorStops: [
          { offset: 0, color: isPositive ? "var(--color-success)" : "var(--color-error)", opacity: 0.3 },
          { offset: 100, color: isPositive ? "var(--color-success)" : "var(--color-error)", opacity: 0.05 },
        ],
      },
    },
    xaxis: {
      categories: dateLabels,
      labels: {
        style: { colors: activeMode === "dark" ? "#94a3b8" : "#64748b", fontSize: "11px" },
        rotate: 0,
        maxHeight: 30,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: Math.min(dateLabels.length, 10),
    },
    yaxis: {
      labels: {
        style: { colors: activeMode === "dark" ? "#94a3b8" : "#64748b", fontSize: "11px" },
        formatter: (val) => formatPrice(val, selectedSymbol),
      },
    },
    grid: {
      borderColor: activeMode === "dark" ? "#1e293b" : "#f1f5f9",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: activeMode === "dark" ? "dark" : "light",
      x: { show: true },
      y: {
        formatter: (val) => formatPrice(val, selectedSymbol),
      },
    },
  };

  const chartSeries = [{ name: `${selectedSymbol}/USD`, data: priceValues }];

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder overflow-hidden animate-fade-in-up">
      <CardHeader className="pb-0">
        {/* Header & Timeframe */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Icon icon="cryptocurrency:btc" className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-dark dark:text-white">Crypto</span>
          </div>
          <div className="flex items-center gap-0.5 bg-muted/40 dark:bg-white/5 p-0.5 rounded-lg">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf}
                variant="ghost"
                size="sm"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all h-7",
                  timeframe === tf
                    ? "bg-white dark:bg-darkgray shadow-sm text-dark dark:text-white"
                    : "text-muted hover:text-dark dark:hover:text-white"
                )}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* Asset selector pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CRYPTO_ASSETS.map((asset) => {
            const isActive = selectedSymbol === asset.symbol;
            return (
              <button
                key={asset.symbol}
                onClick={() => setSelectedSymbol(asset.symbol)}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-200",
                  isActive
                    ? "bg-primary/5 border-primary/30 dark:bg-primary/10"
                    : "bg-white dark:bg-darkgray/20 border-border dark:border-darkborder hover:border-primary/30"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", asset.bgColor)}>
                  <Icon icon={asset.icon} className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={cn("font-medium text-xs", isActive ? "text-primary" : "text-dark dark:text-white")}>
                    {asset.pair}
                  </p>
                  {isActive && !loading ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted">{formatPrice(stats.currentPrice, asset.symbol)}</span>
                      <span className={cn("text-[10px] font-medium", isPositive ? "text-success" : "text-error")}>
                        {isPositive ? "+" : ""}{stats.change.toFixed(2)}%
                      </span>
                    </div>
                  ) : isActive && loading ? (
                    <span className="text-[11px] text-muted">Loading...</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Price display */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            {loading && chartData.length === 0 ? (
              <div className="h-10 w-48 bg-muted/30 dark:bg-white/5 rounded animate-pulse" />
            ) : error ? (
              <p className="text-sm text-error">{error}</p>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-3xl font-bold text-dark dark:text-white tracking-tight">
                    {formatPrice(stats.currentPrice, selectedSymbol)}
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded border-0",
                      isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error"
                    )}
                  >
                    <Icon
                      icon={isPositive ? "solar:arrow-up-linear" : "solar:arrow-down-linear"}
                      className="mr-0.5 h-3 w-3"
                    />
                    {isPositive ? "+" : ""}{stats.change.toFixed(2)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  Last updated: {new Date().toLocaleTimeString()} &bull; {timeframe} Chart
                </p>
              </>
            )}
          </div>
          {!loading && !error && (
            <div className="flex gap-5">
              {[
                { label: "24h High", value: formatPrice(stats.high, selectedSymbol) },
                { label: "24h Low", value: formatPrice(stats.low, selectedSymbol) },
                { label: "Volume", value: "$" + stats.volume },
              ].map((stat, i) => (
                <div key={i} className="text-right">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{stat.label}</p>
                  <p className="font-semibold text-sm text-dark dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-1">
        {loading && chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted">Loading chart data...</p>
            </div>
          </div>
        ) : error && chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <Icon icon="solar:danger-triangle-bold-duotone" className="h-8 w-8 text-warning" />
              <p className="text-sm text-muted">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchChartData(selectedSymbol, timeframe)}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <Chart options={chartOptions} series={chartSeries} type="area" height={300} width="100%" />
        )}
      </CardContent>

      <div className="px-6 pb-5">
        <div className="flex gap-2.5">
          <Button
            onClick={() => router.push("/assets")}
            className="flex-1 bg-success hover:bg-success/90 text-white font-medium py-5 rounded-lg text-sm shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Icon icon="solar:arrow-up-bold" className="mr-1.5 h-4 w-4" /> Buy {selectedSymbol}
          </Button>
          <Button
            onClick={() => router.push("/assets")}
            className="flex-1 bg-error hover:bg-error/90 text-white font-medium py-5 rounded-lg text-sm shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Icon icon="solar:arrow-down-bold" className="mr-1.5 h-4 w-4" /> Sell {selectedSymbol}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ── Utilities ──────────────────────────────────────────────────────────────

function formatPrice(price: number, symbol: string): string {
  if (symbol === "XRP" || price < 1) {
    return "$" + price.toFixed(4);
  }
  return "$" + price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default TradingChart;
