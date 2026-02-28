"use client";

import React, { useState, useCallback } from "react";
import { 
  PairInfoBar, 
  OrderBook, 
  LiveChart, 
  TradingPanel, 
  BottomTabs 
} from "@/components/spot";

export default function SpotTradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTPSLLines, setShowTPSLLines] = useState(true);
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
    // Trigger refresh of balances and order history
    setRefreshKey(prev => prev + 1);
  }, []);

  const handlePositionTPSLUpdate = useCallback((symbol: string, tp: string | null, sl: string | null) => {
    // Convert position symbol format (SOL/USDT) to chart format (SOL-USDT)
    const normalizedSymbol = symbol.replace('/', '-');
    setActivePositionTPSL({ symbol: normalizedSymbol, takeProfit: tp, stopLoss: sl });
  }, []);

  // Determine which TP/SL to show on chart
  const chartStopLoss = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
      {/* Pair Info Bar - Full Width */}
      <PairInfoBar 
        selectedPair={selectedPair}
        onSelectPair={setSelectedPair}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto lg:overflow-hidden">
        {/* Desktop: 3-column grid layout */}
        <div className="hidden lg:grid lg:grid-cols-[20%_55%_25%] h-full">
          {/* Left: Order Book */}
          <div className="h-full overflow-hidden">
            <OrderBook selectedPair={selectedPair} />
          </div>

          {/* Center: Chart */}
          <div className="h-full overflow-hidden">
            <LiveChart 
              symbol={selectedPair}
              stopLoss={chartStopLoss}
              takeProfit={chartTakeProfit}
              onUpdateLevels={handleUpdateLevels}
            />
          </div>

          {/* Right: Trading Panel */}
          <div className="h-full overflow-hidden">
            <TradingPanel 
              selectedPair={selectedPair}
              onTradeExecuted={handleTradeExecuted}
            />
          </div>
        </div>

        {/* Mobile/Tablet: Vertical stack layout */}
        <div className="lg:hidden flex flex-col min-h-full">
          {/* Chart - Fixed height on mobile */}
          <div className="h-[45vh] md:h-[50vh] flex-shrink-0">
            <LiveChart 
              symbol={selectedPair}
              stopLoss={chartStopLoss}
              takeProfit={chartTakeProfit}
              onUpdateLevels={handleUpdateLevels}
            />
          </div>

          {/* Trading Panel - Below chart, always visible */}
          <div className="flex-shrink-0 border-t border-border dark:border-darkborder">
            <TradingPanel 
              selectedPair={selectedPair}
              onTradeExecuted={handleTradeExecuted}
            />
          </div>

          {/* Order Book - Below trading panel on tablet only */}
          <div className="hidden md:block lg:hidden flex-shrink-0 border-t border-border dark:border-darkborder">
            <OrderBook selectedPair={selectedPair} />
          </div>

          {/* Bottom Tabs - At the bottom on mobile/tablet */}
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

      {/* Desktop: Bottom Tabs - Fixed height */}
      <div className="hidden lg:block border-t border-border dark:border-darkborder h-[250px] flex-shrink-0">
        <BottomTabs 
          refreshKey={refreshKey}
          selectedChartSymbol={selectedPair}
          onPositionTPSLUpdate={handlePositionTPSLUpdate}
          showTPSLLines={showTPSLLines}
          onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
        />
      </div>
    </div>
  );
}
