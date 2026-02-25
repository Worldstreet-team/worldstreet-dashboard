'use client';

import { useState, useEffect, useRef } from 'react';
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

export const FuturesChart: React.FC<FuturesChartProps> = ({
  symbol: propSymbol,
  isDarkMode = true,
}) => {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
  const symbol = propSymbol || selectedMarket?.symbol || 'BTC-USDT';
  
  const [interval, setInterval] = useState('1min');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  useEffect(() => {
    if (symbol) {
      fetchHistoricalData();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, interval]);

  useEffect(() => {
    if (chartData.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [chartData, isDarkMode]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const endAt = Math.floor(Date.now() / 1000);
      const startAt = endAt - (interval === '1min' ? 3600 : 7200);

      const response = await fetch(
        `/api/market/${symbol}/klines?type=${interval}&startAt=${startAt}&endAt=${endAt}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      const candles = (data.data || []).map((k: any) => ({
        time: k[0] * 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
        close: parseFloat(k[2]),
        volume: parseFloat(k[5])
      }));

      setChartData(candles);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsStatus('connecting');
    const wsUrl = 'wss://trading.watchup.site';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsStatus('connected');
      ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: symbol,
        interval: interval
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.message) {
          return;
        }

        if (message.data?.candles) {
          const candleArray = message.data.candles;
          const newCandle: CandleData = {
            time: parseInt(candleArray[0]) * 1000,
            open: parseFloat(candleArray[1]),
            close: parseFloat(candleArray[2]),
            high: parseFloat(candleArray[3]),
            low: parseFloat(candleArray[4]),
            volume: parseFloat(candleArray[5])
          };

          setChartData(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;

            if (lastIndex >= 0 && updated[lastIndex].time === newCandle.time) {
              updated[lastIndex] = newCandle;
            } else {
              updated.push(newCandle);
              if (updated.length > 100) updated.shift();
            }

            return updated;
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection failed');
      setWsStatus('disconnected');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsStatus('disconnected');
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (symbol) {
          connectWebSocket();
        }
      }, 5000);
    };

    wsRef.current = ws;
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with theme-aware background
    ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (chartData.length === 0) return;

    const prices = chartData.flatMap(c => [c.high, c.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = 40;

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
      ctx.font = '10px monospace';
      ctx.fillText(price.toFixed(2), 5, y + 3);
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, (width - 2 * padding) / chartData.length - 2);
    chartData.forEach((candle, index) => {
      const x = padding + (index * (width - 2 * padding) / chartData.length);
      const yHigh = padding + (height - 2 * padding) * (1 - (candle.high - minPrice) / priceRange);
      const yLow = padding + (height - 2 * padding) * (1 - (candle.low - minPrice) / priceRange);
      const yOpen = padding + (height - 2 * padding) * (1 - (candle.open - minPrice) / priceRange);
      const yClose = padding + (height - 2 * padding) * (1 - (candle.close - minPrice) / priceRange);

      const isGreen = candle.close >= candle.open;
      ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
      ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';

      // Draw wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(yClose - yOpen);
      const bodyY = Math.min(yOpen, yClose);
      ctx.fillRect(x, bodyY, candleWidth, Math.max(1, bodyHeight));
    });

    // Draw current price line
    if (chartData.length > 0) {
      const lastPrice = chartData[chartData.length - 1].close;
      const y = padding + (height - 2 * padding) * (1 - (lastPrice - minPrice) / priceRange);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width - padding + 5, y - 10, 60, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(lastPrice.toFixed(2), width - padding + 10, y + 3);
    }
  };

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
                  ${currentPrice.toFixed(2)}
                </span>
                {priceChange !== null && (
                  <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-success' : 'text-error'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
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
          <button
            onClick={() => setInterval('1min')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              interval === '1min'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
            }`}
          >
            1m
          </button>
          <button
            onClick={() => setInterval('5min')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              interval === '5min'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
            }`}
          >
            5m
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
                {chartData[chartData.length - 1]?.open.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">H: </span>
              <span className="text-success font-mono font-semibold">
                {chartData[chartData.length - 1]?.high.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">L: </span>
              <span className="text-error font-mono font-semibold">
                {chartData[chartData.length - 1]?.low.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted dark:text-darklink">C: </span>
              <span className="text-dark dark:text-white font-mono font-bold">
                {chartData[chartData.length - 1]?.close.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative flex-1 p-4">
        {loading && (
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

        {!loading && !error && (
          <canvas
            ref={canvasRef}
            width={1200}
            height={500}
            className="w-full h-auto rounded-lg"
          />
        )}
      </div>
    </div>
  );
};
