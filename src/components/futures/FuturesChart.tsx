"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChartEngine, Candle } from '@/lib/chart/ChartEngine';
import { DataFeedService, Interval } from '@/lib/chart/DataFeedService';
import { useChartStore } from '@/store/chartStore';
import { Icon } from '@iconify/react';

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
];

interface FuturesChartProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  isDarkMode?: boolean;
}

export const FuturesChart: React.FC<FuturesChartProps> = ({
  symbol: propSymbol,
  onSymbolChange,
  isDarkMode = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartEngineRef = useRef<ChartEngine | null>(null);
  const dataFeedRef = useRef<DataFeedService | null>(null);
  const lastCandleTimeRef = useRef<number>(0);

  const {
    symbol: storeSymbol,
    interval,
    currentPrice,
    priceChange24h,
    isLoading,
    error,
    setSymbol,
    setInterval: setStoreInterval,
    setCurrentPrice,
    setPriceChange24h,
    setIsLoading,
    setError,
  } = useChartStore();

  // Use prop symbol or store symbol, with fallback
  const symbol = propSymbol || storeSymbol || 'BTC-USDT';
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const handleCandleUpdate = useCallback((candle: Candle) => {
    if (!chartEngineRef.current) return;

    // Update current price
    setCurrentPrice(candle.close);

    // Update or append candle
    if (candle.time === lastCandleTimeRef.current) {
      // Update existing candle
      chartEngineRef.current.updateCandle(candle);
    } else {
      // New candle
      chartEngineRef.current.updateCandle(candle);
      lastCandleTimeRef.current = candle.time;
    }
  }, [setCurrentPrice]);

  const handleError = useCallback((err: Error) => {
    console.error('Chart error:', err);
    setError(err.message);
    setWsStatus('disconnected');
  }, [setError]);

  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Destroy existing chart and datafeed
      if (dataFeedRef.current) {
        dataFeedRef.current.disconnect();
        dataFeedRef.current = null;
      }

      if (chartEngineRef.current) {
        chartEngineRef.current.destroy();
        chartEngineRef.current = null;
      }

      // Create new chart engine
      chartEngineRef.current = new ChartEngine(chartContainerRef.current);
      chartEngineRef.current.initChart(isDarkMode);

      // Create new data feed
      dataFeedRef.current = new DataFeedService(
        symbol,
        interval,
        handleCandleUpdate,
        handleError
      );

      // Fetch historical data
      const historicalData = await dataFeedRef.current.fetchHistoricalData();

      if (historicalData.length > 0) {
        chartEngineRef.current.setHistoricalData(historicalData);
        
        // Set last candle time
        const lastCandle = historicalData[historicalData.length - 1];
        lastCandleTimeRef.current = lastCandle.time;
        setCurrentPrice(lastCandle.close);

        // Calculate 24h change (simplified)
        if (historicalData.length > 1) {
          const firstPrice = historicalData[0].close;
          const lastPrice = lastCandle.close;
          const change = ((lastPrice - firstPrice) / firstPrice) * 100;
          setPriceChange24h(change);
        }
      }

      // Connect WebSocket
      setWsStatus('connecting');
      dataFeedRef.current.connectWebSocket();
      
      // Check connection status
      setTimeout(() => {
        if (dataFeedRef.current?.isConnected()) {
          setWsStatus('connected');
        }
      }, 1000);

    } catch (err) {
      console.error('Error initializing chart:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize chart');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval, isDarkMode, handleCandleUpdate, handleError, setIsLoading, setError, setCurrentPrice, setPriceChange24h]);

  // Initialize chart on mount and when symbol/interval changes
  useEffect(() => {
    initializeChart();

    return () => {
      if (dataFeedRef.current) {
        dataFeedRef.current.disconnect();
      }
      if (chartEngineRef.current) {
        chartEngineRef.current.destroy();
      }
    };
  }, [initializeChart]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (chartEngineRef.current) {
      chartEngineRef.current.updateTheme(isDarkMode);
    }
  }, [isDarkMode]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    }
  };

  const handleIntervalChange = (newInterval: Interval) => {
    setStoreInterval(newInterval);
    if (dataFeedRef.current) {
      dataFeedRef.current.updateInterval(newInterval);
    }
  };

  const handleFitContent = () => {
    if (chartEngineRef.current) {
      chartEngineRef.current.fitContent();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-4">
          {/* Symbol Display */}
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">{symbol}</h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-dark dark:text-white">
                  ${currentPrice.toFixed(2)}
                </span>
                {priceChange24h !== null && (
                  <span className={`text-sm font-medium ${priceChange24h >= 0 ? 'text-success' : 'text-error'}`}>
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-success' :
              wsStatus === 'connecting' ? 'bg-warning animate-pulse' :
              'bg-error'
            }`} />
            <span className="text-xs text-muted dark:text-darklink">
              {wsStatus === 'connected' ? 'Live' :
               wsStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
          </div>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-1">
          {INTERVALS.map((int) => (
            <button
              key={int.value}
              onClick={() => handleIntervalChange(int.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                interval === int.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
              }`}
            >
              {int.label}
            </button>
          ))}
          
          <button
            onClick={handleFitContent}
            className="ml-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark transition-colors"
            title="Fit content"
          >
            <Icon icon="ph:arrows-out-simple" className="text-dark dark:text-white" height={20} />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-darkgray/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="svg-spinners:ring-resize" className="text-primary" height={48} />
              <span className="text-sm text-muted dark:text-darklink">Loading chart...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <Icon icon="ph:warning-duotone" className="text-error" height={20} />
              <span className="text-sm text-error">{error}</span>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
