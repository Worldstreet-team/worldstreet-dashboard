'use client';

import React, { useState, useEffect } from 'react';
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
import { InsufficientSolModal } from '@/components/futures/InsufficientSolModal';
import type { OrderSide } from '@/store/futuresStore';

export default function BinanceFuturesPage() {
  const { selectedMarket, markets, setSelectedMarket, setMarkets } = useFuturesStore();
  const {
    isInitialized,
    startAutoRefresh,
    stopAutoRefresh,
    showPinUnlock,
    setShowPinUnlock,
    handlePinUnlock,
    showInsufficientSol,
    setShowInsufficientSol,
    solBalanceInfo,
    resetInitializationFailure,
    refreshSummary,
    summary,
    needsInitialization,
    isInitializing,
    initializationError,
    perpMarkets,
    getMarketPrice,
    isClientReady,
  } = useDrift();
  const { fetchWallet } = useFuturesData();

  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'positions' | 'info'>('chart');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSide, setOrderSide] = useState<OrderSide>('long');
  const [initializing, setInitializing] = useState(false);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);

  // Load markets from Drift
  useEffect(() => {
    if (!isClientReady || perpMarkets.size === 0) {
      setIsLoadingMarkets(true);
      return;
    }

    console.log('[FuturesPage] Loading markets from Drift...');
    console.log('[FuturesPage] perpMarkets size:', perpMarkets.size);

    // Convert Map to array and sort by marketIndex to maintain order
    const sortedMarkets = Array.from(perpMarkets.entries())
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([marketIndex, market]) => {
        const markPrice = getMarketPrice(marketIndex, 'perp');
        
        return {
          id: market.symbol,
          symbol: market.symbol,
          baseAsset: market.baseAssetSymbol,
          quoteAsset: 'USD',
          markPrice,
          indexPrice: markPrice,
          lastPrice: markPrice,
          priceChange24h: 0,
          priceChangePercent24h: 0,
          volume24h: 0,
          high24h: markPrice * 1.05,
          low24h: markPrice * 0.95,
          fundingRate: 0,
          nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
          openInterest: 0,
          maxLeverage: 20,
          minOrderSize: 0.001,
          tickSize: 0.01,
        };
      });

    console.log('[FuturesPage] Formatted markets:', sortedMarkets.length);
    setMarkets(sortedMarkets);
    setIsLoadingMarkets(false);

    if (!selectedMarket && sortedMarkets.length > 0) {
      setSelectedMarket(sortedMarkets[0]);
    }
  }, [perpMarkets, isClientReady, getMarketPrice, setMarkets, selectedMarket, setSelectedMarket]);

  // Update prices periodically
  useEffect(() => {
    if (!isClientReady || perpMarkets.size === 0 || markets.length === 0) return;

    const interval = setInterval(() => {
      const updatedMarkets = Array.from(perpMarkets.entries())
        .sort(([indexA], [indexB]) => indexA - indexB)
        .map(([marketIndex, market]) => {
          const markPrice = getMarketPrice(marketIndex, 'perp');
          
          return {
            id: market.symbol,
            symbol: market.symbol,
            baseAsset: market.baseAssetSymbol,
            quoteAsset: 'USD',
            markPrice,
            indexPrice: markPrice,
            lastPrice: markPrice,
            priceChange24h: 0,
            priceChangePercent24h: 0,
            volume24h: 0,
            high24h: markPrice * 1.05,
            low24h: markPrice * 0.95,
            fundingRate: 0,
            nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
            openInterest: 0,
            maxLeverage: 20,
            minOrderSize: 0.001,
            tickSize: 0.01,
          };
        });

      setMarkets(updatedMarkets);
    }, 5000);

    return () => clearInterval(interval);
  }, [perpMarkets, isClientReady, getMarketPrice, setMarkets, markets.length]);

  const handleInitialize = async () => {
    setInitializing(true);
    resetInitializationFailure();
    await refreshSummary();
    setInitializing(false);
  };

  const handleRetryInitialization = async () => {
    resetInitializationFailure();
    await refreshSummary();
  };

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

  if (!walletChecked || isLoadingMarkets) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181a20]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#fcd535]" height={48} />
          <p className="text-white text-sm">
            {!walletChecked ? 'Loading futures trading...' : 'Loading markets from Drift Protocol...'}
          </p>
          {isLoadingMarkets && perpMarkets.size > 0 && (
            <p className="text-gray-400 text-xs mt-2">Found {perpMarkets.size} markets</p>
          )}
        </div>
      </div>
    );
  }

  const currentPrice = selectedMarket?.markPrice || 0;
  const priceChange = 0;
  const isPositive = priceChange >= 0;

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col h-screen bg-white dark:bg-darkgray">
        {/* Mobile Header */}
        <div className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-primary/10 to-warning/10 border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-bold text-dark dark:text-white">WorldStreet Futures</h1>
            {isInitialized && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-success/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] font-medium text-success">Active</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Market Info Bar */}
        <div className="flex-shrink-0 px-3 py-2 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between">
            <div className="relative z-30">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-1 px-2 py-1 rounded active:bg-muted/20"
              >
                <span className="text-sm font-bold text-dark dark:text-white">
                  {selectedMarket?.symbol || 'Select'}
                </span>
                <Icon icon="ph:caret-down" width={12} className="text-muted" />
              </button>
              
              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-xl z-50 min-w-[120px] max-h-[250px] overflow-y-auto">
                    {markets.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => handleSelectMarket(market)}
                        className={`w-full text-left px-3 py-2 text-xs ${
                          selectedMarket?.id === market.id ? 'bg-primary/10 text-primary font-medium' : 'text-dark dark:text-white'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[10px] text-muted">${market.markPrice.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-[10px] ${isPositive ? 'text-success' : 'text-error'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 flex items-center gap-4 px-3 py-2 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
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

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {mobileActiveTab === 'chart' && (
            <div className="h-[400px] bg-white dark:bg-darkgray">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          )}

          {mobileActiveTab === 'positions' && (
            <div className="p-3 space-y-3">
              <PositionPanel />
            </div>
          )}

          {mobileActiveTab === 'info' && (
            <div className="p-3 space-y-3 pb-24">
              {/* Drift Account Status */}
              <div className="bg-white dark:bg-darkgray rounded-xl border border-border dark:border-darkborder p-3">
                <h3 className="text-xs font-bold text-dark dark:text-white mb-2 uppercase">Drift Account</h3>
                {needsInitialization ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted dark:text-gray-400">Account not initialized</p>
                    <button
                      onClick={handleInitialize}
                      disabled={initializing}
                      className="w-full py-2 bg-warning hover:bg-warning/90 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      {initializing ? 'Initializing...' : 'Initialize Account'}
                    </button>
                  </div>
                ) : isInitialized && summary ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/10 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-muted dark:text-gray-400 mb-0.5">Total Collateral</p>
                        <p className="text-xs font-bold text-dark dark:text-white">${summary.totalCollateral.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/10 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-muted dark:text-gray-400 mb-0.5">Available</p>
                        <p className="text-xs font-bold text-success">${summary.freeCollateral.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/10 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-muted dark:text-gray-400 mb-0.5">Unrealized PnL</p>
                        <p className={`text-xs font-bold ${summary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                          {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/10 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-muted dark:text-gray-400 mb-0.5">Open Positions</p>
                        <p className="text-xs font-bold text-dark dark:text-white">{summary.openPositions}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Icon icon="svg-spinners:ring-resize" className="text-primary" height={20} />
                  </div>
                )}
              </div>

              {/* Futures Wallet Balance */}
              <FuturesWalletBalance />
              
              {/* Collateral Panel */}
              <CollateralPanel />
              
              {/* Risk Panel */}
              <RiskPanel />
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Buttons */}
        <div className="flex-shrink-0 flex gap-2 p-3 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder">
          <button 
            onClick={() => handleOpenOrderModal('long')}
            disabled={!isInitialized}
            className="flex-1 py-3 bg-success hover:bg-success/90 active:bg-success/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Long
          </button>
          <button 
            onClick={() => handleOpenOrderModal('short')}
            disabled={!isInitialized}
            className="flex-1 py-3 bg-error hover:bg-error/90 active:bg-error/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Short
          </button>
        </div>
      </div>

      {/* DESKTOP LAYOUT - Professional Two-Column Trading Interface */}
      <div className="hidden md:block fixed inset-0 top-[64px] left-0 xl:left-[260px] bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#111111] dark:to-[#0a0a0a]">
        
        {/* Premium Header Bar - Market Info Only */}
        <div className="h-20 px-8 py-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-6 h-full">
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
                          <div className="flex justify-between items-center">
                            <span>{market.symbol}</span>
                            <span className="text-xs text-muted">${market.markPrice.toFixed(2)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Two-Column Layout: 70/30 Split */}
        <div className="h-[calc(100%-80px)] flex">
          
          {/* LEFT COLUMN (70%): Chart Only */}
          <div className="w-[70%] h-full p-6 pr-3">
            <div className="h-full bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          </div>

          {/* RIGHT COLUMN (30%): Scrollable Info & Actions */}
          <div className="w-[30%] h-full overflow-y-auto pl-3 pr-6 py-6 custom-scrollbar">
            <div className="flex flex-col gap-4">
              
              {/* 1. Quick Actions */}
              <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 p-6">
                <h3 className="text-sm font-bold text-dark dark:text-white mb-4 uppercase tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOpenOrderModal('long')}
                    disabled={!isInitialized}
                    className="group relative overflow-hidden py-4 bg-gradient-to-br from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Icon icon="ph:arrow-up-bold" width={20} />
                      <span className="text-sm">Open Long</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleOpenOrderModal('short')}
                    disabled={!isInitialized}
                    className="group relative overflow-hidden py-4 bg-gradient-to-br from-error to-error/80 hover:from-error/90 hover:to-error/70 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-error/20 hover:shadow-xl hover:shadow-error/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-1">
                      <Icon icon="ph:arrow-down-bold" width={20} />
                      <span className="text-sm">Open Short</span>
                    </div>
                  </button>
                </div>
              </div>

              <DriftAccountStatus />
              <PositionPanel />
              <FuturesWalletBalance />
              <CollateralPanel />
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

      {solBalanceInfo && (
        <InsufficientSolModal
          isOpen={showInsufficientSol}
          onClose={() => {
            setShowInsufficientSol(false);
          }}
          requiredSol={solBalanceInfo.required}
          currentSol={solBalanceInfo.current}
          walletAddress={solBalanceInfo.address}
        />
      )}
    </>
  );
}
