'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LiveChartProps {
  symbol: string;
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}

const LiveChart = ({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) => {
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert symbol format: BTC-USDT -> BINANCE:BTCUSDT
    const tradingViewSymbol = `BINANCE:${symbol.replace('-', '')}`;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create the main widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.width = '100%';
    widgetContainer.style.height = '100%';

    // Create the inner widget div
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    widgetContainer.appendChild(widgetDiv);

    // Create and append the config script
    const configScript = document.createElement('script');
    configScript.type = 'text/x-tradingview-widget';
    configScript.textContent = JSON.stringify({
      symbols: [[tradingViewSymbol]],
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: 'dark',
    });
    widgetContainer.appendChild(configScript);

    containerRef.current.appendChild(widgetContainer);

    // Load and execute TradingView embed script
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
      };
      document.body.appendChild(script);
    } else {
      // If script already loaded, manually trigger widget processing
      if (typeof (window as any).TradingView !== 'undefined') {
        (window as any).TradingView.widget(new (window as any).TradingView.widget());
      }
    }
  }, [symbol]);

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
          <span className="text-[8px] text-[#848e9c]">TradingView Chart</span>

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

      {/* TradingView Chart Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden" ref={containerRef}></div>
    </div>
  );
};

export default LiveChart;
