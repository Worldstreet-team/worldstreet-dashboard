'use client';

import React, { useState, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LiveChartProps {
  symbol: string;
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}

const ChartLoader = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#181a20]">
    <div className="flex flex-col items-center gap-2">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fcd535]/20 border-t-[#fcd535]" />
      <span className="text-[9px] text-[#848e9c]">Loading chart…</span>
    </div>
  </div>
);

const LiveChart = ({ symbol, stopLoss, takeProfit, onUpdateLevels }: LiveChartProps) => {
  const [showLevelsForm, setShowLevelsForm] = useState(false);
  const [tempStopLoss, setTempStopLoss] = useState(stopLoss || '');
  const [tempTakeProfit, setTempTakeProfit] = useState(takeProfit || '');
  const [isClient, setIsClient] = useState(false);
  const [TradingViewWidget, setTradingViewWidget] = useState<any>(null);

  // Only render on client
  useEffect(() => {
    setIsClient(true);
    import('react-tradingview-widget').then(mod => {
      setTradingViewWidget(() => mod.default);
    });
  }, []);

  useEffect(() => {
    setTempStopLoss(stopLoss || '');
    setTempTakeProfit(takeProfit || '');
  }, [stopLoss, takeProfit]);

  const handleUpdateLevels = () => {
    if (onUpdateLevels) {
      onUpdateLevels(tempStopLoss, tempTakeProfit);
    }
    setShowLevelsForm(false);
  };

  // Convert symbol format: BTC-USDT -> BINANCE:BTCUSDT
  const tradingViewSymbol = `BINANCE:${symbol.replace('-', '')}`;

  if (!isClient || !TradingViewWidget) {
    return <ChartLoader />;
  }

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

      {/* TradingView Chart */}
      <div className="flex-1 min-h-0 w-full">
        <TradingViewWidget
          symbol={tradingViewSymbol}
          theme="dark"
          locale="en"
          autosize
          interval="D"
          style="1"
          toolbar_bg="#181a20"
          enable_publishing={false}
          allow_symbol_change={false}
          show_popup_button={false}
          hide_top_toolbar={false}
          hide_legend={false}
        />
      </div>
    </div>
  );
};

export default memo(LiveChart);
