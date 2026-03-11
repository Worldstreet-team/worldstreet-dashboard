'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { cn } from '@/lib/utils';

// Register ECharts components
echarts.use([
  CandlestickChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

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
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  // Initialize ECharts with a delay to ensure container has dimensions
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
          chartRef.current.dispose();
          chartRef.current = null;
        }

        // Initialize ECharts instance
        const chart = echarts.init(containerRef.current, null, {
          renderer: 'canvas',
          width,
          height,
        });

        // Build mark lines for TP/SL
        const markLineData: any[] = [];
        if (stopLoss && parseFloat(stopLoss) > 0) {
          markLineData.push({
            yAxis: parseFloat(stopLoss),
            lineStyle: { color: '#f6465d', type: 'dashed', width: 2 },
            label: {
              formatter: 'SL: {c}',
              position: 'insideEndTop',
              color: '#f6465d',
              fontSize: 10,
            },
          });
        }
        if (takeProfit && parseFloat(takeProfit) > 0) {
          markLineData.push({
            yAxis: parseFloat(takeProfit),
            lineStyle: { color: '#0ecb81', type: 'dashed', width: 2 },
            label: {
              formatter: 'TP: {c}',
              position: 'insideEndTop',
              color: '#0ecb81',
              fontSize: 10,
            },
          });
        }

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
              fontSize: 10,
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
              fontSize: 10,
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
                data: markLineData,
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
              fontSize: 10,
            },
            formatter: (params: any) => {
              const data = params[0];
              if (!data || !data.data) return '';
              const [open, close, low, high] = data.data;
              const time = new Date(parseInt(data.name) * 1000);
              return `
                <div style="padding: 6px;">
                  <div style="margin-bottom: 3px; color: #fff; font-size: 10px;">${time.toLocaleString()}</div>
                  <div style="font-size: 9px;">Open: <span style="color: #fff;">${open.toFixed(2)}</span></div>
                  <div style="font-size: 9px;">High: <span style="color: #0ecb81;">${high.toFixed(2)}</span></div>
                  <div style="font-size: 9px;">Low: <span style="color: #f6465d;">${low.toFixed(2)}</span></div>
                  <div style="font-size: 9px;">Close: <span style="color: #fff;">${close.toFixed(2)}</span></div>
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
              height: 18,
              bottom: 8,
              borderColor: '#2b3139',
              fillerColor: 'rgba(252, 213, 53, 0.2)',
              handleStyle: {
                color: '#fcd535',
              },
              textStyle: {
                color: '#848e9c',
                fontSize: 9,
              },
            },
          ],
        });

        chartRef.current = chart;

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

  // Update mark lines when TP/SL changes
  useEffect(() => {
    if (!chartRef.current || !currentPrice) return;

    const markLineData: any[] = [
      {
        yAxis: currentPrice,
        lineStyle: {
          color: '#3b82f6',
          type: 'solid',
          width: 2,
        },
        label: {
          show: true,
          position: 'insideEndTop',
          formatter: '{c}',
          color: '#fff',
          fontSize: 10,
          backgroundColor: '#3b82f6',
          padding: [2, 6],
          borderRadius: 3,
        },
      },
    ];

    if (stopLoss && parseFloat(stopLoss) > 0) {
      markLineData.push({
        yAxis: parseFloat(stopLoss),
        lineStyle: { color: '#f6465d', type: 'dashed', width: 2 },
        label: {
          formatter: 'SL: {c}',
          position: 'insideEndTop',
          color: '#f6465d',
          fontSize: 10,
        },
      });
    }
    if (takeProfit && parseFloat(takeProfit) > 0) {
      markLineData.push({
        yAxis: parseFloat(takeProfit),
        lineStyle: { color: '#0ecb81', type: 'dashed', width: 2 },
        label: {
          formatter: 'TP: {c}',
          position: 'insideEndTop',
          color: '#0ecb81',
          fontSize: 10,
        },
      });
    }

    chartRef.current.setOption({
      series: [
        {
          markLine: {
            symbol: 'none',
            animation: false,
            data: markLineData,
          },
        },
      ],
    });
  }, [stopLoss, takeProfit, currentPrice]);

  // Fetch and update chart data
  const fetchAndUpdateData = useCallback(async (pair: string) => {
    try {
      // Convert pair format: Replace USDC with USDT for KuCoin API
      const apiSymbol = pair.replace('-USDC', '-USDT').replace('USDC', 'USDT');
      
      const url = `/api/kucoin/candles?symbol=${encodeURIComponent(apiSymbol)}&type=1hour&limit=100`;
      
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

      if (chartRef.current && candles.length > 0) {
        // Format data for ECharts: [open, close, low, high]
        const chartData = candles.map(c => [c.open, c.close, c.low, c.high]);
        const timeData = candles.map(c => c.time.toString());

        // Get current price (last candle's close)
        const latestPrice = candles[candles.length - 1].close;
        setCurrentPrice(latestPrice);

        // Build mark lines including current price
        const markLineData: any[] = [
          {
            yAxis: latestPrice,
            lineStyle: {
              color: '#3b82f6',
              type: 'solid',
              width: 2,
            },
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: '{c}',
              color: '#fff',
              fontSize: 10,
              backgroundColor: '#3b82f6',
              padding: [2, 6],
              borderRadius: 3,
            },
          },
        ];

        // Add TP/SL lines if they exist
        if (stopLoss && parseFloat(stopLoss) > 0) {
          markLineData.push({
            yAxis: parseFloat(stopLoss),
            lineStyle: { color: '#f6465d', type: 'dashed', width: 2 },
            label: {
              formatter: 'SL: {c}',
              position: 'insideEndTop',
              color: '#f6465d',
              fontSize: 10,
            },
          });
        }
        if (takeProfit && parseFloat(takeProfit) > 0) {
          markLineData.push({
            yAxis: parseFloat(takeProfit),
            lineStyle: { color: '#0ecb81', type: 'dashed', width: 2 },
            label: {
              formatter: 'TP: {c}',
              position: 'insideEndTop',
              color: '#0ecb81',
              fontSize: 10,
            },
          });
        }

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
                data: markLineData,
              },
            },
          ],
        });

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
          <span className="text-[8px] text-[#848e9c]">ECharts</span>

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
