"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";
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
  const [showMobileTradingPanel, setShowMobileTradingPanel] = useState(false);
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

      {/* Main Trading Grid - Responsive 3 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[25%_75%] lg:grid-cols-[20%_55%_25%] overflow-hidden min-h-0">
        {/* Left: Order Book - Hidden on mobile, visible on tablet+ */}
        <div className="hidden md:block h-full overflow-hidden">
          <OrderBook selectedPair={selectedPair} />
        </div>

        {/* Center: Chart - Always visible, full width on mobile */}
        <div className="h-full overflow-hidden">
          <LiveChart 
            symbol={selectedPair}
            stopLoss={chartStopLoss}
            takeProfit={chartTakeProfit}
            onUpdateLevels={handleUpdateLevels}
          />
        </div>

        {/* Right: Trading Panel - Hidden on mobile/tablet, visible on desktop */}
        <div className="hidden lg:block h-full overflow-hidden">
          <TradingPanel 
            selectedPair={selectedPair}
            onTradeExecuted={handleTradeExecuted}
          />
        </div>
      </div>
      <div className="block lg:hidden h-full overflow-hidden">
          <TradingPanel 
            selectedPair={selectedPair}
            onTradeExecuted={handleTradeExecuted}
          />
        </div>

      {/* Bottom Tabs - Compact on mobile, larger on desktop */}
      <div className="border-t border-border dark:border-darkborder h-[200px] md:h-[250px] lg:h-[300px]">
        <BottomTabs 
          refreshKey={refreshKey}
          selectedChartSymbol={selectedPair}
          onPositionTPSLUpdate={handlePositionTPSLUpdate}
          showTPSLLines={showTPSLLines}
          onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
        />
      </div>

      {/* Mobile/Tablet: Trading Panel as Slide-up Sheet */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40 ${
            showMobileTradingPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowMobileTradingPanel(false)}
        />
        
        {/* Slide-up Panel */}
        <div 
          className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder z-50 transition-transform duration-300 ease-out ${
            showMobileTradingPanel ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '85vh' }}
        >
          {/* Handle Bar */}
          <div className="flex items-center justify-center py-2.5 border-b border-border dark:border-darkborder">
            <div className="w-10 h-1 bg-muted/50 rounded-full" />
          </div>
          
          {/* Trading Panel Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 45px)' }}>
            <TradingPanel 
              selectedPair={selectedPair}
              onTradeExecuted={handleTradeExecuted}
            />
          </div>
        </div>

        {/* Floating Trade Button - Bigger and more visible */}
        <button
          onClick={() => setShowMobileTradingPanel(true)}
          className="fixed bottom-4 right-4 w-14 h-14 md:w-12 md:h-12 bg-primary hover:bg-primary/90 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transition-all active:scale-95"
        >
          <Icon icon="ph:chart-line-up" width={24} className="md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
}
