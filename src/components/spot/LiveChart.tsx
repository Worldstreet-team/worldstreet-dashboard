'use client';

import React, { useEffect, useRef, useState, useCallback, useContext, memo } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { ChartEngine, Candle } from '@/lib/chart/ChartEngine';
import { DataFeedService, Interval } from '@/lib/chart/DataFeedService';
import { CustomizerContext } from '@/app/context/customizerContext';

// Symbol mapping - convert "BTC-USDT" to "BTCUSDT"
const toKlineSymbol = (symbol: string): string => symbol.replace('-', '');

// Timeframe options
const TIMEFRAMES: { label: string; value: Interval }[] = [
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
  const chartEngineRef = useRef<ChartEngine | null>(null);
  const dataFeedRef = useRef<DataFeedService | null>(null);
  const isFirstLoad = useRef(true);

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  const [interval, setInterval] = useState<Interval>('1d');
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

  // Initialize chart engine (once)
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ChartEngine(containerRef.current);
    engine.initChart(isDark);
    chartEngineRef.current = engine;

    return () => {
      engine.destroy();
      chartEngineRef.current = null;
    };
  }, []);

  // Theme sync
  useEffect(() => {
    chartEngineRef.current?.updateTheme(isDark);
  }, [isDark]);

  // Load data
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
        // Error callback
        () => {}
      );

      dataFeedRef.current = feed;

      try {
        const candles = await feed.fetchHistoricalData();
        if (candles.length > 0) {
          chartEngineRef.current?.setHistoricalData(candles);
        } else {
          setError('No data available for this pair');
        }
      } catch {
        setError('Failed to load chart data');
      } finally {
        setIsLoading(false);
        isFirstLoad.current = false;
      }
    },
    []
  );

  // React to symbol / interval changes
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) loadData(symbol, interval);
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      dataFeedRef.current?.disconnect();
      dataFeedRef.current = null;
    };
  }, [symbol, interval, loadData]);

  // Interval change handler
  const handleIntervalChange = (newInterval: Interval) => {
    if (newInterval === interval) return;
    setInterval(newInterval);
  };

  const handleUpdateLevels = () => {
    if (onUpdateLevels) {
      onUpdateLevels(tempStopLoss, tempTakeProfit);
    }
    setShowLevelsForm(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-black border-r border-border dark:border-darkborder overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 md:px-3 py-1.5 md:py-2 border-b border-border dark:border-darkborder gap-1.5">
        {/* Left: Pair label */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs md:text-sm font-semibold text-dark dark:text-white">
            {symbol.replace('-', '/')}
          </span>
          <span className="text-[9px] md:text-[10px] text-muted">Candlestick</span>
          
          {/* TP/SL Indicators */}
          {(stopLoss || takeProfit) && (
            <div className="flex items-center gap-1 text-[9px] md:text-[10px]">
              {stopLoss && (
                <span className="px-1 py-0.5 bg-error/10 text-error font-semibold rounded text-[9px]">
                  SL: {parseFloat(stopLoss).toFixed(2)}
                </span>
              )}
              {takeProfit && (
                <span className="px-1 py-0.5 bg-success/10 text-success font-semibold rounded text-[9px]">
                  TP: {parseFloat(takeProfit).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Timeframes + TP/SL button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe pills */}
          <div className="flex items-center gap-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleIntervalChange(tf.value)}
                className={cn(
                  'px-1.5 md:px-2 py-0.5 md:py-1 text-[9px] md:text-[10px] font-medium rounded transition-all duration-200',
                  interval === tf.value
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-dark dark:hover:text-white hover:bg-muted/20 dark:hover:bg-white/5'
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
                'px-2 md:px-2.5 py-0.5 md:py-1 text-[9px] md:text-[10px] font-medium rounded transition-colors',
                showLevelsForm
                  ? 'bg-primary text-white'
                  : 'bg-muted/20 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/30 dark:hover:bg-white/10'
              )}
            >
              {showLevelsForm ? 'Cancel' : 'TP/SL'}
            </button>
          )}
        </div>
      </div>

      {/* Levels Form */}
      {showLevelsForm && onUpdateLevels && (
        <div className="px-2 md:px-3 py-1.5 md:py-2 border-b border-border dark:border-darkborder bg-muted/20 dark:bg-white/5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              value={tempStopLoss}
              onChange={(e) => setTempStopLoss(e.target.value)}
              placeholder="Stop Loss"
              className="flex-1 px-2 py-1.5 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
            />
            <input
              type="number"
              step="0.01"
              value={tempTakeProfit}
              onChange={(e) => setTempTakeProfit(e.target.value)}
              placeholder="Take Profit"
              className="flex-1 px-2 py-1.5 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-success"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleUpdateLevels}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-medium transition-colors"
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
                className="flex-1 sm:flex-none px-3 py-1.5 bg-error hover:bg-error/90 text-white rounded text-xs font-medium transition-colors"
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
              <span className="text-[10px] text-muted">Loading chart…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <Icon icon="solar:chart-broken" className="h-7 w-7 text-muted" />
              <p className="text-[10px] text-muted">{error}</p>
              <button
                onClick={() => loadData(symbol, interval)}
                className="text-[10px] text-primary hover:underline cursor-pointer"
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

export default memo(LiveChart);
