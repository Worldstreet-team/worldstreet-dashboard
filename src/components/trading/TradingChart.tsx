"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickData, Time } from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { cn } from "@/lib/utils";

interface TradingChartProps {
  pair?: string;
}

const TradingChart = ({ pair = "BTCUSDC" }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("1m");

  const { lastPrice } = useTradingStore();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0b0e11" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { labelBackgroundColor: "#4b5563" },
        horzLine: { labelBackgroundColor: "#4b5563" },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "", // Overlay on main chart
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Initial data fetch
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const symbol = pair.replace("/", "").toUpperCase();
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
        const data = await res.json();

        const formattedData: CandlestickData<Time>[] = data.map((d: any) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        const formattedVolume = data.map((d: any) => ({
          time: (d[0] / 1000) as Time,
          value: parseFloat(d[5]),
          color: parseFloat(d[4]) >= parseFloat(d[1]) ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
        }));

        candleSeries.setData(formattedData);
        volumeSeries.setData(formattedVolume);
        setLoading(false);
      } catch (e) {
        console.error("History fetch failed", e);
      }
    };

    fetchHistory();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [pair, timeframe]);

  return (
    <div className="w-full h-full bg-[#0b0e11] flex flex-col relative group">
      {/* Chart Top Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/5 bg-[#161a1e] z-10">
        <div className="flex bg-white/5 rounded-sm p-0.5">
          {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors",
                timeframe === tf ? "bg-[#1e2329] text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="h-4 w-[1px] bg-white/10 mx-1" />
        <span className="text-[11px] font-mono font-bold text-gray-400">
          {pair} · {timeframe}
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e11]/80 z-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      )}

      <div ref={chartContainerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
};

export default TradingChart;
