"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";
import { MarketTicker, LiveChart, TradingPanel, OrderHistory, BalanceDisplay } from "@/components/spot";
import PositionsList from "@/components/spot/PositionsList";

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
    setActivePositionTPSL({ symbol, takeProfit: tp, stopLoss: sl });
  }, []);

  // Determine which TP/SL to show on chart
  const chartStopLoss = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = showTPSLLines && activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Spot Trading</h1>
        <p className="text-muted text-sm mt-1">
          Trade cryptocurrencies with real-time charts and DEX execution via 1inch
        </p>
      </div>

      {/* Market Ticker */}
      <MarketTicker 
        selectedPair={selectedPair} 
        onSelectPair={setSelectedPair} 
      />

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Chart - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <LiveChart 
            symbol={selectedPair}
            stopLoss={chartStopLoss}
            takeProfit={chartTakeProfit}
            onUpdateLevels={handleUpdateLevels}
          />

          {/* Positions List */}
          <PositionsList 
            key={`positions-${refreshKey}`}
            selectedChartSymbol={selectedPair}
            onPositionTPSLUpdate={handlePositionTPSLUpdate}
            showTPSLLines={showTPSLLines}
            onToggleTPSLLines={() => setShowTPSLLines(!showTPSLLines)}
          />

          {/* Order History */}
          <OrderHistory key={`history-${refreshKey}`} />
        </div>

        {/* Trading Panel & Balances */}
        <div className="space-y-6">
          {/* Trading Panel */}
          <TradingPanel 
            selectedPair={selectedPair}
            onTradeExecuted={handleTradeExecuted}
          />

          {/* Balance Display */}
          <BalanceDisplay key={`balance-${refreshKey}`} />

          {/* Market Info */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-3">Market Info</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Change:</span>
                <span className="text-success font-semibold">+5.23%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h High:</span>
                <span className="text-dark dark:text-white font-semibold">$45,234.56</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Low:</span>
                <span className="text-dark dark:text-white font-semibold">$42,123.45</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Volume:</span>
                <span className="text-dark dark:text-white font-semibold">$1.2B</span>
              </div>
            </div>
          </div>

          {/* Trading Info */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="ph:info" className="text-primary" width={18} />
              <h3 className="font-semibold text-dark dark:text-white text-sm">How It Works</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Get Quote</p>
                  <p className="text-xs text-muted">View expected output, fees, and price impact</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Execute Trade</p>
                  <p className="text-xs text-muted">Funds are locked and trade is executed on-chain</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Confirmation</p>
                  <p className="text-xs text-muted">Receive tokens and view transaction details</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 dark:border-darkborder">
              <div className="flex items-center gap-2 text-xs">
                <Icon icon="ph:shield-check" className="text-success" width={14} />
                <span className="text-muted">Powered by 1inch DEX Aggregator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
