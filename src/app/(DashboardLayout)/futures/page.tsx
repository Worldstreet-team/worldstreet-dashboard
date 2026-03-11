'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useDrift } from '@/app/context/driftContext';
import { useFuturesData } from '@/hooks/useFuturesData';
import { FuturesChart } from '@/components/futures/FuturesChart';
import BinanceOrderBook from '@/components/spot/BinanceOrderBook';
import BinanceMarketList from '@/components/spot/BinanceMarketList';
import FuturesOrderForm from '@/components/futures/FuturesOrderForm';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { InsufficientSolModal } from '@/components/futures/InsufficientSolModal';
import FuturesTradingModal from '@/components/futures/FuturesTradingModal';

type OrderSide = 'long' | 'short';

export default function BinanceFuturesPage() {
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(null);
  const [tradingSide, setTradingSide] = useState<OrderSide>('long');
  const [showTradingModal, setShowTradingModal] = useState(false);
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
        {/* Mobile Header with Navigation */}
        <div className="flex-shrink-0 bg-[#0b0e11] border-b border-[#2b3139]">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/worldstreet-logo/WorldStreet4x.png"
                alt="WorldStreet"
                width={24}
                height={24}
              />
              <span className="text-sm font-semibold text-white">WorldStreet</span>
            </div>
            
            {/* Navigation Icons */}
            <div className="flex items-center gap-3">
              <Link href="/assets" className="p-2 hover:bg-[#1e2329] rounded-lg transition-colors">
                <Icon icon="ph:wallet" width={20} className="text-[#848e9c] hover:text-white transition-colors" />
              </Link>
              <Link href="/futures" className="p-2 bg-[#1e2329] rounded-lg">
                <Icon icon="ph:chart-line" width={20} className="text-[#f0b90b]" />
              </Link>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#848e9c]">Futures Trading</span>
              {isInitialized && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ecb81]/10 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
                  <span className="text-[9px] font-medium text-[#0ecb81]">Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Market Info Bar */}
        <div className="flex-shrink-0 px-3 py-2 bg-[#0b0e11] border-b border-[#2b3139]">
          <div className="flex items-center justify-between">
            <div className="relative z-50">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-1 px-2 py-1 rounded active:bg-white/5"
              >
                <span className="text-sm font-bold text-white">
                  {currentMarketName}
                </span>
                <Icon icon="ph:caret-down" width={12} className="text-gray-400" />
              </button>
              
              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-xl z-50 min-w-[120px] max-h-[250px] overflow-y-auto scrollbar-hide">
                    {topMarkets.map(([marketIndex, market]) => (
                      <button
                        key={marketIndex}
                        onClick={() => handleSelectMarket(marketIndex)}
                        className={`w-full text-left px-3 py-2 text-xs ${
                          selectedMarketIndex === marketIndex ? 'bg-[#f0b90b]/10 text-[#f0b90b] font-medium' : 'text-white hover:bg-[#2b3139]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[10px] text-gray-400">${(getMarketPrice(marketIndex, 'perp') || 0).toFixed(2)}</span>
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
            <div className="h-[400px] bg-[#0b0e11]">
              <FuturesChart symbol={currentMarketName} isDarkMode={true} />
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
        <div className="flex-shrink-0 p-3 bg-[#181a20] border-t border-[#2b3139]">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setTradingSide('long');
                setShowTradingModal(true);
              }}
              className="py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white font-semibold text-base rounded-lg transition-colors"
            >
              Long
            </button>
            <button
              onClick={() => {
                setTradingSide('short');
                setShowTradingModal(true);
              }}
              className="py-4 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-semibold text-base rounded-lg transition-colors"
            >
              Short
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT - Bybit Style Trading Interface */}
      <div className="hidden md:block fixed inset-0 bg-[#0b0e11]">
        
        {/* HEADER - 60px Bybit Style */}
        <div className="h-[60px] px-4 bg-[#0b0e11] border-b border-[#1f2329] flex items-center justify-between relative z-50">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/worldstreet-logo/WorldStreet4x.png"
                alt="WorldStreet"
                width={24}
                height={24}
              />
              <span className="text-[13px] font-medium text-white">WorldStreet</span>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/assets" className="text-[12px] text-[#848e9c] hover:text-white transition-colors font-medium">
                Assets
              </Link>
              <Link href="/futures" className="text-[12px] text-[#f0b90b] font-medium">
                Futures
              </Link>
            </nav>
          </div>

          {/* Center: Market Selector + Price Stats */}
          <div className="flex items-center gap-6">
            {/* Market Selector */}
            <div className="relative z-50">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-[#1a1f26] rounded transition-colors"
              >
                <span className="text-[14px] font-bold text-white">
                  {currentMarketName}
                </span>
                <span className="text-[11px] text-[#848e9c]">Perpetual</span>
                <Icon 
                  icon="ph:caret-down" 
                  width={14} 
                  className="text-[#848e9c]" 
                />
              </button>
              
              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-[#0f1419] border border-[#1f2329] rounded shadow-xl z-50 min-w-[180px] max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1f2329]">
                    {topMarkets.map(([marketIndex, market]) => (
                      <button
                        key={marketIndex}
                        onClick={() => handleSelectMarket(marketIndex)}
                        className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${
                          selectedMarketIndex === marketIndex 
                            ? 'bg-[#1a1f26] text-[#f0b90b]' 
                            : 'text-white hover:bg-[#1a1f26]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[11px] text-[#848e9c]">${(getMarketPrice(marketIndex, 'perp') || 0).toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Price Stats */}
            <div className="flex items-center gap-4 text-[12px]">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#848e9c]">Price</span>
                <span className={`text-[14px] font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  ${currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#848e9c]">24h Change</span>
                <span className={`text-[12px] font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Account Status */}
          <div className="flex items-center gap-4">
            {isInitialized && summary && (
              <div className="flex items-center gap-3 text-[12px]">
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-[#848e9c]">Available</span>
                  <span className="text-white font-medium">${summary.freeCollateral.toFixed(2)}</span>
                </div>
                <div className="w-px h-6 bg-[#1f2329]" />
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-[#848e9c]">Unrealized PnL</span>
                  <span className={`font-medium ${summary.unrealizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN TRADING AREA - Grid Layout */}
        <div className="h-[calc(100%-60px-220px)] grid grid-cols-[15%_50%_15%_20%]">
          
          {/* COLUMN 1: Market List (15%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <BinanceMarketList 
              selectedPair={currentMarketName}
              onSelectPair={(pair) => {
                const market = Array.from(perpMarkets.entries()).find(([_, info]) => 
                  info.symbol === pair || `${info.symbol}-PERP` === pair
                );
                if (market) {
                  handleSelectMarket(market[0]);
                }
              }}
            />
          </div>

          {/* COLUMN 2: Chart (50%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] p-2">
            <div className="h-full">
              <FuturesChart symbol={currentMarketName} isDarkMode={true} />
            </div>
          </div>

          {/* COLUMN 3: Order Book (15%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <BinanceOrderBook selectedPair={currentMarketName} />
          </div>

          {/* COLUMN 4: Trading Panel (20%) */}
          <div className="h-full bg-[#0b0e11] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1f2329]">
            <div className="p-2">
              <FuturesOrderForm 
                marketIndex={selectedMarketIndex ?? 0}
                marketName={currentMarketName}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM DATA PANEL - 220px */}
        <div className="h-[220px] bg-[#0b0e11] border-t border-[#1f2329]">
          <div className="h-full flex flex-col">
            {/* Tabs Row */}
            <div className="flex items-center gap-6 px-4 py-2 border-b border-[#1f2329]">
              <button className="text-[12px] font-medium text-[#f0b90b] pb-1 border-b-2 border-[#f0b90b]">
                Positions
              </button>
              <button className="text-[12px] font-medium text-[#848e9c] hover:text-white transition-colors">
                Open Orders
              </button>
              <button className="text-[12px] font-medium text-[#848e9c] hover:text-white transition-colors">
                Order History
              </button>
              <button className="text-[12px] font-medium text-[#848e9c] hover:text-white transition-colors">
                Assets
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1f2329]">
              <div className="p-2 space-y-2">
                <PositionPanel />
                <DriftAccountStatus />
              </div>
            </div>
          </div>
        </div>
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletCreated={handleWalletCreated}
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

      <FuturesTradingModal
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
        side={tradingSide}
        marketIndex={selectedMarketIndex ?? 0}
        marketName={currentMarketName}
      />
    </>
  );
}
