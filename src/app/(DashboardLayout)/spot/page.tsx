"use client";

import React, { useState, useCallback } from "react";
import { 
  PairInfoBar, 
  OrderBook, 
  LiveChart, 
  BottomTabs,
  MarketList,
  MarketTrades,
  SpotOrderEntry,
  TradingPanel
} from "@/components/spot";
import { Icon } from "@iconify/react";

const AVAILABLE_PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

const PAIR_DATA: Record<string, { name: string; basePrice: number }> = {
  'BTC-USDT': { name: 'Bitcoin', basePrice: 69201.46 },
  'ETH-USDT': { name: 'Ethereum', basePrice: 3842.15 },
  'SOL-USDT': { name: 'Solana', basePrice: 198.73 }
};

export default function SpotTradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTPSLLines, setShowTPSLLines] = useState(true);
  const [isOrderEntryExpanded, setIsOrderEntryExpanded] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'orderbook' | 'trades'>('chart');
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [tradingPanelSide, setTradingPanelSide] = useState<'buy' | 'sell'>('buy');
  const [currentPrice, setCurrentPrice] = useState(PAIR_DATA['BTC-USDT'].basePrice);
  const [priceChange, setPriceChange] = useState(3.34);
  const [activePositionTPSL, setActivePositionTPSL] = useState<{
    symbol: string;
    takeProfit: string | null;
    stopLoss: string | null;
  } | null>(null);
  
  // Trading form states
  const [amount, setAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  
  // Derive tokens from selected pair
  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Update price when pair changes
  React.useEffect(() => {
    const pairData = PAIR_DATA[selectedPair];
    if (pairData) {
      setCurrentPrice(pairData.basePrice);
      // Simulate price changes
      const interval = setInterval(() => {
        const variation = (Math.random() - 0.5) * pairData.basePrice * 0.001;
        const newPrice = pairData.basePrice + variation;
        setCurrentPrice(newPrice);
        setPriceChange(((newPrice - pairData.basePrice) / pairData.basePrice) * 100);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedPair]);

  const handleUpdateLevels = (sl: string, tp: string) => {
    setStopLoss(sl);
    setTakeProfit(tp);
  };

  const handleTradeExecuted = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setShowTradingPanel(false);
  }, []);

  const handlePositionTPSLUpdate = useCallback((symbol: string, tp: string | null, sl: string | null) => {
    const normalizedSymbol = symbol.replace('/', '-');
    setActivePositionTPSL({ symbol: normalizedSymbol, takeProfit: tp, stopLoss: sl });
  }, []);

  const handleOpenTradingPanel = (side: 'buy' | 'sell') => {
    setTradingPanelSide(side);
    setShowTradingPanel(true);
  };

  const handleSelectPair = (pair: string) => {
    setSelectedPair(pair);
    setShowPairDropdown(false);
  };

  const chartStopLoss = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  const currentPairData = PAIR_DATA[selectedPair];
  const isPositive = priceChange >= 0;

  return (
    <>
      {/* MOBILE LAYOUT - Binance Style (Full Screen Chart) */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-white dark:bg-darkgray mt-20">
        {/* Pair Header with Price Info */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between mb-2">
            <div className="relative">
              <button 
                onClick={() => setShowPairDropdown(!showPairDropdown)}
                className="flex items-center gap-2 hover:bg-muted/10 px-2 py-1 rounded"
              >
                <span className="text-lg font-bold text-dark dark:text-white">{selectedPair.replace('-', '/')}</span>
                <Icon icon="ph:caret-down" width={16} className="text-muted" />
              </button>
              
              {/* Pair Dropdown */}
              {showPairDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-20 min-w-[150px]">
                  {AVAILABLE_PAIRS.map((pair) => (
                    <button
                      key={pair}
                      onClick={() => handleSelectPair(pair)}
                      className={`w-full text-left px-4 py-2 hover:bg-muted/10 ${
                        selectedPair === pair ? 'bg-muted/20 text-primary' : 'text-dark dark:text-white'
                      }`}
                    >
                      {pair.replace('-', '/')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{currentPairData.name} Price</span>
              <Icon icon="ph:arrow-up-right" width={12} className="text-muted" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
              {currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
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
          <button 
            onClick={() => handleOpenTradingPanel('buy')}
            className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors"
          >
            Buy
          </button>
          <button 
            onClick={() => handleOpenTradingPanel('sell')}
            className="flex-1 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-lg transition-colors"
          >
            Sell
          </button>
        </div>

        {/* Trading Panel Modal */}
        {showTradingPanel && (
          <TradingPanel
            selectedPair={selectedPair}
            side={tradingPanelSide}
            onClose={() => setShowTradingPanel(false)}
            onTradeExecuted={handleTradeExecuted}
          />
        )}
      </div>

      {/* DESKTOP/TABLET LAYOUT - Mobile-Style Structure */}
      <div className="hidden md:flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-darkgray">
        {/* Pair Header with Price Info - Mobile Style */}
        <div className="flex-shrink-0 px-3 py-2 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between mb-1.5">
            <div className="relative">
              <button 
                onClick={() => setShowPairDropdown(!showPairDropdown)}
                className="flex items-center gap-2 hover:bg-muted/10 px-2 py-1 rounded"
              >
                <span className="text-lg font-bold text-dark dark:text-white">{selectedPair.replace('-', '/')}</span>
                <Icon icon="ph:caret-down" width={16} className="text-muted" />
              </button>
              
              {/* Pair Dropdown */}
              {showPairDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPairDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-50 min-w-[150px]">
                    {AVAILABLE_PAIRS.map((pair) => (
                      <button
                        key={pair}
                        onClick={() => handleSelectPair(pair)}
                        className={`w-full text-left px-4 py-2 hover:bg-muted/10 ${
                          selectedPair === pair ? 'bg-muted/20 text-primary' : 'text-dark dark:text-white'
                        }`}
                      >
                        {pair.replace('-', '/')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{currentPairData.name} Price</span>
              <Icon icon="ph:arrow-up-right" width={12} className="text-muted" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
              {currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Chart Tabs */}
        <div className="flex-shrink-0 flex items-center gap-6 px-3 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
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

        {/* Main Content Area - 2 Column Layout for Desktop */}
        <div className="flex-1 overflow-hidden grid grid-cols-[1fr_300px]">
          {/* Left: Chart + Bottom Tabs */}
          <div className="flex flex-col overflow-hidden">
            {/* Chart Area */}
            <div className="flex-1 overflow-hidden">
              {mobileActiveTab === 'chart' && (
                <div className="h-full bg-white dark:bg-darkgray">
                  <LiveChart 
                    symbol={selectedPair}
                    stopLoss={chartStopLoss}
                    takeProfit={chartTakeProfit}
                    onUpdateLevels={handleUpdateLevels}
                  />
                </div>
              )}

              {mobileActiveTab === 'orderbook' && (
                <div className="h-full bg-white dark:bg-darkgray overflow-auto">
                  <OrderBook selectedPair={selectedPair} />
                </div>
              )}

              {mobileActiveTab === 'trades' && (
                <div className="h-full bg-white dark:bg-darkgray overflow-auto">
                  <MarketTrades selectedPair={selectedPair} />
                </div>
              )}
            </div>

            {/* Bottom Tabs - Open Orders / Holdings */}
            <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray h-[200px] flex-shrink-0">
              <BottomTabs 
                refreshKey={refreshKey}
                selectedChartSymbol={selectedPair}
                onPositionTPSLUpdate={handlePositionTPSLUpdate}
                showTPSLLines={showTPSLLines}
                onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
              />
            </div>
          </div>

          {/* Right: Trading Form (Mobile Style) */}
          <div className="border-l border-border dark:border-darkborder flex flex-col overflow-hidden">
            {/* Trading Form Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col p-2 gap-2 bg-white dark:bg-darkgray">
                {/* Buy/Sell Toggle */}
                <div className="flex bg-muted/20 dark:bg-white/5 rounded-lg p-0.5">
                  <button
                    onClick={() => setTradingPanelSide('buy')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                      tradingPanelSide === 'buy'
                        ? 'bg-success text-white'
                        : 'text-dark dark:text-white'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradingPanelSide('sell')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                      tradingPanelSide === 'sell'
                        ? 'bg-error text-white'
                        : 'text-dark dark:text-white'
                    }`}
                  >
                    Sell
                  </button>
                </div>

                {/* Order Type Dropdown */}
                <button className="w-full rounded-lg bg-muted/20 dark:bg-white/5 px-2 py-2 flex items-center justify-between">
                  <span className="text-xs text-dark dark:text-white">Market</span>
                  <Icon icon="ph:caret-down" width={12} className="text-muted" />
                </button>

                {/* Market Price (Disabled) */}
                <div className="w-full rounded-lg bg-muted/30 dark:bg-white/10 px-2 py-2">
                  <span className="text-xs text-muted">Market Price</span>
                </div>

                {/* Total Input Row */}
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-2 py-2 text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button className="px-3 py-2 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder text-xs font-medium text-dark dark:text-white flex items-center gap-1">
                    USDT
                    <Icon icon="ph:caret-down" width={10} className="text-muted" />
                  </button>
                </div>

                {/* Slider */}
                <div className="w-full">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    className="w-full h-1 bg-muted/30 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-0.5">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => setSliderValue(val)}
                        className="text-[9px] text-muted hover:text-primary transition-colors"
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available / Max / Fee Section */}
                <div className="flex flex-col text-[10px] text-muted gap-0.5">
                  <div className="flex justify-between">
                    <span>Avbl</span>
                    <span className="text-dark dark:text-white font-mono">
                      0.00 {tradingPanelSide === 'buy' ? tokenOut : tokenIn}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max {tradingPanelSide === 'buy' ? 'Buy' : 'Sell'}</span>
                    <span className="text-dark dark:text-white font-mono">0 {tokenIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Fee</span>
                    <span className="text-dark dark:text-white font-mono">-- {tokenIn}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buy/Sell Button - Fixed at bottom */}
            <div className="flex-shrink-0 p-2 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder">
              <button
                onClick={() => handleOpenTradingPanel(tradingPanelSide)}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  tradingPanelSide === 'buy'
                    ? 'bg-success hover:bg-success/90 text-white'
                    : 'bg-error hover:bg-error/90 text-white'
                }`}
              >
                {tradingPanelSide === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
              </button>
            </div>
          </div>
        </div>

        {/* Trading Panel Modal */}
        {showTradingPanel && (
          <TradingPanel
            selectedPair={selectedPair}
            side={tradingPanelSide}
            onClose={() => setShowTradingPanel(false)}
            onTradeExecuted={handleTradeExecuted}
          />
        )}
      </div>
    </>
  );
}

