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
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-white dark:bg-darkgray">
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
        <div className="border-t border-border dark:border-darkborder h-[250px] flex-shrink-0">
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

      {/* MOBILE LAYOUT: Vertical stack */}
      <div className="md:hidden flex flex-col flex-1 overflow-auto">
        {/* Chart */}
        <div className="h-[45vh] flex-shrink-0">
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
  );
}
