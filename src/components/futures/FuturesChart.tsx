'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { useFuturesStore } from '@/store/futuresStore';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface FuturesChartProps {
  symbol?: string;
  isDarkMode?: boolean;
}

export const FuturesChart: React.FC<FuturesChartProps> = ({
  symbol: propSymbol,
  isDarkMode = true,
}) => {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
  const symbol = propSymbol || selectedMarket?.symbol || 'BTC-PERP';
  
  const [timeInterval, setTimeInterval] = useState('1min');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'active' | 'paused' | 'error'>('paused');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    let retryCount = 0;
    const maxRetries = 10;

    const tryInitChart = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      if (width === 0 || height === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryInitChart, 200);
        }
        return;
      }

      try {
        // Clean up existing chart
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

        // Fetch data immediately
        if (symbol) {
          fetchAndUpdateData(symbol);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    };

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
  }, [symbol]);

  // Fetch and update chart data
  const fetchAndUpdateData = useCallback(async (pair: string) => {
    try {
      const response = await fetch(
        `/api/futures/klines?symbol=${pair}&interval=${timeInterval}`
      );

      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        return;
      }

      const data = await response.json();

      if (!data || !Array.isArray(data)) {
        console.error('Invalid response format:', data);
        return;
      }

      // Convert to lightweight-charts format
      const candles: CandleData[] = data
        .map((k: any) => ({
          time: k.time, // Already in seconds
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
        }))
        .sort((a: CandleData, b: CandleData) => a.time - b.time);

      if (seriesRef.current && candles.length > 0) {
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
        setIsLoading(false);
        
        // Update price stats
        setCurrentPrice(candles[candles.length - 1].close);
        if (candles.length > 1) {
          const change = ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100;
          setPriceChange(change);
        }
        
        setPollingStatus('active');
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setIsLoading(false);
      setPollingStatus('error');
    }
  }, [timeInterval]);

  // Set up polling for data updates
  useEffect(() => {
    if (!symbol) return;

    // Wait for chart to initialize
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
  }, [symbol, timeInterval, fetchAndUpdateData]);

  return (
    <div className="flex flex-col h-full bg-[#181a20]">
      {/* Chart Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
        <div className="flex items-center gap-4">
          {/* Symbol Display */}
          <div>
            <h3 className="text-sm font-semibold text-white">{symbol}</h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  ${currentPrice?.toFixed(2) || 0}
                </span>
                {priceChange !== null && (
                  <span className={`text-xs font-medium ${priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2) || 0}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Polling Status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              pollingStatus === 'active' ? 'bg-[#0ecb81] animate-pulse' :
              pollingStatus === 'error' ? 'bg-[#f6465d]' :
              'bg-[#fcd535]'
            }`} />
            <span className="text-xs text-[#848e9c]">
              {pollingStatus === 'active' ? 'Live' :
               pollingStatus === 'error' ? 'Error' :
               'Paused'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Interval Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimeInterval('1min')}
              className={`px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timeInterval === '1min'
                  ? 'bg-[#fcd535] text-[#181a20]'
                  : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
              }`}
            >
              1m
            </button>
            <button
              onClick={() => setTimeInterval('5min')}
              className={`px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timeInterval === '5min'
                  ? 'bg-[#fcd535] text-[#181a20]'
                  : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
              }`}
            >
              5m
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181a20]/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535]" height={48} />
              <span className="text-sm text-[#848e9c]">Loading chart...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 max-w-[90%]">
            <div className="bg-[#f6465d]/10 border border-[#f6465d]/20 rounded px-4 py-2 flex items-center gap-2">
              <Icon icon="ph:warning" className="text-[#f6465d]" height={18} />
              <span className="text-sm text-[#f6465d]">{error}</span>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full"></div>
      </div>
    </div>
  );
};
