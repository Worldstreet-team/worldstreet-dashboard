'use client';

import React, { useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useDrift } from '@/app/context/driftContext';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { PaginatedSpotPositions } from '@/components/spot/PaginatedSpotPositions';
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';
import { CollateralManagementPanel } from '@/components/futures/CollateralManagementPanel';
import { useUser } from '@clerk/nextjs';

export default function PortfolioPage() {
  const { user } = useUser();
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

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Force dark background immediately on mount
  useEffect(() => {
    document.body.style.backgroundColor = '#181a20';
    document.documentElement.setAttribute('data-page', 'portfolio');
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.removeAttribute('data-page');
    };
  }, []);

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

  // Handle collateral deposit
  const handleDeposit = useCallback(async (amount: number) => {
    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Deposit failed',
        };
      }

      // Refresh summary after successful deposit
      await refreshSummary();

      return {
        success: true,
        feeAmount: result.data?.feeAmount,
        collateralAmount: result.data?.collateralAmount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [refreshSummary]);

  // Handle collateral withdrawal
  const handleWithdraw = useCallback(async (amount: number) => {
    try {
      const response = await fetch('/api/futures/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chain: 'solana',
          amount 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Withdrawal failed',
        };
      }

      // Refresh summary after successful withdrawal
      await refreshSummary();

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [refreshSummary]);

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

  // Loading state
  if (!isClientReady || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181a20]">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-[#fcd535]" height={48} />
          <p className="text-white text-sm">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // Uninitialized state
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#181a20] overflow-hidden">
        {/* Top Header Bar */}
        <div className="hidden md:flex h-12 items-center justify-between px-4 border-b border-[#2b3139] bg-[#181a20] shrink-0">
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
          <div className="flex items-center gap-3">
            <Link href="/" className="px-3.5 py-1.5 bg-transparent hover:bg-[#2b3139] text-white rounded text-[13px] font-semibold transition-colors">
              Dashboard
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
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl mx-auto">
            <DriftAccountStatus />
          </div>
        </div>
      </div>
    );
  }

  const totalPnL = summary?.unrealizedPnl || 0;
  const isPnLPositive = totalPnL >= 0;

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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
              <p className="text-sm text-[#848e9c] mt-1">
                Complete view of your trading activity
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] transition-colors disabled:opacity-50"
            >
              <Icon icon="ph:arrow-clockwise" className={isLoading ? 'animate-spin' : ''} height={18} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>

          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Collateral */}
            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Total Collateral
                </span>
                <Icon icon="ph:wallet-duotone" className="text-[#fcd535]" height={20} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatUSD(summary?.totalCollateral || 0)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                USDC deposited
              </p>
            </div>

            {/* Free Collateral */}
            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Free Collateral
                </span>
                <Icon icon="ph:coins-duotone" className="text-[#0ecb81]" height={20} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatUSD(summary?.freeCollateral || 0)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                Available for trading
              </p>
            </div>

            {/* Unrealized PnL */}
            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Unrealized PnL
                </span>
                <Icon
                  icon={isPnLPositive ? 'ph:trend-up-duotone' : 'ph:trend-down-duotone'}
                  className={isPnLPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}
                  height={20}
                />
              </div>
              <p className={`text-2xl font-bold ${isPnLPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {isPnLPositive ? '+' : ''}{formatUSD(totalPnL)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                From open positions
              </p>
            </div>

            {/* SOL Balance */}
            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  SOL Balance
                </span>
                <Icon icon="ph:currency-circle-dollar-duotone" className="text-[#fcd535]" height={20} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(walletBalance, 4)} SOL
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                Native wallet balance
              </p>
            </div>
          </div>

          {/* Collateral Management */}
          <CollateralManagementPanel
            totalCollateral={summary?.totalCollateral || 0}
            freeCollateral={summary?.freeCollateral || 0}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            feePercentage={5}
          />

          {/* Account Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="ph:percent-duotone" className="text-[#fcd535]" height={18} />
                <span className="text-sm text-[#848e9c]">Leverage</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatNumber((summary?.leverage || 0) * 100, 2)}%
              </p>
            </div>

            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="ph:shield-check-duotone" className="text-[#0ecb81]" height={18} />
                <span className="text-sm text-[#848e9c]">Margin Ratio</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatNumber((summary?.marginRatio || 0) * 100, 2)}%
              </p>
            </div>

            <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="ph:chart-line-duotone" className="text-[#fcd535]" height={18} />
                <span className="text-sm text-[#848e9c]">Open Positions</span>
              </div>
              <p className="text-xl font-bold text-white">
                {summary?.openPositions || 0}
              </p>
            </div>
          </div>

          {/* Open Orders Monitor - Only show if there are open orders */}
          {openOrders.length > 0 && (
            <OrderStatusMonitor 
              autoRefresh={true}
              refreshInterval={5000}
            />
          )}

          {/* All Orders (Spot & Futures) */}
          <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e2329]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="ph:list-checks-duotone" className="text-[#fcd535]" height={20} />
                  <h2 className="text-lg font-semibold text-white">Orders</h2>
                  <span className="text-xs text-[#848e9c]">
                    ({openOrders.length} open)
                  </span>
                </div>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await getOpenOrders();
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                  className="text-xs text-[#fcd535] hover:text-[#fcd535]/80 transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
                </button>
              </div>
            </div>

            {openOrders.length === 0 ? (
              <div className="p-12 text-center">
                <Icon icon="ph:list-checks-duotone" className="mx-auto mb-4 text-[#848e9c]" height={48} />
                <p className="text-[#848e9c] text-sm">No open orders</p>
                <p className="text-[#848e9c] text-xs mt-1">
                  Place an order to start trading
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1e2329]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2329]">
                    {openOrders.map((order, index) => {
                      const isSpot = order.marketType === 'spot';
                      const isBuy = order.direction === 'buy' || order.direction === 'long';
                      
                      // Parse amounts
                      const baseAmount = parseFloat(order.baseAssetAmount) / 1e9;
                      const price = parseFloat(order.price) / 1e6;
                      
                      return (
                        <tr key={`${order.orderIndex}-${index}`} className="hover:bg-[#1e2329] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {order.marketName || `Market ${order.marketIndex}`}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isSpot 
                                  ? 'bg-[#0ecb81]/10 text-[#0ecb81]' 
                                  : 'bg-[#fcd535]/10 text-[#fcd535]'
                              }`}>
                                {isSpot ? 'SPOT' : 'PERP'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-white capitalize">
                              {order.orderType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isBuy
                                  ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                                  : 'bg-[#f6465d]/10 text-[#f6465d]'
                              }`}
                            >
                              {order.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                            {formatNumber(baseAmount, 4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                            {order.orderType === 'market' ? 'Market' : `$${formatNumber(price, 2)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'open' 
                                ? 'bg-[#fcd535]/10 text-[#fcd535]'
                                : order.status === 'filled'
                                ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                                : 'bg-[#848e9c]/10 text-[#848e9c]'
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
            )}
          </div>

          {/* Futures Positions */}
          <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e2329]">
              <div className="flex items-center gap-2">
                <Icon icon="ph:trend-up-duotone" className="text-[#fcd535]" height={20} />
                <h2 className="text-lg font-semibold text-white">Futures Positions</h2>
              </div>
            </div>

            {positions.length === 0 ? (
              <div className="p-12 text-center">
                <Icon icon="ph:chart-line-duotone" className="mx-auto mb-4 text-[#848e9c]" height={48} />
                <p className="text-[#848e9c] text-sm">No open futures positions</p>
                <p className="text-[#848e9c] text-xs mt-1">
                  Open a position to start trading
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1e2329]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Unrealized PnL
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                        Leverage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2329]">
                    {positions.map((position, index) => {
                      const currentPrice = getMarketPrice(position.marketIndex, 'perp');
                      const pnlPositive = position.unrealizedPnl >= 0;
                      
                      return (
                        <tr key={index} className="hover:bg-[#1e2329] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-white">
                              {position.marketName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                position.direction === 'long'
                                  ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                                  : 'bg-[#f6465d]/10 text-[#f6465d]'
                              }`}
                            >
                              {position.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                            {formatNumber(position.baseAmount, 4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                            {formatUSD(position.entryPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                            {formatUSD(currentPrice)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                            pnlPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                          }`}>
                            {pnlPositive ? '+' : ''}{formatUSD(position.unrealizedPnl)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
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
          <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e2329]">
              <div className="flex items-center gap-2">
                <Icon icon="ph:coins-duotone" className="text-[#fcd535]" height={20} />
                <h2 className="text-lg font-semibold text-white">Spot Positions</h2>
                <span className="text-xs text-[#848e9c]">
                  ({spotPositions.length + 1} total)
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
