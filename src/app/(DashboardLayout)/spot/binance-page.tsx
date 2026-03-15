'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import BinanceOrderBook from '@/components/spot/BinanceOrderBook';
import BinanceMarketList from '@/components/spot/BinanceMarketList';
import BinanceOrderForm from '@/components/spot/BinanceOrderForm';
import BinanceBottomPanel from '@/components/spot/BinanceBottomPanel';
import LiveChart from '@/components/spot/LiveChart';
import MarketTrades from '@/components/spot/MarketTrades';
import MobileTradingModal from '@/components/spot/MobileTradingModal';
import PositionsPanel from '@/components/spot/PositionsPanel';
import MobileTokenSearchModal from '@/components/spot/MobileTokenSearchModal';
import HyperliquidBalanceDisplay from '@/components/spot/HyperliquidBalanceDisplay';
import SpotDepositModal from '@/components/spot/SpotDepositModal';
import SpotWithdrawModal from '@/components/spot/SpotWithdrawModal';
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';

interface PairData {
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export default function BinanceSpotPage() {
  const searchParams = useSearchParams();

  // Clerk authentication
  const { user, isLoaded } = useUser();

  // Use Hyperliquid markets for spot trading
  const {
    markets: hyperliquidMarkets,
    loading: marketsLoading
  } = useHyperliquidMarkets({
    includeStats: true,
    enabled: true
  });

  // Dynamic tradeable pairs from Hyperliquid
  const AVAILABLE_PAIRS = React.useMemo(() => {
    const defaultPairs = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'LINK'];

    if (hyperliquidMarkets.length > 0) {
      const hyperliquidPairs = hyperliquidMarkets
        .map(market => market.baseAsset)
        .filter(asset => asset && asset !== 'USD');

      return [...new Set([...defaultPairs, ...hyperliquidPairs])];
    }

    return defaultPairs;
  }, [hyperliquidMarkets]);

  // State management
  const [selectedPair, setSelectedPair] = useState<string>('BTC');
  const [pairData, setPairData] = useState<PairData>({
    name: 'BTC',
    price: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0
  });

  // Mobile states
  const [showMobileTradingModal, setShowMobileTradingModal] = useState(false);
  const [mobileOrderSide, setMobileOrderSide] = useState<'buy' | 'sell'>('buy');
  const [showTokenSearchModal, setShowTokenSearchModal] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'orderbook' | 'trades' | 'positions'>('chart');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  // Update pair data when Hyperliquid markets change
  useEffect(() => {
    if (hyperliquidMarkets.length > 0) {
      const market = hyperliquidMarkets.find(m =>
        m.baseAsset === selectedPair || m.symbol === selectedPair
      );

      if (market) {
        setPairData({
          name: market.baseAsset,
          price: market.price,
          change24h: market.change24h,
          high24h: market.high24h,
          low24h: market.low24h,
          volume24h: market.volume24h
        });
      }
    }
  }, [hyperliquidMarkets, selectedPair]);

