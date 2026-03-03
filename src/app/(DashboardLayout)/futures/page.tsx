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

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-white dark:bg-darkgray">
        <div className="flex-shrink-0 px-4 py-2 bg-warning border-b border-warning-dark">
          <h1 className="text-sm font-bold text-white">WorldStreet Futures</h1>
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

      {/* DESKTOP LAYOUT - Horizontal/Row Based */}
      <div className="hidden md:flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-darkgray">
        {/* Compact Header - Single Line */}
        <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="flex items-center gap-1 hover:bg-muted/10 px-1.5 py-0.5 rounded"
                >
                  <span className="text-sm font-bold text-dark dark:text-white">
                    {selectedMarket?.symbol || 'Select Market'}
                  </span>
                  <Icon icon="ph:caret-down" width={10} className="text-muted" />
                </button>
                
                {showMarketDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg shadow-lg z-50 min-w-[150px] max-h-[400px] overflow-y-auto">
                      {markets.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => handleSelectMarket(market)}
                          className={`w-full text-left px-3 py-1.5 hover:bg-muted/10 text-xs ${
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
              
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                  ${formatPrice(currentPrice)}
                </span>
                <span className={`text-[10px] ${isPositive ? 'text-success' : 'text-error'}`}>
                  {isPositive ? '+' : ''}{formatPercentage(priceChange)}%
                </span>
                <span className="text-[10px] text-warning font-medium">PERP</span>
              </div>
            </div>
            
            <DriftAccountStatus />
          </div>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="flex-1 overflow-hidden flex flex-row">
          {/* Left Section: Chart (60% width) */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border dark:border-darkborder">
            <div className="flex-1 overflow-hidden bg-white dark:bg-darkgray">
              <FuturesChart symbol={selectedMarket?.symbol} isDarkMode={true} />
            </div>
          </div>

          {/* Middle Section: Positions & Info Tabs (25% width) */}
          <div className="w-[25%] min-w-[300px] flex flex-col overflow-hidden border-r border-border dark:border-darkborder bg-white dark:bg-darkgray">
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border dark:border-darkborder">
              {['positions', 'info'].map((tab) => (
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

            <div className="flex-1 overflow-y-auto">
              {mobileActiveTab === 'positions' && (
                <div className="p-3">
                  <PositionPanel />
                </div>
              )}

              {mobileActiveTab === 'info' && (
                <div className="p-3 space-y-3">
                  <FuturesWalletBalance />
                  <CollateralPanel />
                  <RiskPanel />
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Quick Actions (15% width) */}
          <div className="w-[15%] min-w-[220px] flex flex-col overflow-hidden bg-white dark:bg-darkgray">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs text-muted mb-2">Quick Actions</div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleOpenOrderModal('long')}
                    className="w-full py-2.5 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    Open Long
                  </button>
                  <button
                    onClick={() => handleOpenOrderModal('short')}
                    className="w-full py-2.5 bg-error hover:bg-error/90 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    Open Short
                  </button>
                </div>
              </div>

              <FuturesWalletBalance />
              <CollateralPanel />
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
