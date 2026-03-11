'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDrift } from '@/app/context/driftContext';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { PaginatedSpotPositions } from '@/components/spot/PaginatedSpotPositions';
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';
import { CollateralManagementPanel } from '@/components/futures/CollateralManagementPanel';

export default function PortfolioPage() {
  const router = useRouter();
  const {
    summary,
    positions,
    spotPositions,
    walletBalance,
    isClientReady,
    isInitialized,
    isLoading,
    refreshSummary,
    refreshPositions,
    getMarketPrice,
    openOrders,
    getOpenOrders,
  } = useDrift();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reports'>('overview');
  const [ordersTab, setOrdersTab] = useState<'open' | 'history' | 'trades'>('open');
  const [showInitModal, setShowInitModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Force dark background immediately on mount
  useEffect(() => {
    document.body.style.backgroundColor = '#0b0e11';
    document.documentElement.setAttribute('data-page', 'portfolio');
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.removeAttribute('data-page');
    };
  }, []);

  // Check for uninitialized account after loading settles
  useEffect(() => {
    if (isClientReady && !isInitialized && !isLoading) {
      // Wait 2 seconds to be certain before showing modal
      const timer = setTimeout(() => {
        if (isClientReady && !isInitialized) {
          setShowInitModal(true);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isClientReady, isInitialized, isLoading]);

  // Auto-redirect countdown
  useEffect(() => {
    if (showInitModal && !isRedirecting) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showInitModal, isRedirecting]);

  // Countdown timer
  useEffect(() => {
    if (isRedirecting && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isRedirecting && redirectCountdown === 0) {
      router.push('/spot');
    }
  }, [isRedirecting, redirectCountdown, router]);

  // Fetch orders on mount and when initialized
  useEffect(() => {
    if (isInitialized && isClientReady) {
      getOpenOrders();
    }
  }, [isInitialized, isClientReady, getOpenOrders]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshSummary(), refreshPositions(), getOpenOrders()]);
    setIsRefreshing(false);
  }, [refreshSummary, refreshPositions, getOpenOrders]);

  // Format number with decimals
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format USD value
  const formatUSD = (num: number) => {
    return `${formatNumber(num, 2)}`;
  };

  // Skeleton loading state
  if (!isClientReady || isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#0b0e11] overflow-hidden">
        {/* Header skeleton */}
        <div className="h-12 bg-[#0b0e11] border-b border-[#2b3139] shrink-0" />
        <div className="h-12 bg-[#0b0e11] border-b border-[#2b3139] shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cards skeleton */}
          <div className="grid grid-cols-4 gap-0 border border-[#2b3139]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-6 border-r border-[#2b3139] last:border-r-0">
                <div className="h-3 w-24 bg-[#1e2329] rounded mb-3 animate-pulse" />
                <div className="h-6 w-32 bg-[#2b3139] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Initialization Modal
  if (showInitModal) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1e2329] border border-[#2b3139] rounded-lg max-w-md w-full p-6">
          {/* Warning Icon */}
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="ph:warning" className="text-[#fcd535]" width={32} />
            <h2 className="text-lg font-semibold text-white">Account Not Initialized</h2>
          </div>

          {/* Message */}
          <p className="text-[13px] text-[#848e9c] mb-4 leading-relaxed">
            Your wallet hasn't been initialized on-chain yet. To start trading on WorldStreet, 
            you'll need to complete a one-time on-chain initialization.
          </p>

          {/* Cost Info */}
          <div className="bg-[#0b0e11] border border-[#2b3139] rounded p-3 mb-4">
            <p className="text-[11px] text-[#848e9c] mb-1">Estimated cost:</p>
            <p className="text-sm font-bold text-[#fcd535]">~0.035 SOL</p>
            <p className="text-[10px] text-[#848e9c] mt-1">(covers rent + transaction fees)</p>
          </div>

          {/* Redirect Message */}
          {isRedirecting && (
            <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded p-3 mb-4">
              <p className="text-[11px] text-[#fcd535] mb-1">
                Redirecting to Spot page in {redirectCountdown}s...
              </p>
              <p className="text-[10px] text-[#848e9c]">
                Initialization may take a couple of minutes to complete.
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-[#2b3139] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#fcd535] transition-all duration-1000"
                  style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/spot')}
              className="flex-1 px-4 py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-[13px] font-semibold transition-colors"
            >
              Go to Spot Page Now
            </button>
            <button
              onClick={() => setShowInitModal(false)}
              className="px-4 py-2.5 bg-transparent border border-[#2b3139] hover:bg-[#2b3139] text-[#848e9c] hover:text-white rounded text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPnL = summary?.unrealizedPnl || 0;
  const isPnLPositive = totalPnL >= 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0b0e11] overflow-hidden">
      {/* Top Header Bar - Desktop Only */}
      <div className="hidden md:flex h-12 items-center justify-between px-4 border-b border-[#2b3139] bg-[#0b0e11] shrink-0">
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
          </nav>
        </div>

        {/* Right: Account */}
        <div className="flex items-center gap-3">
          <Link href="/" className="px-3.5 py-1.5 bg-transparent hover:bg-[#2b3139] text-white rounded text-[13px] font-semibold transition-colors">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2b3139] bg-[#0b0e11]">
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
        </div>
      </div>

      {/* Page Title Bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#2b3139] bg-[#0b0e11] shrink-0">
        {/* Left: Tabs */}
        <div className="flex items-center gap-6">
          {(['overview', 'history', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[13px] font-medium transition-colors pb-3 border-b-2 ${
                activeTab === tab
                  ? 'text-white border-[#fcd535]'
                  : 'text-[#848e9c] hover:text-white border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-[#2b3139] hover:bg-[#2b3139] transition-colors"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-[#848e9c] ${isRefreshing ? 'animate-spin' : ''}`} 
            width={14} 
          />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-0">

          {/* Summary Cards Row - No gaps, border dividers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-[#2b3139]">
            {/* Total Collateral */}
            <div className="px-6 py-4 border-r border-[#2b3139]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#848e9c] uppercase tracking-widest">
                  Total Collateral
                </span>
                <Icon icon="ph:wallet" className="text-[#848e9c]" height={16} />
              </div>
              <p className="text-[22px] font-bold text-white">
                ${formatUSD(summary?.totalCollateral || 0)}
              </p>
              <p className="text-[11px] text-[#848e9c] mt-1">
                USDC deposited
              </p>
            </div>

            {/* Free Collateral */}
            <div className="px-6 py-4 border-r border-[#2b3139]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#848e9c] uppercase tracking-widest">
                  Free Collateral
                </span>
                <Icon icon="ph:coins" className="text-[#848e9c]" height={16} />
              </div>
              <p className="text-[22px] font-bold text-white">
                ${formatUSD(summary?.freeCollateral || 0)}
              </p>
              <p className="text-[11px] text-[#848e9c] mt-1">
                Available for trading
              </p>
            </div>

            {/* Unrealized PnL */}
            <div className="px-6 py-4 border-r border-[#2b3139]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#848e9c] uppercase tracking-widest">
                  Unrealized PnL
                </span>
                <Icon
                  icon={isPnLPositive ? 'ph:trend-up' : 'ph:trend-down'}
                  className={isPnLPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}
                  height={16}
                />
              </div>
              <p className={`text-[22px] font-bold ${isPnLPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {isPnLPositive ? '+' : ''}${formatUSD(totalPnL)}
              </p>
              <p className="text-[11px] text-[#848e9c] mt-1">
                From open positions
              </p>
            </div>

            {/* SOL Balance */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#848e9c] uppercase tracking-widest">
                  SOL Balance
                </span>
                <Icon icon="cryptocurrency:sol" className="text-[#848e9c]" height={16} />
              </div>
              <p className="text-[22px] font-bold text-white">
                {formatNumber(walletBalance, 4)}
              </p>
              <p className="text-[11px] text-[#848e9c] mt-1">
                Native wallet balance
              </p>
            </div>
          </div>

          {/* Account Metrics Pills */}
          <div className="px-6 py-4 bg-[#0b0e11]">
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-3 bg-[#161a1e] border border-[#2b3139] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="ph:percent" className="text-[#848e9c]" height={14} />
                  <span className="text-[11px] text-[#848e9c] uppercase tracking-wide">Leverage</span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {formatNumber((summary?.leverage || 0) * 100, 2)}%
                </p>
              </div>

              <div className="px-4 py-3 bg-[#161a1e] border border-[#2b3139] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="ph:shield-check" className="text-[#848e9c]" height={14} />
                  <span className="text-[11px] text-[#848e9c] uppercase tracking-wide">Margin Ratio</span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {formatNumber((summary?.marginRatio || 0) * 100, 2)}%
                </p>
              </div>

              <div className="px-4 py-3 bg-[#161a1e] border border-[#2b3139] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="ph:chart-line" className="text-[#848e9c]" height={14} />
                  <span className="text-[11px] text-[#848e9c] uppercase tracking-wide">Open Positions</span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {summary?.openPositions || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Collateral Management */}
          <div className="px-6 py-4 bg-[#0b0e11]">
            <CollateralManagementPanel />
          </div>

          {/* All Orders (Tabbed) */}
          <div className="bg-[#0b0e11] border border-[#2b3139]">
            {/* Section Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0b0e11] border-b border-[#2b3139]">
              <div className="flex items-center gap-2">
                <Icon icon="ph:list-checks" className="text-[#fcd535]" height={18} />
                <h2 className="text-[13px] font-semibold text-white">Orders</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535]">
                  {openOrders.length}
                </span>
              </div>
              
              {/* Tab Row */}
              <div className="flex items-center gap-4">
                {(['open', 'history', 'trades'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOrdersTab(tab)}
                    className={`text-[11px] font-medium transition-colors pb-1 border-b-2 ${
                      ordersTab === tab
                        ? 'text-white border-[#fcd535]'
                        : 'text-[#848e9c] hover:text-white border-transparent'
                    }`}
                  >
                    {tab === 'open' ? `Open Orders (${openOrders.length})` : 
                     tab === 'history' ? 'Order History' : 'Trade History'}
                  </button>
                ))}
                
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await getOpenOrders();
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                  className="w-6 h-6 flex items-center justify-center rounded-full border border-[#2b3139] hover:bg-[#2b3139] transition-colors"
                >
                  <Icon 
                    icon="ph:arrow-clockwise" 
                    className={`text-[#848e9c] ${isRefreshing ? 'animate-spin' : ''}`} 
                    width={12} 
                  />
                </button>
              </div>
            </div>

            {ordersTab === 'open' && openOrders.length === 0 ? (
              <div className="py-8 text-center">
                <Icon icon="ph:inbox" className="mx-auto mb-2 text-[#2b3139]" height={40} />
                <p className="text-[13px] text-[#848e9c]">No open orders</p>
                <p className="text-[11px] text-[#4a5568] mt-1">
                  Place an order to start trading
                </p>
              </div>
            ) : ordersTab === 'open' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1d23]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.map((order, index) => {
                      const isSpot = order.marketType === 'spot';
                      const isBuy = order.direction === 'buy' || order.direction === 'long';
                      const baseAmount = parseFloat(order.baseAssetAmount) / 1e9;
                      const price = parseFloat(order.price) / 1e6;
                      
                      return (
                        <tr 
                          key={`${order.orderIndex}-${index}`} 
                          className="hover:bg-[#161a1e] transition-colors duration-100 border-b border-[#1e2329]"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-white">
                                {order.marketName || `Market ${order.marketIndex}`}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isSpot 
                                  ? 'bg-[#0ecb81]/10 text-[#0ecb81]' 
                                  : 'bg-[#fcd535]/10 text-[#fcd535]'
                              }`}>
                                {isSpot ? 'SPOT' : 'PERP'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-[13px] text-white capitalize">
                            {order.orderType}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`text-[13px] ${
                              isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                            }`}>
                              {order.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            {formatNumber(baseAmount, 4)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            {order.orderType === 'market' ? 'Market' : `$${formatNumber(price, 2)}`}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`text-[13px] ${
                              order.status === 'open' 
                                ? 'text-[#fcd535]'
                                : order.status === 'filled'
                                ? 'text-[#0ecb81]'
                                : 'text-[#848e9c]'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Icon icon="ph:clock-countdown" className="mx-auto mb-2 text-[#2b3139]" height={40} />
                <p className="text-[13px] text-[#848e9c]">Coming soon</p>
              </div>
            )}
          </div>

          {/* Futures Positions */}
          <div className="bg-[#0b0e11] border border-[#2b3139]">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0b0e11] border-b border-[#2b3139]">
              <div className="flex items-center gap-2">
                <Icon icon="ph:trend-up" className="text-[#fcd535]" height={18} />
                <h2 className="text-[13px] font-semibold text-white">Futures Positions</h2>
              </div>
            </div>

            {positions.length === 0 ? (
              <div className="py-8 text-center">
                <Icon icon="ph:inbox" className="mx-auto mb-2 text-[#2b3139]" height={40} />
                <p className="text-[13px] text-[#848e9c]">No open futures positions</p>
                <p className="text-[11px] text-[#4a5568] mt-1">
                  Open a position to start trading
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1d23]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Unrealized PnL
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#848e9c] uppercase tracking-wider">
                        Leverage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position, index) => {
                      const currentPrice = getMarketPrice(position.marketIndex, 'perp');
                      const pnlPositive = position.unrealizedPnl >= 0;
                      
                      return (
                        <tr key={index} className="hover:bg-[#161a1e] transition-colors duration-100 border-b border-[#1e2329]">
                          <td className="px-4 py-2.5 whitespace-nowrap text-[13px] text-white">
                            {position.marketName}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`text-[13px] ${
                              position.direction === 'long' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                            }`}>
                              {position.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            {formatNumber(position.baseAmount, 4)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            ${formatUSD(position.entryPrice)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            ${formatUSD(currentPrice)}
                          </td>
                          <td className={`px-4 py-2.5 whitespace-nowrap text-right text-[13px] ${
                            pnlPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                          }`}>
                            {pnlPositive ? '+' : ''}${formatUSD(position.unrealizedPnl)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-[13px] text-white">
                            {formatNumber(position.leverage, 2)}x
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Spot Balances */}
          <div className="bg-[#0b0e11] border border-[#2b3139]">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0b0e11] border-b border-[#2b3139]">
              <div className="flex items-center gap-2">
                <Icon icon="ph:coins" className="text-[#fcd535]" height={18} />
                <h2 className="text-[13px] font-semibold text-white">Spot Positions</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535]">
                  {spotPositions.length + 1}
                </span>
              </div>
            </div>

            <PaginatedSpotPositions 
              itemsPerPage={10}
              showUSDC={true}
              compact={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
