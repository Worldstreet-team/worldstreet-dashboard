'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';
import { useFuturesData } from '@/hooks/useFuturesData';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { FuturesOrderBook } from '@/components/futures/FuturesOrderBook';
import { FuturesMarketList } from '@/components/futures/FuturesMarketList';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { FuturesOrderModal } from '@/components/futures/FuturesOrderModal';
import { InsufficientSolModal } from '@/components/futures/InsufficientSolModal';

type OrderSide = 'long' | 'short';

export default function BinanceFuturesPage() {
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(null);
  const {
    isInitialized,
    startAutoRefresh,
    stopAutoRefresh,
    showInsufficientSol,
    setShowInsufficientSol,
    solBalanceInfo,
    resetInitializationFailure,
    refreshSummary,
    summary,
    needsInitialization,
    perpMarkets,
    getMarketPrice,
    getMarketName,
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

  // Set default market when Drift is ready
  useEffect(() => {
    if (!isClientReady || perpMarkets.size === 0) {
      setIsLoadingMarkets(true);
      return;
    }

    console.log('[FuturesPage] Drift ready with', perpMarkets.size, 'perp markets');
    setIsLoadingMarkets(false);

    // Set first market as default if none selected
    if (selectedMarketIndex === null) {
      const firstMarketIndex = Array.from(perpMarkets.keys()).sort((a, b) => a - b)[0];
      if (firstMarketIndex !== undefined) {
        setSelectedMarketIndex(firstMarketIndex);
        console.log('[FuturesPage] Selected default market:', firstMarketIndex);
      }
    }
  }, [perpMarkets, isClientReady, selectedMarketIndex]);

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

  const handleSelectMarket = (marketIndex: number) => {
    setSelectedMarketIndex(marketIndex);
    setShowMarketDropdown(false);
  };

  const handleOpenOrderModal = (side: OrderSide) => {
    setOrderSide(side);
    setShowOrderModal(true);
  };

  // Get current market data
  const currentMarketName = selectedMarketIndex !== null ? getMarketName(selectedMarketIndex) : 'Select Market';
  const currentPrice = selectedMarketIndex !== null ? getMarketPrice(selectedMarketIndex, 'perp') : 0;
  const priceChange = 0;
  const isPositive = priceChange >= 0;

  // Get top 10 markets for dropdown
  const topMarkets = Array.from(perpMarkets.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 10);

  if (!walletChecked || isLoadingMarkets) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#f0b90b]" height={48} />
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

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col h-screen bg-[#0b0e11]">
        {/* Mobile Header */}
        <div className="flex-shrink-0 px-3 py-2 bg-[#1e2329] border-b border-[#2b3139]">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-bold text-white">Futures Trading</h1>
            {isInitialized && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ecb81]/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
                <span className="text-[9px] font-medium text-[#0ecb81]">Active</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Market Info Bar */}
        <div className="flex-shrink-0 px-3 py-2 bg-[#0b0e11] border-b border-[#2b3139]">
          <div className="flex items-center justify-between">
            <div className="relative z-30">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-1 px-2 py-1 rounded active:bg-white/5"
              >
                <span className="text-sm font-bold text-white">
                  {selectedMarket?.symbol || 'Select'}
                </span>
                <Icon icon="ph:caret-down" width={12} className="text-gray-400" />
              </button>
              
              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-xl z-50 min-w-[120px] max-h-[250px] overflow-y-auto">
                    {markets.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => handleSelectMarket(market)}
                        className={`w-full text-left px-3 py-2 text-xs ${
                          selectedMarket?.id === market.id ? 'bg-primary/10 text-primary font-medium' : 'text-white'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[10px] text-gray-400">${(Number(market.markPrice) || 0).toFixed(2)}</span>
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
        <div className="flex-shrink-0 flex items-center gap-4 px-3 py-2 border-b border-[#2b3139] bg-[#181a20]">
          {['chart', 'positions', 'info'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setMobileActiveTab(tab as any)}
              className={`pb-1 text-xs font-medium capitalize ${
                mobileActiveTab === tab 
                  ? 'text-white border-b-2 border-warning' 
                  : 'text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {mobileActiveTab === 'chart' && (
            <div className="h-[400px] bg-[#181a20]">
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
              <div className="bg-[#1e2329] rounded-xl border border-[#2b3139] p-3">
                <h3 className="text-xs font-bold text-white mb-2 uppercase">Drift Account</h3>
                {needsInitialization ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Account not initialized</p>
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
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 mb-0.5">Total Collateral</p>
                        <p className="text-xs font-bold text-white">${summary.totalCollateral.toFixed(2)}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 mb-0.5">Available</p>
                        <p className="text-xs font-bold text-success">${summary.freeCollateral.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 mb-0.5">Unrealized PnL</p>
                        <p className={`text-xs font-bold ${summary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                          {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 mb-0.5">Open Positions</p>
                        <p className="text-xs font-bold text-white">{summary.openPositions}</p>
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
        <div className="flex-shrink-0 flex gap-2 p-3 bg-[#181a20] border-t border-[#2b3139]">
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
      <div className="hidden md:block fixed inset-0 top-[64px] left-0 xl:left-[260px] bg-[#0a0a0a]">
        
        {/* Premium Header Bar - Market Info Only */}
        <div className="h-20 px-8 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-6 h-full">
            {/* Market Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group"
              >
                <span className="text-xl font-bold text-white tracking-tight">
                  {selectedMarket?.symbol || 'Select Market'}
                </span>
                <Icon 
                  icon="ph:caret-down" 
                  width={18} 
                  className="text-gray-400 group-hover:text-white transition-colors" 
                />
              </button>
              
              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 min-w-[200px] max-h-[400px] overflow-y-auto backdrop-blur-xl">
                    <div className="p-2">
                      {markets.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => handleSelectMarket(market)}
                          className={`w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-medium transition-all duration-150 ${
                            selectedMarket?.id === market.id 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-white'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{market.symbol}</span>
                            <span className="text-xs text-gray-400">${(Number(market.markPrice) || 0).toFixed(2)}</span>
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
            <div className="h-full bg-[#0d0d0d] rounded-2xl border border-white/5 shadow-lg shadow-black/20 overflow-hidden">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          </div>

          {/* RIGHT COLUMN (30%): Scrollable Info & Actions */}
          <div className="w-[30%] h-full overflow-y-auto pl-3 pr-6 py-6 custom-scrollbar">
            <div className="flex flex-col gap-4">
              
              {/* 1. Quick Actions */}
              <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 shadow-lg shadow-black/20 p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Quick Actions</h3>
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
        marketIndex={selectedMarketIndex ?? 0}
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
