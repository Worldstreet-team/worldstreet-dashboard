'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import * as echarts from 'echarts/core';
import { CandlestickChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useFuturesStore } from '@/store/futuresStore';

// Register ECharts components
echarts.use([
  CandlestickChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

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
  const chartRef = useRef<echarts.ECharts | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  // Initialize ECharts
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
          chartRef.current.dispose();
          chartRef.current = null;
        }

        // Initialize ECharts instance
        const chart = echarts.init(containerRef.current, null, {
          renderer: 'canvas',
          width,
          height,
        });

        // Set initial chart options
        chart.setOption({
          backgroundColor: '#181a20',
          grid: {
            left: '3%',
            right: '3%',
            top: '10%',
            bottom: '15%',
            containLabel: true,
          },
          xAxis: {
            type: 'category',
            data: [],
            axisLine: { lineStyle: { color: '#2b3139' } },
            axisLabel: {
              color: '#848e9c',
              fontSize: 11,
              formatter: (value: string) => {
                const date = new Date(parseInt(value) * 1000);
                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
              },
            },
            splitLine: { show: false },
          },
          yAxis: {
            type: 'value',
            scale: true,
            axisLine: { lineStyle: { color: '#2b3139' } },
            axisLabel: {
              color: '#848e9c',
              fontSize: 11,
            },
            splitLine: {
              lineStyle: {
                color: '#2b3139',
                type: 'dashed',
              },
            },
          },
          series: [
            {
              type: 'candlestick',
              data: [],
              itemStyle: {
                color: '#0ecb81',
                color0: '#f6465d',
                borderColor: '#0ecb81',
                borderColor0: '#f6465d',
              },
              markLine: {
                symbol: 'none',
                data: [],
                animation: false,
              },
            },
          ],
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross',
              lineStyle: {
                color: '#2b3139',
                type: 'dashed',
              },
            },
            backgroundColor: '#1e2329',
            borderColor: '#2b3139',
            textStyle: {
              color: '#848e9c',
            },
            formatter: (params: any) => {
              const data = params[0];
              if (!data || !data.data) return '';
              const [open, close, low, high] = data.data;
              const time = new Date(parseInt(data.name) * 1000);
              return `
                <div style="padding: 8px;">
                  <div style="margin-bottom: 4px; color: #fff;">${time.toLocaleString()}</div>
                  <div>Open: <span style="color: #fff;">${open.toFixed(2)}</span></div>
                  <div>High: <span style="color: #0ecb81;">${high.toFixed(2)}</span></div>
                  <div>Low: <span style="color: #f6465d;">${low.toFixed(2)}</span></div>
                  <div>Close: <span style="color: #fff;">${close.toFixed(2)}</span></div>
                </div>
              `;
            },
          },
          dataZoom: [
            {
              type: 'inside',
              start: 0,
              end: 100,
              minValueSpan: 10,
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
              borderColor: '#2b3139',
              fillerColor: 'rgba(252, 213, 53, 0.2)',
              handleStyle: {
                color: '#fcd535',
              },
              textStyle: {
                color: '#848e9c',
              },
            },
          ],
        });

        chartRef.current = chart;

        // Fetch data immediately
        if (symbol) {
          fetchAndUpdateData(symbol);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
        setError('Failed to initialize chart');
      }
    };

    const initTimeout = setTimeout(tryInitChart, 100);

    // Handle window resize
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.dispose();
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
        setPollingStatus('error');
        return;
      }

      const data = await response.json();

      if (!data || !Array.isArray(data)) {
        console.error('Invalid response format:', data);
        setPollingStatus('error');
        return;
      }

      // Convert to ECharts candlestick format
      const candles: CandleData[] = data
        .map((k: any) => ({
          time: k.time,
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
        }))
        .sort((a: CandleData, b: CandleData) => a.time - b.time);

      if (chartRef.current && candles.length > 0) {
        // Format data for ECharts: [open, close, low, high]
        const chartData = candles.map(c => [c.open, c.close, c.low, c.high]);
        const timeData = candles.map(c => c.time.toString());

        // Get current price (last candle's close)
        const latestPrice = candles[candles.length - 1].close;

        chartRef.current.setOption({
          xAxis: {
            data: timeData,
          },
          series: [
            {
              data: chartData,
              markLine: {
                symbol: 'none',
                animation: false,
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: '{c}',
                  color: '#3b82f6',
                  fontSize: 11,
                  backgroundColor: '#3b82f6',
                  padding: [2, 6],
                  borderRadius: 3,
                },
                lineStyle: {
                  color: '#3b82f6',
                  type: 'solid',
                  width: 2,
                },
                data: [
                  {
                    yAxis: latestPrice,
                  },
                ],
              },
            },
          ],
        });

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
      <div className="relative flex-1 min-h-0 overflow-hidden">
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
