"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore } from '@/store/futuresStore';
import { useDrift } from '@/app/context/driftContext';
import { useFuturesData } from '@/hooks/useFuturesData';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { OrderPanel } from '@/components/futures/OrderPanel';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';

export default function FuturesPage() {
  const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();
  const { isInitialized, startAutoRefresh, stopAutoRefresh } = useDrift();
  const { fetchWallet } = useFuturesData();
  
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'positions' | 'info'>('chart');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [orderSide, setOrderSide] = useState<'long' | 'short'>('long');

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  // Start auto-refresh when account is initialized
  useEffect(() => {
    if (isInitialized) {
      startAutoRefresh(30000);
      return () => stopAutoRefresh();
    }
  }, [isInitialized, startAutoRefresh, stopAutoRefresh]);

  // Check wallet
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
  const priceChange = 0; // TODO: Calculate from market data
  const isPositive = priceChange >= 0;

  // Safe formatting functions
  const formatPrice = (price: number | undefined | null) => {
    const value = Number(price);
    return (isNaN(value) ? 0 : value).toFixed(2);
  };

  const formatPercentage = (percent: number | undefined | null) => {
    const value = Number(percent);
    return (isNaN(value) ? 0 : value).toFixed(2);
  };

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-white dark:bg-darkgray">
        {/* App Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-warning border-b border-warning-dark">
          <h1 className="text-base font-bold text-white">WorldStreet Futures Trading</h1>
        </div>
        
        {/* Market Header with Price Info */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          {/* Drift Account Status */}
          <div className="mb-2">
            <DriftAccountStatus />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="relative">
              <button 
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="flex items-center gap-2 hover:bg-muted/10 px-2 py-1 rounded"
              >
                <span className="text-lg font-bold text-dark dark:text-white">
                  {selectedMarket?.symbol || 'Select Market'}
                </span>
                <Icon icon="ph:caret-down" width={16} className="text-muted" />
              </button>
              
              {/* Market Dropdown */}
              {showMarketDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-20 min-w-[150px] max-h-[300px] overflow-y-auto">
                  {markets.map((market) => (
                    <button
                      key={market.id}
                      onClick={() => handleSelectMarket(market)}
                      className={`w-full text-left px-4 py-2 hover:bg-muted/10 ${
                        selectedMarket?.id === market.id ? 'bg-muted/20 text-primary' : 'text-dark dark:text-white'
                      }`}
                    >
                      {market.symbol}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{selectedMarket?.baseAsset || 'Perpetual'}</span>
              <Icon icon="ph:arrow-up-right" width={12} className="text-muted" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
              ${formatPrice(currentPrice)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              ${formatPrice(currentPrice)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
              {isPositive ? '+' : ''}{formatPercentage(priceChange)}%
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-warning">PERP</span>
            <span className="text-muted">Leverage: Up to 20x</span>
            <Icon icon="ph:caret-right" width={12} className="text-muted" />
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
            onClick={() => setMobileActiveTab('positions')}
            className={`pb-2 text-sm font-medium ${
              mobileActiveTab === 'positions' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Positions
          </button>
          <button 
            onClick={() => setMobileActiveTab('info')}
            className={`pb-2 text-sm font-medium ${
              mobileActiveTab === 'info' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Info
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Chart Area */}
          {mobileActiveTab === 'chart' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          )}

          {/* Positions */}
          {mobileActiveTab === 'positions' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray overflow-auto p-4">
              <PositionPanel />
            </div>
          )}

          {/* Info */}
          {mobileActiveTab === 'info' && (
            <div className="h-[65vh] bg-white dark:bg-darkgray overflow-auto p-4 space-y-4">
              <FuturesWalletBalance />
              <CollateralPanel />
              <RiskPanel />
            </div>
          )}

          {/* Bottom Tabs - Positions Summary */}
          <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray pb-20">
            <div className="p-4">
              <PositionPanel />
            </div>
          </div>
        </div>

        {/* Long/Short Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white dark:bg-darkgray border-t border-border dark:border-darkborder z-10">
          <button 
            onClick={() => setOrderSide('long')}
            className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors"
          >
            Long
          </button>
          <button 
            onClick={() => setOrderSide('short')}
            className="flex-1 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-lg transition-colors"
          >
            Short
          </button>
        </div>
      </div>

      {/* DESKTOP/TABLET LAYOUT */}
      <div className="hidden md:flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-darkgray">
        {/* Market Header with Price Info - Compact */}
        <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="flex items-center gap-1.5 hover:bg-muted/10 px-2 py-1 rounded"
                >
                  <span className="text-base font-bold text-dark dark:text-white">
                    {selectedMarket?.symbol || 'Select Market'}
                  </span>
                  <Icon icon="ph:caret-down" width={14} className="text-muted" />
                </button>
                
                {/* Market Dropdown */}
                {showMarketDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMarketDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-50 min-w-[150px] max-h-[400px] overflow-y-auto">
                      {markets.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => handleSelectMarket(market)}
                          className={`w-full text-left px-4 py-2 hover:bg-muted/10 ${
                            selectedMarket?.id === market.id ? 'bg-muted/20 text-primary' : 'text-dark dark:text-white'
                          }`}
                        >
                          {market.symbol}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                  ${formatPrice(currentPrice)}
                </span>
                <span className={`text-xs ${isPositive ? 'text-success' : 'text-error'}`}>
                  {isPositive ? '+' : ''}{formatPercentage(priceChange)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{selectedMarket?.baseAsset || 'Perpetual'}</span>
              <DriftAccountStatus />
            </div>
          </div>
        </div>

        {/* Chart Tabs */}
        <div className="flex-shrink-0 flex items-center gap-4 px-3 py-1 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
          <button 
            onClick={() => setMobileActiveTab('chart')}
            className={`pb-1 text-xs font-medium ${
              mobileActiveTab === 'chart' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Chart
          </button>
          <button 
            onClick={() => setMobileActiveTab('positions')}
            className={`pb-1 text-xs font-medium ${
              mobileActiveTab === 'positions' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Positions
          </button>
          <button 
            onClick={() => setMobileActiveTab('info')}
            className={`pb-1 text-xs font-medium ${
              mobileActiveTab === 'info' 
                ? 'text-dark dark:text-white border-b-2 border-warning' 
                : 'text-muted'
            }`}
          >
            Info
          </button>
        </div>

        {/* Main Content Area - 2 Column Layout for Desktop */}
        <div className="flex-1 overflow-hidden grid grid-cols-[1fr_320px]">
          {/* Left: Chart + Bottom Tabs */}
          <div className="flex flex-col overflow-hidden">
            {/* Chart Area */}
            <div className="flex-1 overflow-hidden">
              {mobileActiveTab === 'chart' && (
                <div className="h-full bg-white dark:bg-darkgray">
                  <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
                </div>
              )}

              {mobileActiveTab === 'positions' && (
                <div className="h-full bg-white dark:bg-darkgray overflow-auto p-4">
                  <PositionPanel />
                </div>
              )}

              {mobileActiveTab === 'info' && (
                <div className="h-full bg-white dark:bg-darkgray overflow-auto p-4 space-y-4">
                  <FuturesWalletBalance />
                  <CollateralPanel />
                  <RiskPanel />
                </div>
              )}
            </div>

            {/* Bottom Tabs - Positions */}
            <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray h-[180px] flex-shrink-0 overflow-auto">
              <PositionPanel />
            </div>
          </div>

          {/* Right: Order Panel (Mobile Style) */}
          <div className="border-l border-border dark:border-darkborder flex flex-col overflow-hidden bg-white dark:bg-darkgray">
            {/* Order Panel Content */}
            <div className="flex-1 overflow-y-auto p-2">
              <OrderPanel />
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletCreated={handleWalletCreated}
      />
    </>
  );
}
