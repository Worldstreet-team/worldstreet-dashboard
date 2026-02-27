'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore } from '@/store/futuresStore';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FuturesChartProps {
  symbol?: string;
  isDarkMode?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startDistance: number;
}

export const FuturesChart: React.FC<FuturesChartProps> = ({
  symbol: propSymbol,
  isDarkMode = true,
}) => {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
  const symbol = propSymbol || selectedMarket?.symbol || 'BTC-PERP';
  
  const [timeInterval, setTimeInterval] = useState('1min');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'active' | 'paused' | 'error'>('paused');
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [visibleCandles, setVisibleCandles] = useState(50);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchState | null>(null);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  useEffect(() => {
    if (symbol) {
      // Clear existing data when symbol changes
      setChartData([]);
      setError(null);
      
      fetchHistoricalData();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [symbol, timeInterval]);

  useEffect(() => {
    if (chartData.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [chartData, isDarkMode]);

  useEffect(() => {
    // Redraw chart when canvas is ready
    if (canvasRef.current && chartData.length > 0) {
      drawChart();
    }
  }, [canvasRef.current]);

  // Redraw when zoom or pan changes
  useEffect(() => {
    if (chartData.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [zoom, panOffset, visibleCandles]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      touchStateRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        startDistance: 0,
      };
    } else if (e.touches.length === 2) {
      // Two touches - zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      touchStateRef.current = {
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        lastX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        lastY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startDistance: distance,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current) return;

    if (e.touches.length === 1 && touchStateRef.current.startDistance === 0) {
      // Pan
      const deltaX = e.touches[0].clientX - touchStateRef.current.lastX;
      const candlesPerPixel = visibleCandles / (canvasRef.current?.width || 1200);
      const candlesDelta = Math.round(deltaX * candlesPerPixel);
      
      setPanOffset(prev => {
        const newOffset = prev - candlesDelta;
        const maxOffset = Math.max(0, chartData.length - visibleCandles);
        return Math.max(0, Math.min(maxOffset, newOffset));
      });
      
      touchStateRef.current.lastX = e.touches[0].clientX;
      touchStateRef.current.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scale = distance / touchStateRef.current.startDistance;
      const newVisibleCandles = Math.round(visibleCandles / scale);
      
      setVisibleCandles(Math.max(10, Math.min(200, newVisibleCandles)));
      
      touchStateRef.current.startDistance = distance;
    }

    e.preventDefault();
  }, [chartData.length, visibleCandles]);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
  }, []);

  // Mouse wheel zoom for desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    setVisibleCandles(prev => {
      const newValue = Math.round(prev * delta);
      return Math.max(10, Math.min(200, newValue));
    });
  }, []);

  // Setup touch and wheel listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use Next.js API route as proxy
      const response = await fetch(
        `/api/futures/klines?symbol=${symbol}&interval=${timeInterval}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      
      // Backend returns array of objects with: time, open, close, high, low, volume, turnover
      const candles = (data || []).map((k: any) => ({
        time: k.time * 1000, // Convert to milliseconds
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume || 0)
      }));

      setChartData(candles);
      
      // Force redraw after data is set
      setTimeout(() => {
        if (canvasRef.current && candles.length > 0) {
          drawChart();
        }
      }, 100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling(); // Clear any existing interval
    
    setPollingStatus('active');
    
    // Poll every 3 seconds for live updates
    pollingIntervalRef.current = setInterval(() => {
      fetchLiveUpdate();
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollingStatus('paused');
  };

  const fetchLiveUpdate = async () => {
    try {
      // Use current symbol from state
      const currentSymbol = propSymbol || selectedMarket?.symbol || 'BTC-PERP';
      
      // Use Next.js API route as proxy
      const response = await fetch(
        `/api/futures/klines?symbol=${currentSymbol}&interval=${timeInterval}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch live update');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        // Get the latest candle from the response
        const latestCandle = data[data.length - 1];
        const newCandle: CandleData = {
          time: latestCandle.time * 1000, // Convert to milliseconds
          open: parseFloat(latestCandle.open),
          high: parseFloat(latestCandle.high),
          low: parseFloat(latestCandle.low),
          close: parseFloat(latestCandle.close),
          volume: parseFloat(latestCandle.volume || 0)
        };

        setChartData(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          if (lastIndex >= 0 && updated[lastIndex].time === newCandle.time) {
            // Update existing candle
            updated[lastIndex] = newCandle;
          } else {
            // Add new candle
            updated.push(newCandle);
            if (updated.length > 100) updated.shift();
          }

          return updated;
        });

        setPollingStatus('active');
      }
    } catch (err) {
      console.error('Polling error:', err);
      setPollingStatus('error');
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not ready');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Context not available');
      return;
    }

    if (chartData.length === 0) {
      console.log('No chart data available');
      return;
    }

    console.log(`Drawing chart with ${chartData.length} candles, visible: ${visibleCandles}, offset: ${panOffset}`);

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with theme-aware background
    ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible data range
    const endIndex = Math.min(chartData.length, chartData.length - panOffset);
    const startIndex = Math.max(0, endIndex - visibleCandles);
    const visibleData = chartData.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    const prices = visibleData.flatMap(c => [c.high, c.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = 60; // Increased for mobile readability

    console.log(`Price range: ${minPrice} - ${maxPrice}`);

    // Draw grid with theme-aware colors
    ctx.strokeStyle = isDarkMode ? '#2a2e39' : '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const price = maxPrice - (priceRange * i / 5);
      ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
      ctx.font = 'bold 12px monospace'; // Larger font for mobile
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), padding - 5, y + 4);
    }

    // Draw candlesticks
    const candleWidth = Math.max(3, (width - 2 * padding) / visibleData.length - 2);
    visibleData.forEach((candle, index) => {
      const x = padding + (index * (width - 2 * padding) / visibleData.length);
      const yHigh = padding + (height - 2 * padding) * (1 - (candle.high - minPrice) / priceRange);
      const yLow = padding + (height - 2 * padding) * (1 - (candle.low - minPrice) / priceRange);
      const yOpen = padding + (height - 2 * padding) * (1 - (candle.open - minPrice) / priceRange);
      const yClose = padding + (height - 2 * padding) * (1 - (candle.close - minPrice) / priceRange);

      const isGreen = candle.close >= candle.open;
      ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
      ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';
      ctx.lineWidth = Math.max(1, candleWidth / 4);

      // Draw wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(yClose - yOpen);
      const bodyY = Math.min(yOpen, yClose);
      ctx.fillRect(x, bodyY, candleWidth, Math.max(2, bodyHeight));
    });

    // Draw current price line
    if (visibleData.length > 0) {
      const lastPrice = visibleData[visibleData.length - 1].close;
      const y = padding + (height - 2 * padding) * (1 - (lastPrice - minPrice) / priceRange);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#3b82f6';
      const labelWidth = 80;
      const labelHeight = 24;
      ctx.fillRect(width - padding + 5, y - labelHeight / 2, labelWidth, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lastPrice.toFixed(2), width - padding + 10, y + 5);
    }

    console.log('Chart drawn successfully');
  };

  // Reset zoom and pan
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanOffset(0);
    setVisibleCandles(50);
  }, []);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : null;
  const priceChange = chartData.length > 1 
    ? ((chartData[chartData.length - 1].close - chartData[0].close) / chartData[0].close) * 100 
    : null;

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
                  ${currentPrice?.toFixed(2) || 0}
                </span>
                {priceChange !== null && (
                  <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-success' : 'text-error'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2) || 0}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Polling Status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              pollingStatus === 'active' ? 'bg-success animate-pulse' :
              pollingStatus === 'error' ? 'bg-error' :
              'bg-warning'
            }`} />
            <span className="text-xs text-muted dark:text-darklink">
              {pollingStatus === 'active' ? 'Live (Polling)' :
               pollingStatus === 'error' ? 'Update Error' :
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
              className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                timeInterval === '1min'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
              }`}
            >
              1m
            </button>
            <button
              onClick={() => setTimeInterval('5min')}
              className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                timeInterval === '5min'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
              }`}
            >
              5m
            </button>
          </div>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="p-1.5 rounded bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray transition-colors"
            title="Reset zoom and pan"
          >
            <Icon icon="ph:arrows-out" height={18} />
          </button>
        </div>
      </div>

      {/* Chart Stats */}
      {chartData.length > 0 && (
        <div className="px-4 py-3 border-b border-border dark:border-darkborder bg-muted/30 dark:bg-white/5">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-muted dark:text-darklink">O: </span>
              <span className="text-dark dark:text-white font-mono font-semibold">
                {chartData[chartData.length - 1]?.open?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">H: </span>
              <span className="text-success font-mono font-semibold">
                {chartData[chartData.length - 1]?.high?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">L: </span>
              <span className="text-error font-mono font-semibold">
                {chartData[chartData.length - 1]?.low?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">C: </span>
              <span className="text-dark dark:text-white font-mono font-bold">
                {chartData[chartData.length - 1]?.close?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div ref={containerRef} className="relative flex-1 p-2 sm:p-4 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-darkgray/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="svg-spinners:ring-resize" className="text-primary" height={48} />
              <span className="text-sm text-muted dark:text-darklink">Loading chart...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 max-w-[90%]">
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <Icon icon="ph:warning-duotone" className="text-error" height={20} />
              <span className="text-sm text-error">{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <canvas
              ref={canvasRef}
              width={1200}
              height={500}
              className="w-full h-auto rounded-lg touch-none"
              style={{ touchAction: 'none' }}
            />
            
            {/* Mobile Instructions */}
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted dark:text-darklink sm:hidden">
              <span className="flex items-center gap-1">
                <Icon icon="ph:hand-swipe-right" height={14} />
                Swipe to pan
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="ph:magnifying-glass-plus" height={14} />
                Pinch to zoom
              </span>
            </div>

            {/* Zoom Indicator */}
            {visibleCandles !== 50 && (
              <div className="absolute top-4 right-4 bg-primary/90 text-white px-3 py-1 rounded-full text-xs font-medium">
                {visibleCandles} candles
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
