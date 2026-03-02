"use client";

import React, { useState, useCallback } from "react";
import { 
  PairInfoBar, 
  OrderBook, 
  LiveChart, 
  BottomTabs,
  MarketList,
  MarketTrades,
  SpotOrderEntry
} from "@/components/spot";
import { Icon } from "@iconify/react";

export default function SpotTradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTPSLLines, setShowTPSLLines] = useState(true);
  const [isOrderEntryExpanded, setIsOrderEntryExpanded] = useState(true);
  const [activePositionTPSL, setActivePositionTPSL] = useState<{
    symbol: string;
    takeProfit: string | null;
    stopLoss: string | null;
  } | null>(null);

  const handleUpdateLevels = (sl: string, tp: string) => {
    setStopLoss(sl);
    setTakeProfit(tp);
  };

  const handleTradeExecuted = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handlePositionTPSLUpdate = useCallback((symbol: string, tp: string | null, sl: string | null) => {
    const normalizedSymbol = symbol.replace('/', '-');
    setActivePositionTPSL({ symbol: normalizedSymbol, takeProfit: tp, stopLoss: sl });
  }, []);

  const chartStopLoss = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  return (
    <>
      {/* MOBILE LAYOUT - Binance Style (Full Screen Chart) */}
      <div className="md:hidden flex flex-col h-screen bg-[#0B0E11] overflow-hidden">
        {/* Pair Header with Price Info */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#0B0E11]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{selectedPair.replace('-', '/')}</span>
              <Icon icon="ph:caret-down" width={16} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Bitcoin Price</span>
              <Icon icon="ph:arrow-up-right" width={12} className="text-gray-400" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#0ECB81]">69,201.46</span>
            <span className="text-sm text-[#0ECB81]">$69,201.46</span>
            <span className="text-sm text-[#0ECB81]">+3.34%</span>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-[#F6465D]">POW</span>
            <span className="text-gray-400">Payments</span>
            <span className="text-gray-400">Vol</span>
            <span className="text-gray-400">Hot</span>
            <span className="text-gray-400">P</span>
            <Icon icon="ph:caret-right" width={12} className="text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">Networks</span>
            <span className="text-xs text-white">BTC (5)</span>
          </div>
        </div>

        {/* Chart Tabs */}
        <div className="flex-shrink-0 flex items-center gap-6 px-4 border-b border-gray-800">
          <button className="pb-2 text-sm font-medium text-white border-b-2 border-[#FCD535]">
            Chart
          </button>
          <button className="pb-2 text-sm font-medium text-gray-400">
            Order Book
          </button>
          <button className="pb-2 text-sm font-medium text-gray-400">
            Trades
          </button>
          <button className="pb-2 text-sm font-medium text-gray-400">
            Info
          </button>
          <button className="pb-2 text-sm font-medium text-gray-400 flex items-center gap-1">
            Trading Data
            <span className="text-[10px] px-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded">AI</span>
          </button>
        </div>

        {/* Chart Area - Takes remaining space */}
        <div className="flex-1 overflow-hidden bg-[#0B0E11]">
          <LiveChart 
            symbol={selectedPair}
            stopLoss={chartStopLoss}
            takeProfit={chartTakeProfit}
            onUpdateLevels={handleUpdateLevels}
          />
        </div>

        {/* Bottom Tabs - Open Orders / Holdings */}
        <div className="flex-shrink-0 border-t border-gray-800 bg-[#0B0E11]">
          <BottomTabs 
            refreshKey={refreshKey}
            selectedChartSymbol={selectedPair}
            onPositionTPSLUpdate={handlePositionTPSLUpdate}
            showTPSLLines={showTPSLLines}
            onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
          />
        </div>

        {/* Buy/Sell Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 flex gap-3 p-4 bg-[#0B0E11] border-t border-gray-800">
          <button className="flex-1 py-3 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-semibold rounded-lg transition-colors">
            Buy
          </button>
          <button className="flex-1 py-3 bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-semibold rounded-lg transition-colors">
            Sell
          </button>
        </div>
      </div>

      {/* DESKTOP/TABLET LAYOUT - Original */}
      <div className="hidden md:flex flex-col h-[calc(140vh-64px)] md:h-[calc(120vh-80px)] bg-white dark:bg-darkgray">
        {/* Pair Info Bar - Full Width */}
        <PairInfoBar 
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
        />

        {/* DESKTOP LAYOUT: 3-Column Grid */}
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
          {/* Main Trading Grid: Order Book | Chart | Right Sidebar */}
          <div className="flex-1 grid grid-cols-[22%_53%_25%] overflow-hidden">
            {/* LEFT: Order Book */}
            <div className="h-full overflow-hidden">
              <OrderBook selectedPair={selectedPair} />
            </div>

            {/* CENTER: Chart + Order Entry */}
            <div className="h-full flex flex-col overflow-hidden">
              {/* Chart */}
              <div className="flex-1 overflow-hidden">
                <LiveChart 
                  symbol={selectedPair}
                  stopLoss={chartStopLoss}
                  takeProfit={chartTakeProfit}
                  onUpdateLevels={handleUpdateLevels}
                />
              </div>

              {/* Order Entry Panel - Collapsible */}
              <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                isOrderEntryExpanded ? 'h-auto' : 'h-[32px]'
              }`}>
                <SpotOrderEntry 
                  selectedPair={selectedPair}
                  onTradeExecuted={handleTradeExecuted}
                  isExpanded={isOrderEntryExpanded}
                  onToggleExpand={() => setIsOrderEntryExpanded(!isOrderEntryExpanded)}
                />
              </div>
            </div>

            {/* RIGHT: Market List + Market Trades */}
            <div className="h-full flex flex-col overflow-hidden">
              {/* Market List - Top half */}
              <div className="flex-1 overflow-hidden">
                <MarketList 
                  selectedPair={selectedPair}
                  onSelectPair={setSelectedPair}
                />
              </div>

              {/* Market Trades - Bottom half */}
              <div className="flex-1 overflow-hidden border-t border-border dark:border-darkborder">
                <MarketTrades selectedPair={selectedPair} />
              </div>
            </div>
          </div>

          {/* Bottom Tabs - Full Width */}
          <div className="border-t border-border dark:border-darkborder h-[350px] flex-shrink-0">
            <BottomTabs 
              refreshKey={refreshKey}
              selectedChartSymbol={selectedPair}
              onPositionTPSLUpdate={handlePositionTPSLUpdate}
              showTPSLLines={showTPSLLines}
              onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
            />
          </div>
        </div>

        {/* TABLET LAYOUT: Stacked with Order Book as tab */}
        <div className="hidden md:flex lg:hidden flex-col flex-1 overflow-hidden">
          {/* Chart */}
          <div className="h-[50vh] flex-shrink-0">
            <LiveChart 
              symbol={selectedPair}
              stopLoss={chartStopLoss}
              takeProfit={chartTakeProfit}
              onUpdateLevels={handleUpdateLevels}
            />
          </div>

          {/* Order Entry */}
          <div className="flex-shrink-0 border-t border-border dark:border-darkborder">
            <SpotOrderEntry 
              selectedPair={selectedPair}
              onTradeExecuted={handleTradeExecuted}
            />
          </div>

          {/* Order Book */}
          <div className="flex-shrink-0 border-t border-border dark:border-darkborder h-[200px]">
            <OrderBook selectedPair={selectedPair} />
          </div>

          {/* Bottom Tabs */}
          <div className="flex-shrink-0 border-t border-border dark:border-darkborder">
            <BottomTabs 
              refreshKey={refreshKey}
              selectedChartSymbol={selectedPair}
              onPositionTPSLUpdate={handlePositionTPSLUpdate}
              showTPSLLines={showTPSLLines}
              onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
