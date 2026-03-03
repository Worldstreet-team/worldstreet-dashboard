"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore } from '@/store/futuresStore';
import { useDrift } from '@/app/context/driftContext';
import { useFuturesData } from '@/hooks/useFuturesData';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { FuturesOrderModal } from '@/components/futures/FuturesOrderModal';
import type { OrderSide } from '@/store/futuresStore';

export default function FuturesPage() {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
  const { isInitialized, startAutoRefresh, stopAutoRefresh } = useDrift();
  const { fetchWallet } = useFuturesData();
  
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'positions' | 'info'>('chart');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSide, setOrderSide] = useState<OrderSide>('long');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');

  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  useEffect(() => {
    if (isInitialized) {
      startAutoRefresh(30000);
      return () => stopAutoRefresh();
    }
  }, [isInitialized, startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    const checkWallet = async () => {
      try {
        const result = await fetchWallet();
        if (!result.exists) {
          setShowWalletModal(true);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      } finally {
        setWalletChecked(true);
      }
    };
    checkWallet();
  }, [fetchWallet]);

  const handleWalletCreated = (address: string) => {
    console.log('Wallet created:', address);
    setShowWalletModal(false);
  };

  const handleSelectMarket = (market: typeof selectedMarket) => {
    setSelectedMarket(market);
    setShowMarketDropdown(false);
  };

  const handleOpenOrderModal = (side: OrderSide) => {
    setOrderSide(side);
    setShowOrderModal(true);
  };

  if (!walletChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-primary" height={48} />
          <p className="text-muted dark:text-darklink">Loading futures trading...</p>
        </div>
      </div>
    );
  }

  const currentPrice = selectedMarket?.markPrice || 0;
  const priceChange = 0;
  const isPositive = priceChange >= 0;
  const formatPrice = (price: number | undefined | null) => (Number(price) || 0).toFixed(2);
  const formatPercentage = (percent: number | undefined | null) => (Number(percent) || 0).toFixed(2);
  
  const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D'];

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-white dark:bg-darkgray">
        <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-primary/10 to-warning/10 border-b border-border dark:border-darkborder">
          <h1 className="text-sm font-bold text-dark dark:text-white">WorldStreet Futures</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="px-4 py-2 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
            <div className="flex items-center justify-between mb-1">
              <div className="relative">
                <button 
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="flex items-center gap-1 hover:bg-muted/10 px-1 py-0.5 rounded"
                >
                  <span className="text-base font-bold text-dark dark:text-white">
                    {selectedMarket?.symbol || 'Select Market'}
                  </span>
                  <Icon icon="ph:caret-down" width={14} className="text-muted" />
                </button>
                
                {showMarketDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-20 min-w-[150px] max-h-[300px] overflow-y-auto">
                    {markets.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => handleSelectMarket(market)}
                        className={`w-full text-left px-4 py-2 hover:bg-muted/10 text-sm ${
                          selectedMarket?.id === market.id ? 'bg-muted/20 text-primary' : 'text-dark dark:text-white'
                        }`}
                      >
                        {market.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <DriftAccountStatus />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                ${formatPrice(currentPrice)}
              </span>
              <span className={`text-xs ${isPositive ? 'text-success' : 'text-error'}`}>
                {isPositive ? '+' : ''}{formatPercentage(priceChange)}%
              </span>
              <span className="text-xs text-warning">PERP</span>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-2 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
            {['chart', 'positions', 'info'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setMobileActiveTab(tab as any)}
                className={`pb-1 text-xs font-medium capitalize ${
                  mobileActiveTab === tab 
                    ? 'text-dark dark:text-white border-b-2 border-warning' 
                    : 'text-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {mobileActiveTab === 'chart' && (
            <div className="h-[50vh] bg-white dark:bg-darkgray">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          )}

          {mobileActiveTab === 'positions' && (
            <div className="bg-white dark:bg-darkgray p-4">
              <PositionPanel />
            </div>
          )}

          {mobileActiveTab === 'info' && (
            <div className="bg-white dark:bg-darkgray p-4 space-y-4">
              <FuturesWalletBalance />
              <CollateralPanel />
              <RiskPanel />
            </div>
          )}

          <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray p-4">
            <PositionPanel />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder z-10">
          <button 
            onClick={() => handleOpenOrderModal('long')}
            className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors"
          >
            Long
          </button>
          <button 
            onClick={() => handleOpenOrderModal('short')}
            className="flex-1 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-lg transition-colors"
          >
            Short
          </button>
        </div>
      </div>

      {/* DESKTOP LAYOUT - Premium Trading Interface */}
      <div className="hidden md:block fixed inset-0 top-[64px] bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#111111] dark:to-[#0a0a0a]">
        
        {/* Premium Header Bar */}
        <div className="h-20 px-8 py-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center justify-between h-full">
            
            {/* Left: Market Info */}
            <div className="flex items-center gap-6">
              {/* Market Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/10 transition-all duration-200 group"
                >
                  <span className="text-xl font-bold text-dark dark:text-white tracking-tight">
                    {selectedMarket?.symbol || 'Select Market'}
                  </span>
                  <Icon 
                    icon="ph:caret-down" 
                    width={18} 
                    className="text-muted dark:text-gray-400 group-hover:text-dark dark:group-hover:text-white transition-colors" 
                  />
                </button>
                
                {showMarketDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 z-50 min-w-[200px] max-h-[400px] overflow-y-auto backdrop-blur-xl">
                      <div className="p-2">
                        {markets.map((market) => (
                          <button
                            key={market.id}
                            onClick={() => handleSelectMarket(market)}
                            className={`w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-all duration-150 ${
                              selectedMarket?.id === market.id 
                                ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                                : 'text-dark dark:text-white'
                            }`}
                          >
                            {market.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Price Display */}
              <div className="flex items-baseline gap-3 pl-6 border-l border-gray-200 dark:border-white/10">
                <div>
                  <div className="text-xs text-muted dark:text-gray-500 mb-0.5 font-medium">Mark Price</div>
                  <span className={`text-3xl font-bold tabular-nums tracking-tight ${
                    isPositive ? 'text-success' : 'text-error'
                  }`}>
                    ${formatPrice(currentPrice)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-sm font-semibold tabular-nums ${
                    isPositive ? 'text-success' : 'text-error'
                  }`}>
                    {isPositive ? '+' : ''}{formatPercentage(priceChange)}%
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                    <Icon icon="ph:lightning-fill" width={12} />
                    PERP
                  </span>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-1 ml-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      selectedTimeframe === tf
                        ? 'bg-white dark:bg-white/10 text-dark dark:text-white shadow-sm'
                        : 'text-muted dark:text-gray-500 hover:text-dark dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Trading Area - Fixed Height Grid */}
        <div className="h-[calc(100%-80px)] grid grid-cols-12 gap-6 p-6">
          
          {/* LEFT COLUMN: Chart (70% width - 8 cols) */}
          <div className="col-span-8 flex flex-col gap-6 h-full">
            {/* Chart Container - Takes remaining space */}
            <div className="flex-1 min-h-0 bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>

            {/* Positions Panel - Fixed height */}
            <div className="h-[280px] flex-shrink-0">
              <PositionPanel />
            </div>
          </div>

          {/* RIGHT COLUMN: Account Stats & Actions (30% width - 4 cols) */}
          <div className="col-span-4 h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex flex-col gap-4">
              {/* Quick Actions Card */}
              <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 p-6">
                <h3 className="text-sm font-bold text-dark dark:text-white mb-4 uppercase tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOpenOrderModal('long')}
                    className="group relative overflow-hidden py-4 bg-gradient-to-br from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Icon icon="ph:arrow-up-bold" width={20} />
                      <span className="text-sm">Open Long</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleOpenOrderModal('short')}
                    className="group relative overflow-hidden py-4 bg-gradient-to-br from-error to-error/80 hover:from-error/90 hover:to-error/70 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-error/20 hover:shadow-xl hover:shadow-error/30 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Icon icon="ph:arrow-down-bold" width={20} />
                      <span className="text-sm">Open Short</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Account Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Balance */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl p-4 border border-primary/20 dark:border-primary/30">
                  <div className="text-xs font-semibold text-primary/70 dark:text-primary/60 mb-1 uppercase tracking-wide">Total Balance</div>
                  <div className="text-xl font-bold text-dark dark:text-white tabular-nums">$0.00</div>
                </div>

                {/* Available */}
                <div className="bg-gradient-to-br from-success/5 to-success/10 dark:from-success/10 dark:to-success/5 rounded-xl p-4 border border-success/20 dark:border-success/30">
                  <div className="text-xs font-semibold text-success/70 dark:text-success/60 mb-1 uppercase tracking-wide">Available</div>
                  <div className="text-xl font-bold text-dark dark:text-white tabular-nums">$0.00</div>
                </div>

                {/* Unrealized PnL */}
                <div className="bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/5 rounded-xl p-4 border border-warning/20 dark:border-warning/30">
                  <div className="text-xs font-semibold text-warning/70 dark:text-warning/60 mb-1 uppercase tracking-wide">Unrealized PnL</div>
                  <div className="text-xl font-bold text-success tabular-nums">+$0.00</div>
                </div>

                {/* Margin Ratio */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
                  <div className="text-xs font-semibold text-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Margin Ratio</div>
                  <div className="text-xl font-bold text-dark dark:text-white tabular-nums">0%</div>
                </div>
              </div>

              {/* Wallet Balance */}
              <FuturesWalletBalance />

              {/* Collateral Panel */}
              <CollateralPanel />

              {/* Risk Panel */}
              <RiskPanel />
            </div>
          </div>
        </div>
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletCreated={handleWalletCreated}
      />

      <FuturesOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        side={orderSide}
        onSuccess={() => setShowOrderModal(false)}
      />
    </>
  );
}
