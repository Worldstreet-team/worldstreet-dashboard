'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
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
import { PinUnlockModal } from '@/components/wallet/PinUnlockModal';
import { InsufficientSolModal } from '@/components/futures/InsufficientSolModal';
import { DriftInitializationOverlay } from '@/components/futures/DriftInitializationOverlay';
import type { OrderSide } from '@/store/futuresStore';

export default function BinanceFuturesPage() {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
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
  } = useDrift();
  const { fetchWallet } = useFuturesData();
  
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'positions' | 'info'>('chart');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSide, setOrderSide] = useState<OrderSide>('long');
  const [initializing, setInitializing] = useState(false);

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
      <div className="flex items-center justify-center min-h-screen bg-[#181a20]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#fcd535]" height={48} />
          <p className="text-white text-sm">Loading futures trading...</p>
        </div>
      </div>
    );
  }

  const currentPrice = selectedMarket?.markPrice || 0;
  const priceChange = 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#181a20] overflow-hidden">
      {/* Top Header Bar - Desktop Only */}
      <div className="hidden md:flex h-12 items-center justify-between px-4 border-b border-[#2b3139] bg-[#181a20] shrink-0">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/worldstreet-logo/WorldStreet4x.png"
              alt="WorldStreet"
              width={28}
              height={28}
            />
            <span className="text-base font-semibold text-white">WorldStreet</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/assets" className="text-[13px] text-[#848e9c] hover:text-white transition-colors">
              Assets
            </Link>
            <Link href="/spot" className="text-[13px] text-[#848e9c] hover:text-white transition-colors">
              Spot
            </Link>
            <Link href="/futures" className="text-[13px] text-[#fcd535] font-medium">
              Futures
            </Link>
          </nav>
        </div>

        {/* Right: Account */}
        <div className="flex items-center gap-3">
          <Link href="/" className="px-3.5 py-1.5 bg-transparent hover:bg-[#2b3139] text-white rounded text-[13px] font-semibold transition-colors">
            Dashboard
          </Link>
          <Link href="/tron-swap" className="px-3.5 py-1.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-[13px] font-semibold transition-colors">
            Tron-swap
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2b3139] bg-[#181a20]">
        <div className="flex items-center gap-2">
          <Image
            src="/worldstreet-logo/WorldStreet4x.png"
            alt="WorldStreet"
            width={24}
            height={24}
          />
          <span className="text-sm font-semibold text-white">WorldStreet</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/assets" className="p-2">
            <Icon icon="ph:wallet" width={20} className="text-[#848e9c] hover:text-white transition-colors" />
          </Link>
          <Link href="/spot" className="p-2">
            <Icon icon="ph:chart-line" width={20} className="text-[#848e9c] hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-[280px_1fr_340px] flex-1 min-h-0">
          {/* LEFT: Position Panel */}
          <div className="border-r border-[#2b3139] overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-hide">
              <PositionPanel />
            </div>
          </div>

          {/* CENTER: Chart + Order Form */}
          <div className="border-r border-[#2b3139] flex flex-col min-h-0">
            {/* Pair Header */}
            <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                    className="flex items-center gap-1.5 hover:bg-[#2b3139] px-2 py-1 rounded transition-colors"
                  >
                    <span className="text-base font-semibold text-white">{selectedMarket?.symbol || 'Select'}</span>
                    <Icon icon="ph:caret-down" width={14} className="text-[#848e9c]" />
                  </button>
                  
                  {showMarketDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 bg-[#2b3139] rounded-lg shadow-lg z-50 min-w-[200px]">
                        {markets.map((market) => (
                          <button
                            key={market.id}
                            onClick={() => handleSelectMarket(market)}
                            className={`w-full px-4 py-3 text-left hover:bg-[#1e2329] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedMarket?.id === market.id ? 'bg-[#1e2329]' : ''
                            }`}
                          >
                            <span className="text-white font-medium text-sm">{market.symbol}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-semibold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    ${Number(currentPrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-[#848e9c]">
                    ${Number(currentPrice).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Change</span>
                  <span className={`font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {isPositive ? '+' : ''}{Number(priceChange).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>

            {/* Order Form Placeholder - Will be styled in Phase 2 */}
            <div className="border-t border-[#2b3139] shrink-0 p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenOrderModal('long')}
                  disabled={!isInitialized}
                  className="flex-1 py-3 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white font-semibold rounded transition-colors disabled:opacity-50"
                >
                  Long
                </button>
                <button
                  onClick={() => handleOpenOrderModal('short')}
                  disabled={!isInitialized}
                  className="flex-1 py-3 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-semibold rounded transition-colors disabled:opacity-50"
                >
                  Short
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Account Info */}
          <div className="flex flex-col min-h-0 overflow-y-auto scrollbar-hide p-4 space-y-4">
            <DriftAccountStatus />
            <FuturesWalletBalance />
            <CollateralPanel />
            <RiskPanel />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-[calc(100vh-60px)]">
          {/* Pair Info Header */}
          <div className="px-4 py-3 border-b border-[#2b3139] bg-[#181a20] shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="relative">
                <button 
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="flex items-center gap-2 hover:bg-[#2b3139] active:bg-[#2b3139]/80 px-2 py-1 rounded transition-all duration-200 active:scale-95 min-h-[44px]"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-white">{selectedMarket?.symbol || 'Select'}</span>
                    <Icon icon="ph:caret-down" width={12} className="text-[#848e9c]" />
                  </div>
                </button>
                
                {showMarketDropdown && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fadeIn" onClick={() => setShowMarketDropdown(false)} />
                    <div className="absolute left-0 top-full mt-2 bg-[#2b3139] rounded-lg shadow-2xl z-50 min-w-[200px] max-h-60 overflow-y-auto scrollbar-hide animate-slideDown">
                      {markets.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => handleSelectMarket(market)}
                          className={`w-full px-4 py-3 text-left hover:bg-[#181a20] active:bg-[#181a20]/80 transition-all duration-200 min-h-[44px] ${
                            selectedMarket?.id === market.id ? 'bg-[#181a20]' : ''
                          }`}
                        >
                          <span className="text-white font-medium">{market.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Icon icon="ph:star" width={18} className="text-[#848e9c]" />
            </div>
            
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-2xl font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                ${Number(currentPrice).toFixed(2)}
              </span>
              <span className="text-sm text-[#848e9c]">
                ${Number(currentPrice).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#848e9c]">24h Change </span>
                <span className={`font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {isPositive ? '+' : ''}{Number(priceChange).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#2b3139] bg-[#181a20] overflow-x-auto scrollbar-hide shrink-0">
            {(['chart', 'positions', 'info'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileActiveTab(tab)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200 active:scale-95 ${
                  mobileActiveTab === tab
                    ? 'border-[#fcd535] text-white'
                    : 'border-transparent text-[#848e9c] active:text-white'
                }`}
              >
                {tab === 'chart' && 'Chart'}
                {tab === 'positions' && 'Positions'}
                {tab === 'info' && 'Account'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* Chart Tab */}
            <div 
              className={`absolute inset-0 transition-all duration-300 ${
                mobileActiveTab === 'chart' 
                  ? 'translate-x-0 opacity-100' 
                  : 'translate-x-full opacity-0 pointer-events-none'
              }`}
            >
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
            
            {/* Positions Tab */}
            <div 
              className={`absolute inset-0 overflow-y-auto scrollbar-hide p-4 transition-all duration-300 ${
                mobileActiveTab === 'positions' 
                  ? 'translate-x-0 opacity-100' 
                  : '-translate-x-full opacity-0 pointer-events-none'
              }`}
            >
              <PositionPanel />
            </div>
            
            {/* Info Tab */}
            <div 
              className={`absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-4 pb-24 transition-all duration-300 ${
                mobileActiveTab === 'info' 
                  ? 'translate-x-0 opacity-100' 
                  : 'translate-x-full opacity-0 pointer-events-none'
              }`}
            >
              {needsInitialization ? (
                <div className="bg-[#2b3139] rounded-lg p-4 animate-fadeIn">
                  <h3 className="text-xs font-bold text-white mb-2 uppercase">Drift Account</h3>
                  <p className="text-xs text-[#848e9c] mb-3">Account not initialized</p>
                  <button
                    onClick={handleInitialize}
                    disabled={initializing}
                    className="w-full py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 active:scale-95 text-[#181a20] rounded text-xs font-bold disabled:opacity-50 transition-all duration-200"
                  >
                    {initializing ? 'Initializing...' : 'Initialize Account'}
                  </button>
                </div>
              ) : (
                <>
                  <DriftAccountStatus />
                  <FuturesWalletBalance />
                  <CollateralPanel />
                  <RiskPanel />
                </>
              )}
            </div>
          </div>

          {/* Fixed Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-0 border-t border-[#2b3139] bg-[#181a20] safe-area-bottom shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <button 
              onClick={() => handleOpenOrderModal('long')}
              disabled={!isInitialized}
              className="py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 active:bg-[#0ecb81]/80 text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[56px]"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon icon="ph:arrow-up-bold" width={18} />
                Long
              </span>
            </button>
            <button 
              onClick={() => handleOpenOrderModal('short')}
              disabled={!isInitialized}
              className="py-4 bg-[#f6465d] hover:bg-[#f6465d]/90 active:bg-[#f6465d]/80 text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[56px]"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon icon="ph:arrow-down-bold" width={18} />
                Short
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <PinUnlockModal
        isOpen={showPinUnlock}
        onClose={() => setShowPinUnlock(false)}
        onUnlock={handlePinUnlock}
        title="Unlock Drift Wallet"
        description="Enter your PIN to access Drift Protocol trading"
      />

      {solBalanceInfo && (
        <InsufficientSolModal
          isOpen={showInsufficientSol}
          onClose={() => setShowInsufficientSol(false)}
          requiredSol={solBalanceInfo.required}
          currentSol={solBalanceInfo.current}
          walletAddress={solBalanceInfo.address}
        />
      )}

      {/* Initialization Overlay */}
      <DriftInitializationOverlay
        isLoading={isInitializing}
        error={initializationError}
        onRetry={handleRetryInitialization}
      />
    </div>
  );
}
