"use client";

import React, { useEffect, useRef, useState, useCallback, useContext, memo } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { ChartEngine, Candle } from "@/lib/chart/ChartEngine";
import { DataFeedService, Interval } from "@/lib/chart/DataFeedService";
import { CustomizerContext } from "@/app/context/customizerContext";

// ─── Symbol mapping ──────────────────────────────────────────────────
// The backend kline API expects symbols like "BTCUSDT"
const toKlineSymbol = (symbol: string): string => `${symbol}USDT`;

// ─── Timeframe options ───────────────────────────────────────────────
const TIMEFRAMES: { label: string; value: Interval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
];

interface DashboardChartProps {
  /** Short symbol, e.g. "BTC" */
  symbol?: string;
}

const DashboardChart = ({ symbol = "BTC" }: DashboardChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartEngineRef = useRef<ChartEngine | null>(null);
  const dataFeedRef = useRef<DataFeedService | null>(null);
  const isFirstLoad = useRef(true);

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === "dark";

  const [interval, setInterval] = useState<Interval>("1d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Initialise chart engine (once) ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ChartEngine(containerRef.current);
    engine.initChart(isDark);
    chartEngineRef.current = engine;

    return () => {
      engine.destroy();
      chartEngineRef.current = null;
    };
    // Only re-create chart engine when the container mounts.
    // Theme is applied separately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Theme sync ──────────────────────────────────────────────────
  useEffect(() => {
    chartEngineRef.current?.updateTheme(isDark);
  }, [isDark]);

  // ─── Load data + connect WebSocket ───────────────────────────────
  const loadData = useCallback(
    async (sym: string, int: Interval) => {
      setIsLoading(true);
      setError(null);

      // Clean up previous feed
      dataFeedRef.current?.disconnect();

      const klineSym = toKlineSymbol(sym);

      const feed = new DataFeedService(
        klineSym,
        int,
        // Live candle callback
        (candle: Candle) => {
          chartEngineRef.current?.updateCandle(candle);
        },
        // Error callback – silently swallow WS errors (backend may be offline)
        () => {}
      );

      dataFeedRef.current = feed;

      try {
        const candles = await feed.fetchHistoricalData();
        if (candles.length > 0) {
          chartEngineRef.current?.setHistoricalData(candles);
        } else {
          setError("No data available for this pair");
        }
      } catch {
        setError("Failed to load chart data");
      } finally {
        setIsLoading(false);
        isFirstLoad.current = false;
      }

      // NOTE: WebSocket live feed is skipped because the backend
      // (trading.watchup.site) is currently offline. Historical data
      // is served by CoinGecko via /api/market/[symbol]/klines.
      // When the backend comes back online, uncomment the line below:
      // feed.connectWebSocket();
    },
    []
  );

  // ─── React to symbol / interval changes ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    // Small debounce to avoid double-fetch from StrictMode
    const timer = setTimeout(() => {
      if (!cancelled) loadData(symbol, interval);
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      dataFeedRef.current?.disconnect();
      dataFeedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  // ─── Interval change handler ─────────────────────────────────────
  const handleIntervalChange = (newInterval: Interval) => {
    if (newInterval === interval) return;
    setInterval(newInterval);
  };

  return (
    <div className="flex flex-col w-full h-full rounded-xl border border-border/50 dark:border-darkborder bg-white dark:bg-black overflow-hidden shadow-sm">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 dark:border-darkborder">
        {/* Pair label */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dark dark:text-white">
            {symbol}/USDT
          </span>
          <span className="text-[11px] text-muted">Candlestick</span>
        </div>

        {/* Timeframe pills */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleIntervalChange(tf.value)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 cursor-pointer",
                interval === tf.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-dark dark:hover:text-white hover:bg-muted/20"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart canvas ────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary/20 border-t-primary" />
              <span className="text-xs text-muted">Loading chart…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <Icon icon="solar:chart-broken" className="h-8 w-8 text-muted" />
              <p className="text-xs text-muted">{error}</p>
              <button
                onClick={() => loadData(symbol, interval)}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(DashboardChart);
