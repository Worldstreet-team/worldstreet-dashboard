'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

// Timeframe options
const TIMEFRAMES: { label: string; value: string }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

interface LiveChartProps {
  symbol: string;
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}

const LiveChart = ({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [interval, setTimeInterval] = useState('1d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');

  // Update temp values when props change
  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const initChart = async () => {
      try {
        const { createChart } = await import('lightweight-charts');
        
        const chart = createChart(containerRef.current!, {
          layout: {
            textColor: '#848e9c',
            background: { color: '#181a20' },
          },
          width: containerRef.current!.clientWidth,
          height: containerRef.current!.clientHeight,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        const candleSeries = chart.addCandlestickSeries({
          upColor: '#0ecb81',
          downColor: '#f6465d',
          borderUpColor: '#0ecb81',
          borderDownColor: '#f6465d',
          wickUpColor: '#0ecb81',
          wickDownColor: '#f6465d',
        });

        chartRef.current = chart;
        seriesRef.current = candleSeries;

        // Generate mock data
        const mockData = generateMockCandles();
        candleSeries.setData(mockData);
        chart.timeScale().fitContent();

        setIsLoading(false);

        // Handle resize
        const handleResize = () => {
          if (containerRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            });
          }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      } catch (err) {
        console.error('Chart initialization error:', err);
        setError('Failed to load chart');
        setIsLoading(false);
      }
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  const generateMockCandles = () => {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const basePrice = 69201.46;

    for (let i = 100; i >= 0; i--) {
      const time = now - i * 86400; // Daily candles
      const open = basePrice + (Math.random() - 0.5) * 1000;
      const close = open + (Math.random() - 0.5) * 1000;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;

      candles.push({
        time,
        open,
        high,
        low,
        close,
      });
    }

    return candles;
  };

  const handleIntervalChange = (newInterval: string) => {
    if (newInterval === interval) return;
    setTimeInterval(newInterval);
    // In a real app, you'd fetch new data for the selected interval
  };

  const handleUpdateLevels = () => {
    if (onUpdateLevels) {
      onUpdateLevels(tempStopLoss, tempTakeProfit);
    }
    setShowLevelsForm(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#181a20] border-r border-[#2b3139] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 py-1 border-b border-[#2b3139] gap-1">
        {/* Left: Pair label */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-white">
            {symbol.replace('-', '/')}
          </span>
          <span className="text-[8px] text-[#848e9c]">Candlestick</span>

          {/* TP/SL Indicators */}
          {(stopLoss || takeProfit) && (
            <div className="flex items-center gap-1 text-[8px]">
              {stopLoss && (
                <span className="px-1 py-0.5 bg-[#f6465d]/10 text-[#f6465d] font-semibold rounded text-[8px]">
                  SL: {parseFloat(stopLoss).toFixed(2)}
                </span>
              )}
              {takeProfit && (
                <span className="px-1 py-0.5 bg-[#0ecb81]/10 text-[#0ecb81] font-semibold rounded text-[8px]">
                  TP: {parseFloat(takeProfit).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Timeframes + TP/SL button */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Timeframe pills */}
          <div className="flex items-center gap-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleIntervalChange(tf.value)}
                className={cn(
                  'px-1.5 py-0.5 text-[9px] font-medium rounded transition-all duration-200',
                  interval === tf.value
                    ? 'bg-[#fcd535] text-[#181a20]'
                    : 'text-[#848e9c] hover:text-white hover:bg-[#2b3139]'
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* TP/SL Button */}
          {onUpdateLevels && (
            <button
              onClick={() => setShowLevelsForm(!showLevelsForm)}
              className={cn(
                'px-2 py-0.5 text-[9px] font-medium rounded transition-colors',
                showLevelsForm
                  ? 'bg-[#fcd535] text-[#181a20]'
                  : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
              )}
            >
              {showLevelsForm ? 'Cancel' : 'TP/SL'}
            </button>
          )}
        </div>
      </div>

      {/* Levels Form */}
      {showLevelsForm && onUpdateLevels && (
        <div className="px-2 py-1.5 border-b border-[#2b3139] bg-[#2b3139]/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1">
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

      {/* Chart canvas */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181a20]/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fcd535]/20 border-t-[#fcd535]" />
              <span className="text-[9px] text-[#848e9c]">Loading chart…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181a20]/90 z-10">
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <Icon icon="solar:chart-broken" className="h-6 w-6 text-[#848e9c]" />
              <p className="text-[9px] text-[#848e9c]">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(LiveChart);