  // URL parameter handling
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (pair && AVAILABLE_PAIRS.includes(pair)) {
      setSelectedPair(pair);
    }
  }, [searchParams, AVAILABLE_PAIRS]);

  const refreshBalances = useCallback(() => {
    setBalanceRefreshKey((k) => k + 1);
  }, []);

  const handlePairSelect = useCallback((pair: string) => {
    // Extract base asset from pair (e.g., "BTC-USD" -> "BTC")
    const baseAsset = pair.split('-')[0] || pair;
    setSelectedPair(baseAsset);

    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('pair', baseAsset);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleMobileTrade = (side: 'buy' | 'sell') => {
    setMobileOrderSide(side);
    setShowMobileTradingModal(true);
  };

  const isPositive = pairData.change24h >= 0;

  if (marketsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e11]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#f0b90b]" height={48} />
          <p className="text-white text-sm">Loading Trading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col h-screen bg-[#0b0e11] text-white">
        {/* Mobile Header */}
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
              <Link href="/spot" className="p-2 bg-[#1e2329] rounded-lg">
                <Icon icon="ph:chart-bar" width={20} className="text-[#f0b90b]" />
              </Link>
            </div>
          </div>

          {/* Status Bar */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#848e9c]">Spot</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ecb81]/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
                <span className="text-[9px] font-medium text-[#0ecb81]">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Pair Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#0b0e11] border-b border-[#2b3139]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowTokenSearchModal(true)}
              className="flex items-center gap-2"
            >
              <span className="text-lg font-bold text-white">{pairData.name}/USD</span>
              <Icon icon="ph:caret-down" width={16} className="text-[#848e9c]" />
            </button>

            <div className="text-right">
              <div className={`text-lg font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                ${pairData.price.toFixed(2)}
              </div>
              <div className={`text-xs ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {isPositive ? '+' : ''}{pairData.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-[#2b3139] bg-[#181a20]">
          {['chart', 'orderbook', 'trades', 'positions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileActiveTab(tab as any)}
              className={`pb-1 text-xs font-medium capitalize ${mobileActiveTab === tab
                ? 'text-white border-b-2 border-[#f0b90b]'
                : 'text-[#848e9c]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden">
          {mobileActiveTab === 'chart' && (
            <div className="h-full">
              <LiveChart symbol={`${pairData.name}USD`} />
            </div>
          )}

          {mobileActiveTab === 'orderbook' && (
            <div className="h-full">
              <BinanceOrderBook selectedPair={`${pairData.name}-USD`} />
            </div>
          )}

          {mobileActiveTab === 'trades' && (
            <div className="h-full">
              <MarketTrades selectedPair={`${pairData.name}-USD`} />
            </div>
          )}

          {mobileActiveTab === 'positions' && (
            <div className="h-full overflow-y-auto">
              <PositionsPanel />
            </div>
          )}
        </div>

        {/* Mobile Trading Buttons */}
        <div className="flex-shrink-0 p-4 bg-[#181a20] border-t border-[#2b3139]">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => setShowDepositModal(true)}
              className="py-2 bg-[#f0b90b] hover:bg-[#f0b90b]/90 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="py-2 bg-[#2b3139] hover:bg-[#3b4149] text-white font-semibold text-sm rounded-lg transition-colors border border-[#3b4149]"
            >
              Withdraw
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleMobileTrade('buy')}
              className="py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white font-semibold text-base rounded-lg transition-colors"
            >
              Buy {pairData.name}
            </button>
            <button
              onClick={() => handleMobileTrade('sell')}
              className="py-4 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-semibold text-base rounded-lg transition-colors"
            >
              Sell {pairData.name}
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:block fixed inset-0 bg-[#0b0e11]">
        {/* Desktop Header */}
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
              <Link href="/spot" className="text-[12px] text-[#f0b90b] font-medium">
                Spot
              </Link>
            </nav>
          </div>

          {/* Center: Pair Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-white">{pairData.name}/USD</span>
              <span className="text-[11px] text-[#848e9c]">WorldStreet</span>
            </div>

            <div className="flex items-center gap-4 text-[12px]">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#848e9c]">Price</span>
                <span className={`text-[14px] font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  ${pairData.price.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#848e9c]">24h Change</span>
                <span className={`text-[12px] font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {isPositive ? '+' : ''}{pairData.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#848e9c]">24h Volume</span>
                <span className="text-[12px] font-medium text-white">
                  ${(pairData.volume24h / 1e6).toFixed(2)}M
                </span>
              </div>
            </div>
          </div>

          {/* Right: Account Status + Deposit/Withdraw */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-3 py-1.5 bg-[#f0b90b] hover:bg-[#f0b90b]/90 text-black text-xs font-semibold rounded transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="px-3 py-1.5 bg-[#2b3139] hover:bg-[#3b4149] text-white text-xs font-semibold rounded transition-colors border border-[#3b4149]"
              >
                Withdraw
              </button>
            </div>
            {isLoaded && user ? (
              <HyperliquidBalanceDisplay
                key={balanceRefreshKey}
                userId={user.id}
                className="text-[12px]"
              />
            ) : (
              <div className="flex items-center gap-3 text-[12px]">
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-[#848e9c]">WorldStreet</span>
                  <span className="text-white font-medium">
                    {isLoaded ? 'No Wallet' : 'Loading...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Main Trading Area */}
        <div className="h-[calc(100%-60px-200px)] grid grid-cols-[19.5%_46.5%_14%_20%]">

          {/* Market List */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <BinanceMarketList
              selectedPair={`${selectedPair}-USD`}
              onSelectPair={handlePairSelect}
              includeStats={true}
            />
          </div>

          {/* Chart */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] p-2">
            <div className="h-full">
              <LiveChart symbol={`${pairData.name}USD`} />
            </div>
          </div>

          {/* Order Book */}
          <div className="h-full bg-[#0b0e11] border-r border-[#1f2329] overflow-hidden">
            <BinanceOrderBook selectedPair={`${pairData.name}-USD`} />
          </div>

          {/* Trading Panel */}
          <div className="h-full bg-[#0b0e11] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1f2329]">
            <div className="p-2">
              <BinanceOrderForm
                selectedPair={`${pairData.name}-USD`}
                pairData={pairData}
              />
            </div>
          </div>
        </div>

        {/* Desktop Bottom Panel */}
        <div className="h-[200px] bg-[#0b0e11] border-t border-[#1f2329]">
          <BinanceBottomPanel />
        </div>
      </div>

      {/* Modals */}
      <MobileTradingModal
        isOpen={showMobileTradingModal}
        onClose={() => setShowMobileTradingModal(false)}
        side={mobileOrderSide}
        selectedPair={`${pairData.name}-USD`}
        chain="ethereum"
      />

      <SpotDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDepositComplete={refreshBalances}
      />

      <SpotWithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdrawComplete={refreshBalances}
      />

      <MobileTokenSearchModal
        isOpen={showTokenSearchModal}
        onClose={() => setShowTokenSearchModal(false)}
        onSelectPair={(pair) => {
          const baseAsset = pair.split('-')[0] || pair;
          setSelectedPair(baseAsset);
          setShowTokenSearchModal(false);
        }}
        selectedPair={`${selectedPair}-USD`}
      />
    </>
  );
}