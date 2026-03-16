"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
} from "lightweight-charts";

interface HyperliquidChartProps {
  symbol: string; // e.g. "BTCUSD", "BTC/USD", "BTC-USD", "ETHUSDC"
}

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
] as const;

function extractBase(symbol: string): string {
  return symbol
    .replace(/[\/\-_]/g, "")
    .replace(/(USDC|USDT|USD|USDH)$/i, "")
    .toUpperCase();
}

const HyperliquidChart = ({ symbol }: HyperliquidChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [interval, setInterval] = useState("30m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseCoin = extractBase(symbol);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: "#0b0e11" },
        textColor: "#848e9c",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.15)" },
        horzLines: { color: "rgba(42, 46, 57, 0.15)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(224, 227, 235, 0.1)", style: 0 },
        horzLine: { color: "rgba(224, 227, 235, 0.1)", style: 0 },
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    resizeObserverRef.current = ro;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Fetch candles + connect WS whenever symbol or interval changes
  const fetchAndStream = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    setLoading(true);
    setError(null);

    // Disconnect previous WS
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const res = await fetch(
        `/api/hyperliquid/candles?coin=${encodeURIComponent(baseCoin)}&interval=${interval}&limit=500`
      );
      const json = await res.json();

      if (!json.success || !json.data?.length) {
        setError("No candle data available");
        setLoading(false);
        return;
      }

      const candles: CandlestickData[] = json.data.map((c: any) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      const volumes: HistogramData[] = json.data.map((c: any) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(14, 203, 129, 0.35)" : "rgba(246, 70, 93, 0.35)",
      }));

      candleSeriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);
      chartRef.current?.timeScale().fitContent();
      setLoading(false);

      // The API returns the resolved HL coin name for WebSocket subscription
      const hlCoinName = json.coinName || baseCoin;

      // Connect WebSocket for live candle updates
      const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            method: "subscribe",
            subscription: { type: "candle", coin: hlCoinName, interval },
          })
        );
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.channel === "candle" && msg.data) {
            const c = msg.data;
            const time = Math.floor(c.t / 1000) as UTCTimestamp;
            candleSeriesRef.current?.update({
              time,
              open: Number(c.o),
              high: Number(c.h),
              low: Number(c.l),
              close: Number(c.c),
            });
            volumeSeriesRef.current?.update({
              time,
              value: Number(c.v),
              color:
                Number(c.c) >= Number(c.o)
                  ? "rgba(14, 203, 129, 0.35)"
                  : "rgba(246, 70, 93, 0.35)",
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        console.warn("[HyperliquidChart] WS error – live updates unavailable");
      };
    } catch (err: any) {
      console.error("[HyperliquidChart]", err);
      setError("Failed to load chart data");
      setLoading(false);
    }
  }, [baseCoin, interval]);

  useEffect(() => {
    fetchAndStream();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchAndStream]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0e11] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#2a2e39] flex-shrink-0">
        <span className="text-xs font-semibold text-white mr-2">
          {baseCoin}/USD
        </span>
        <span className="text-[10px] text-[#848e9c] mr-3">Hyperliquid</span>
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              interval === iv.value
                ? "bg-[#2b3139] text-white font-semibold"
                : "text-[#848e9c] hover:text-white"
            }`}
          >
            {iv.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/80 z-10">
            <div className="flex items-center gap-2 text-[#848e9c] text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading chart...
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/80 z-10">
            <div className="text-center">
              <p className="text-[#f6465d] text-sm mb-2">{error}</p>
              <button
                onClick={fetchAndStream}
                className="text-xs text-[#848e9c] underline hover:text-white"
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

export default memo(HyperliquidChart);
