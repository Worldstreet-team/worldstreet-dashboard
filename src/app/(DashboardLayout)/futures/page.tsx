'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';
import { FuturesChart } from '@/components/futures/FuturesChart';
import FuturesMarketList from '@/components/futures/FuturesMarketList';
import FuturesOrderBook from '@/components/futures/FuturesOrderBook';
import FuturesOrderForm from '@/components/futures/FuturesOrderForm';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { RiskPanel } from '@/components/futures/RiskPanel';
import FuturesTradingModal from '@/components/futures/FuturesTradingModal';

type OrderSide = 'long' | 'short';

// Bottom Panel Component with Tabs
const BottomPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'positions' | 'assets'>('positions');

  return (
    <div className="h-full flex flex-col">
      {/* Tabs Row */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-[#1f2329]">
        <button
          onClick={() => setActiveTab('positions')}
          className={`text-[12px] font-medium pb-1 transition-colors ${activeTab === 'positions'
            ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]'
            : 'text-[#848e9c] hover:text-white'
            }`}
        >
          Positions
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`text-[12px] font-medium pb-1 transition-colors ${activeTab === 'assets'
            ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]'
            : 'text-[#848e9c] hover:text-white'
            }`}
        >
          Assets
        </button>
      </div>

      {/* Content Area - No scrollbar */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'positions' ? (
          <PositionPanel />
        ) : (
          <div className="p-4">
            <div className="text-center text-[#848e9c]">
              <Icon icon="ph:chart-line" width={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Futures Trading</p>
              <p className="text-xs mt-1">Connect your trading wallet to view assets</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function HyperliquidFuturesPage() {
  const [selectedPair, setSelectedPair] = useState<string>('BTC-USD');
  const [tradingSide, setTradingSide] = useState<OrderSide>('long');
  const [showTradingModal, setShowTradingModal] = useState(false);

  // Use Hyperliquid markets for futures trading
  const {
    markets: hyperliquidMarkets,
    loading: marketsLoading,
    error: marketsError
  } = useHyperliquidMarkets({
    includeStats: true,
    enabled: true
  });

  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'positions' | 'info'>('chart');
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  // Set default market when Hyperliquid markets are loaded
  useEffect(() => {
    if (hyperliquidMarkets.length > 0 && selectedPair === 'BTC-USD') {
      // Find BTC market or use first available
      const btcMarket = hyperliquidMarkets.find(m =>
        m.symbol.includes('BTC') || m.baseAsset === 'BTC'
      );
      const defaultMarket = btcMarket || hyperliquidMarkets[0];
      setSelectedPair(defaultMarket.symbol);
    }
  }, [hyperliquidMarkets, selectedPair]);

  const handleSelectMarket = (pair: string) => {
    setSelectedPair(pair);
    setShowMarketDropdown(false);
  };

  // Get current market data
  const currentMarket = hyperliquidMarkets.find(m => m.symbol === selectedPair);
  const currentPrice = currentMarket?.price || 0;
  const priceChange = currentMarket?.change24h || 0;
  const isPositive = priceChange >= 0;

  // Get top 10 markets for dropdown
  const topMarkets = hyperliquidMarkets
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 10);

  if (marketsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#f0b90b]" height={48} />
          <p className="text-white text-sm">Loading Trading markets...</p>
        </div>
      </div>
    );
  }

  if (marketsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <Icon icon="ph:warning-circle" className="mx-auto mb-4 text-[#f6465d]" height={48} />
          <p className="text-white text-sm mb-2">Failed to load markets</p>
          <p className="text-[#848e9c] text-xs">{marketsError}</p>
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
              <span className="text-xs font-medium text-[#848e9c]">Hyperliquid Futures</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ecb81]/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
                <span className="text-[9px] font-medium text-[#0ecb81]">Live</span>
              </div>
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
                  {selectedPair}
                </span>
                <Icon icon="ph:caret-down" width={12} className="text-gray-400" />
              </button>

              {showMarketDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMarketDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-xl z-50 min-w-[120px] max-h-[250px] overflow-y-auto scrollbar-hide">
                    {topMarkets.map((market) => (
                      <button
                        key={market.symbol}
                        onClick={() => handleSelectMarket(market.symbol)}
                        className={`w-full text-left px-3 py-2 text-xs ${selectedPair === market.symbol ? 'bg-[#f0b90b]/10 text-[#f0b90b] font-medium' : 'text-white hover:bg-[#2b3139]'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[10px] text-gray-400">${market.price.toFixed(2)}</span>
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
              className={`pb-1 text-xs font-medium capitalize ${mobileActiveTab === tab
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
              <FuturesChart symbol={selectedPair} isDarkMode={true} />
            </div>
          )}

          {mobileActiveTab === 'positions' && (
            <div className="p-3 space-y-3">
              <PositionPanel />
            </div>
          )}

          {mobileActiveTab === 'info' && (
            <div className="p-3 space-y-3 pb-24">
              {/* Hyperliquid Account Status */}
              <div className="bg-[#1e2329] rounded-xl border border-[#2b3139] p-3">
                <h3 className="text-xs font-bold text-white mb-2 uppercase">Trading Account</h3>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Connect your trading wallet to view account details</p>
                  <button className="w-full py-2 bg-warning hover:bg-warning/90 text-white rounded-lg text-xs font-bold">
                    Connect Wallet
                  </button>
                </div>
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
                  {selectedPair}
                </span>
                <span className="text-[11px] text-[#848e9c]">Hyperliquid</span>
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
                    {topMarkets.map((market) => (
                      <button
                        key={market.symbol}
                        onClick={() => handleSelectMarket(market.symbol)}
                        className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${selectedPair === market.symbol
                          ? 'bg-[#1a1f26] text-[#f0b90b]'
                          : 'text-white hover:bg-[#1a1f26]'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{market.symbol}</span>
                          <span className="text-[11px] text-[#848e9c]">${market.price.toFixed(2)}</span>
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
            <div className="flex items-center gap-3 text-[12px]">
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-[#848e9c]">Hyperliquid</span>
                <span className="text-white font-medium">Connect Wallet</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN TRADING AREA - Grid Layout */}
        <div className="h-[calc(100%-60px-220px)] grid grid-cols-[15%_50%_15%_20%]">

          {/* COLUMN 1: Market List (15%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <FuturesMarketList
              selectedMarketSymbol={selectedPair}
              onSelectMarket={(symbol: string) => handleSelectMarket(symbol)}
            />
          </div>

          {/* COLUMN 2: Chart (50%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] p-2">
            <div className="h-full">
              <FuturesChart symbol={selectedPair} isDarkMode={true} />
            </div>
          </div>

          {/* COLUMN 3: Order Book (15%) */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <FuturesOrderBook symbol={selectedPair} />
          </div>

          {/* COLUMN 4: Trading Panel (20%) */}
          <div className="h-full bg-[#0b0e11] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1f2329]">
            <div className="p-2">
              <FuturesOrderForm
                marketIndex={0}
                marketName={selectedPair}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM DATA PANEL - 220px */}
        <div className="h-[220px] bg-[#0b0e11] border-t border-[#1f2329]">
          <BottomPanel />
        </div>
      </div>

      <FuturesTradingModal
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
        side={tradingSide}
        marketIndex={0}
        marketName={selectedPair}
      />
    </>
  );
}