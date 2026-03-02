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
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'orderbook' | 'trades'>('chart');
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
      <div className="md:hidden fixed inset-0 flex flex-col bg-white dark:bg-darkgray mt-20">
        {/* Pair Header with Price Info */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-dark dark:text-white">{selectedPair.replace('-', '/')}</span>
              <Icon icon="ph:caret-down" width={16} className="text-muted" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Bitcoin Price</span>
              <Icon icon="ph:arrow-up-right" width={12} className="text-muted" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-success">69,201.46</span>
            <span className="text-sm text-success">$69,201.46</span>
            <span className="text-sm text-success">+3.34%</span>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-error">POW</span>
            <span className="text-muted">Payments</span>
            <span className="text-muted">Vol</span>
            <span className="text-muted">Hot</span>
            <span className="text-muted">P</span>
            <Icon icon="ph:caret-right" width={12} className="text-muted" />
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted">Networks</span>
            <span className="text-xs text-dark dark:text-white">BTC (5)</span>
          </div>
        </div>

        {/* Chart Tabs */}
        <div className="flex-shrink-0 flex items-center gap-6 px-4 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
          <button 
            onClick={() => setMobileActiveTab('chart')}
            className={`pb-2 text-sm font-medium ${
              mobileActiveTab === 'chart' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Chart
          </button>
          <button 
            onClick={() => setMobileActiveTab('orderbook')}
            className={`pb-2 text-sm font-medium ${
              mobileActiveTab === 'orderbook' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Order Book
          </button>
          <button 
            onClick={() => setMobileActiveTab('trades')}
            className={`pb-2 text-sm font-medium ${
              mobileActiveTab === 'trades' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Trades
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Chart Area - 65% of viewport height */}
          {mobileActiveTab === 'chart' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray">
              <LiveChart 
                symbol={selectedPair}
                stopLoss={chartStopLoss}
                takeProfit={chartTakeProfit}
                onUpdateLevels={handleUpdateLevels}
              />
            </div>
          )}

          {/* Order Book */}
          {mobileActiveTab === 'orderbook' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray overflow-auto">
              <OrderBook selectedPair={selectedPair} />
            </div>
          )}

          {/* Market Trades */}
          {mobileActiveTab === 'trades' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray overflow-auto">
              <MarketTrades selectedPair={selectedPair} />
            </div>
          )}

          {/* Bottom Tabs - Open Orders / Holdings */}
          <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray pb-20">
            <BottomTabs 
              refreshKey={refreshKey}
              selectedChartSymbol={selectedPair}
              onPositionTPSLUpdate={handlePositionTPSLUpdate}
              showTPSLLines={showTPSLLines}
              onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
            />
          </div>
        </div>

        {/* Buy/Sell Buttons - Fixed at bottom (outside scroll) */}
        <div className="fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder z-10">
          <button className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors">
            Buy
          </button>
          <button className="flex-1 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-lg transition-colors">
            Sell
          </button>
        </div>
      </div>

      {/* DESKTOP/TABLET LAYOUT - Original */}
      <div className="hidden md:flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-darkgray">
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

