'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useWallet } from '@/app/context/walletContext';
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveChartProps {
  symbol: string;
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}

export default function LiveChart({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) {
  const { addresses } = useWallet();
  const { tokenBalances: solTokens } = useSolana();
  const { tokenBalances: ethTokens } = useEvm();
  
  const [interval, setInterval] = useState('1min');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get USDT balances
  const usdtSol = solTokens.find(t => t.symbol === 'USDT')?.amount || 0;
  const usdtEth = ethTokens.find(t => t.symbol === 'USDT')?.amount || 0;

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
  }, [chartData, stopLoss, takeProfit]);

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const endAt = Math.floor(Date.now() / 1000);
      const startAt = endAt - (interval === '1min' ? 3600 : 7200);

      const response = await fetch(
        `/api/spot/klines?symbol=${symbol}&type=${interval}&startAt=${startAt}&endAt=${endAt}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      
      // Backend returns array of objects with time, open, close, high, low, volume, turnover
      const candles = (Array.isArray(data) ? data : []).map((k: any) => ({
        time: k.time * 1000,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume)
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

    const wsUrl = 'wss://trading.watchup.site';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
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

        // Backend sends candle data directly as object
        if (message.time && message.open && message.close) {
          const newCandle: CandleData = {
            time: parseInt(message.time) * 1000,
            open: parseFloat(message.open),
            close: parseFloat(message.close),
            high: parseFloat(message.high),
            low: parseFloat(message.low),
            volume: parseFloat(message.volume)
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
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
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
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#0f0f0f' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (chartData.length === 0) return;

    const prices = chartData.flatMap(c => [c.high, c.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = 40;

    // Draw grid with theme-aware colors
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const price = maxPrice - (priceRange * i / 5);
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
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
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';

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

    // Draw Stop Loss line
    if (stopLoss && parseFloat(stopLoss) > 0) {
      const slPrice = parseFloat(stopLoss);
      if (slPrice >= minPrice && slPrice <= maxPrice) {
        const y = padding + (height - 2 * padding) * (1 - (slPrice - minPrice) / priceRange);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(width - padding + 5, y - 10, 70, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('SL: ' + slPrice.toFixed(2), width - padding + 8, y + 3);
      }
    }

    // Draw Take Profit line
    if (takeProfit && parseFloat(takeProfit) > 0) {
      const tpPrice = parseFloat(takeProfit);
      if (tpPrice >= minPrice && tpPrice <= maxPrice) {
        const y = padding + (height - 2 * padding) * (1 - (tpPrice - minPrice) / priceRange);
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(width - padding + 5, y - 10, 70, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('TP: ' + tpPrice.toFixed(2), width - padding + 8, y + 3);
      }
    }
  };

  const handleUpdateLevels = () => {
    if (onUpdateLevels) {
      onUpdateLevels(tempStopLoss, tempTakeProfit);
    }
    setShowLevelsForm(false);
  };

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 dark:border-darkborder">
        <div className="flex flex-col gap-4">
          {/* Top Row - Title and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Icon icon="ph:chart-line" className="text-primary" width={20} />
              <h3 className="font-semibold text-dark dark:text-white">Live Chart - {symbol}</h3>
              
              {(stopLoss || takeProfit) && (
                <div className="flex items-center gap-2 text-xs">
                  {stopLoss && (
                    <div className="px-2 py-1 bg-error/10 border border-error/30 rounded-lg">
                      <span className="text-error font-semibold">SL: {parseFloat(stopLoss).toFixed(2)}</span>
                    </div>
                  )}
                  {takeProfit && (
                    <div className="px-2 py-1 bg-success/10 border border-success/30 rounded-lg">
                      <span className="text-success font-semibold">TP: {parseFloat(takeProfit).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="px-3 py-1.5 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="1min">1m</option>
                <option value="5min">5m</option>
              </select>

              {onUpdateLevels && (
                <button
                  onClick={() => setShowLevelsForm(!showLevelsForm)}
                  className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {showLevelsForm ? 'Cancel' : 'Set Levels'}
                </button>
              )}
            </div>
          </div>

          {/* USDT Wallet Balances */}
          {addresses && (
            <div className="flex items-center gap-4 p-3 bg-muted/30 dark:bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <Icon icon="ph:wallet" className="text-primary" width={18} />
                <span className="text-sm font-medium text-dark dark:text-white">USDT Balances:</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://cryptologos.cc/logos/solana-sol-logo.png" 
                    alt="Solana" 
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-sm text-muted">SOL:</span>
                  <span className="text-sm font-semibold text-dark dark:text-white font-mono">
                    {usdtSol.toFixed(2)} USDT
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <img 
                    src="https://cryptologos.cc/logos/ethereum-eth-logo.png" 
                    alt="Ethereum" 
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-sm text-muted">ETH:</span>
                  <span className="text-sm font-semibold text-dark dark:text-white font-mono">
                    {usdtEth.toFixed(2)} USDT
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
                  <span className="text-xs font-medium text-primary">Total:</span>
                  <span className="text-sm font-bold text-primary font-mono">
                    {(usdtSol + usdtEth).toFixed(2)} USDT
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Levels Form */}
        {showLevelsForm && onUpdateLevels && (
          <div className="mt-4 p-4 bg-muted/30 dark:bg-white/5 rounded-xl border border-border/50 dark:border-darkborder">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="0.01"
                  value={tempStopLoss}
                  onChange={(e) => setTempStopLoss(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-error"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Take Profit</label>
                <input
                  type="number"
                  step="0.01"
                  value={tempTakeProfit}
                  onChange={(e) => setTempTakeProfit(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-success"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleUpdateLevels}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-colors"
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
                className="px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Stats */}
      {chartData.length > 0 && (
        <div className="px-4 py-3 border-b border-border/50 dark:border-darkborder bg-muted/30 dark:bg-white/5">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-muted">O: </span>
              <span className="text-dark dark:text-white font-mono font-semibold">
                {chartData[chartData.length - 1]?.open.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted">H: </span>
              <span className="text-success font-mono font-semibold">
                {chartData[chartData.length - 1]?.high.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted">L: </span>
              <span className="text-error font-mono font-semibold">
                {chartData[chartData.length - 1]?.low.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted">C: </span>
              <span className="text-dark dark:text-white font-mono font-bold">
                {chartData[chartData.length - 1]?.close.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="p-4">
        {loading && (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <canvas
            ref={canvasRef}
            width={1200}
            height={500}
            className="w-full h-auto rounded-lg border border-border/50 dark:border-darkborder"
          />
        )}
      </div>
    </div>
  );
}
