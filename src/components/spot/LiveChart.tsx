'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { cn } from '@/lib/utils';

interface LiveChartProps {
  symbol: string;
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const LiveChart = ({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) => {
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');
  const [isLoading, setIsLoading] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  // Initialize chart with a delay to ensure container has dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    let retryCount = 0;
    const maxRetries = 10;

    const tryInitChart = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      console.log('Chart container dimensions:', { width, height, retryCount });

      if (width === 0 || height === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Chart container has no dimensions, retrying... (${retryCount}/${maxRetries})`);
          setTimeout(tryInitChart, 200);
        }
        return;
      }

      try {
        // Clean up existing chart if any
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#181a20' },
            textColor: '#848e9c',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          width: width,
          height: height,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            fixLeftEdge: true,
            fixRightEdge: true,
          },
          crosshair: {
            mode: 1,
            vertLine: {
              color: '#2b3139',
              width: 1,
              style: 2,
            },
            horzLine: {
              color: '#2b3139',
              width: 1,
              style: 2,
            },
          },
          grid: {
            vertLines: { color: '#2b3139', style: 2 },
            horzLines: { color: '#2b3139', style: 2 },
          },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#0ecb81',
          downColor: '#f6465d',
          borderUpColor: '#0ecb81',
          borderDownColor: '#f6465d',
          wickUpColor: '#0ecb81',
          wickDownColor: '#f6465d',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        console.log('Chart initialized successfully');

        // Fetch data immediately after initialization
        if (symbol) {
          fetchAndUpdateData(symbol);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    };

    // Start initialization after a small delay
    const initTimeout = setTimeout(tryInitChart, 100);

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
          chartRef.current.applyOptions({
            width: newWidth,
            height: newHeight,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol]); // Re-initialize when symbol changes

  // Fetch and update chart data
  const fetchAndUpdateData = useCallback(async (pair: string) => {
    try {
      const url = `/api/kucoin/candles?symbol=${encodeURIComponent(pair)}&type=1hour&limit=100`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        return;
      }

      // Sort candles by time
      const candles: CandleData[] = data.data
        .map((candle: any) => ({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))
        .sort((a: CandleData, b: CandleData) => a.time - b.time);

      if (seriesRef.current && candles.length > 0) {
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
        setIsLoading(false);
        console.log('Chart updated with', candles.length, 'candles');
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setIsLoading(false);
    }
  }, []);

  // Set up polling for data updates
  useEffect(() => {
    if (!symbol) return;

    // Wait a bit for chart to initialize, then start fetching
    const startPolling = setTimeout(() => {
      // Initial fetch
      fetchAndUpdateData(symbol);

      // Set up polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchAndUpdateData(symbol);
      }, 3000);
    }, 500);

    return () => {
      clearTimeout(startPolling);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [symbol, fetchAndUpdateData]);

  const handleUpdateLevels = () => {
    if (onUpdateLevels) {
      onUpdateLevels(tempStopLoss, tempTakeProfit);
    }
    setShowLevelsForm(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#181a20] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b border-[#2b3139] gap-2 shrink-0">
        {/* Left: Pair label */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-white">
            {symbol.replace('-', '/')}
          </span>
          <span className="text-[8px] text-[#848e9c]">Lightweight Charts</span>

          {/* TP/SL Indicators */}
          {(stopLoss || takeProfit) && (
            <div className="flex items-center gap-1 text-[8px]">
              {stopLoss && (
                <span className="px-1 py-0.5 bg-[#f6465d]/10 text-[#f6465d] font-semibold rounded">
                  SL: {parseFloat(stopLoss).toFixed(2)}
                </span>
              )}
              {takeProfit && (
                <span className="px-1 py-0.5 bg-[#0ecb81]/10 text-[#0ecb81] font-semibold rounded">
                  TP: {parseFloat(takeProfit).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: TP/SL button */}
        {onUpdateLevels && (
          <button
            onClick={() => setShowLevelsForm(!showLevelsForm)}
            className={cn(
              'px-2 py-0.5 text-[9px] font-medium rounded transition-colors shrink-0',
              showLevelsForm
                ? 'bg-[#fcd535] text-[#181a20]'
                : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
            )}
          >
            {showLevelsForm ? 'Cancel' : 'TP/SL'}
          </button>
        )}
      </div>

      {/* Levels Form */}
      {showLevelsForm && onUpdateLevels && (
        <div className="px-3 py-2 border-b border-[#2b3139] bg-[#2b3139]/50 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={tempStopLoss}
              onChange={(e) => setTempStopLoss(e.target.value)}
              placeholder="Stop Loss"
              className="flex-1 px-2 py-1 bg-[#1e2329] border border-[#2b3139] rounded text-[10px] text-white placeholder:text-[#848e9c] focus:outline-none focus:ring-1 focus:ring-[#f6465d]"
            />
            <input
              type="number"
              step="0.01"
              value={tempTakeProfit}
              onChange={(e) => setTempTakeProfit(e.target.value)}
              placeholder="Take Profit"
              className="flex-1 px-2 py-1 bg-[#1e2329] border border-[#2b3139] rounded text-[10px] text-white placeholder:text-[#848e9c] focus:outline-none focus:ring-1 focus:ring-[#0ecb81]"
            />
            <div className="flex gap-1">
              <button
                onClick={handleUpdateLevels}
                className="flex-1 sm:flex-none px-2 py-1 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-[10px] font-medium transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setTempStopLoss('');
                  setTempTakeProfit('');
                  onUpdateLevels('', '');
                  setShowLevelsForm(false);
                }}
                className="flex-1 sm:flex-none px-2 py-1 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white rounded text-[10px] font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181a20]">
            <div className="text-[#848e9c] text-sm">Loading chart...</div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full"></div>
      </div>
    </div>
  );
};

export default LiveChart;
