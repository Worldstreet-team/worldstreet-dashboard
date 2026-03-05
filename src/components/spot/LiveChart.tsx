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
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const LiveChart = ({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) => {
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const candlesRef = useRef<Map<number, CandleData>>(new Map());

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#181a20' },
          textColor: '#848e9c',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
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

      // Correct API: chart.addSeries(CandlestickSeries)
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

      // Handle window resize
      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }, []);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async (pair: string) => {
    try {
      const kucoinPair = pair.replace('-', '-');
      
      const response = await fetch(
        `https://api.kucoin.com/api/v1/market/candles?symbol=${kucoinPair}&type=1hour&limit=100`
      );
      
      if (!response.ok) throw new Error('Failed to fetch historical data');
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        return;
      }

      const candles: CandleData[] = data.data
        .map((kline: string[]) => ({
          time: Math.floor(parseInt(kline[0]) / 1000),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[3]),
          low: parseFloat(kline[4]),
          close: parseFloat(kline[2]),
        }))
        .sort((a: CandleData, b: CandleData) => (typeof a.time === 'number' && typeof b.time === 'number' ? a.time - b.time : 0));

      candlesRef.current.clear();
      candles.forEach(candle => {
        if (typeof candle.time === 'number') {
          candlesRef.current.set(candle.time, candle);
        }
      });

      if (seriesRef.current) {
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  }, []);

  // Subscribe to WebSocket for real-time updates
  const subscribeToWebSocket = useCallback((pair: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket('wss://ws-api.kucoin.com/socket.io/?transport=websocket');
      wsRef.current = ws;

      ws.onopen = () => {
        const kucoinPair = pair.replace('-', '-');
        const subscribeMessage = {
          id: Date.now().toString(),
          type: 'subscribe',
          topic: `/market/candles:${kucoinPair}_1hour`,
          privateChannel: false,
          response: true,
        };
        ws.send(JSON.stringify(subscribeMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'message' && message.topic?.includes('candles')) {
            const data = message.data;
            if (data && data.candles && data.candles.length > 0) {
              const kline = data.candles[0];
              const candleTime = Math.floor(parseInt(kline[0]) / 1000);
              const candle: CandleData = {
                time: candleTime,
                open: parseFloat(kline[1]),
                high: parseFloat(kline[3]),
                low: parseFloat(kline[4]),
                close: parseFloat(kline[2]),
              };

              candlesRef.current.set(candleTime, candle);

              if (seriesRef.current) {
                seriesRef.current.update(candle);
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, []);

  // Handle symbol changes
  useEffect(() => {
    if (!symbol) return;

    fetchHistoricalData(symbol);
    subscribeToWebSocket(symbol);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, fetchHistoricalData, subscribeToWebSocket]);

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
      <div className="flex-1 min-h-0 w-full" ref={containerRef}></div>
    </div>
  );
};

export default LiveChart;
