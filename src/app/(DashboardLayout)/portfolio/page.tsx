'use client';

import React, { useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';

export default function PortfolioPage() {
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
  } = useDrift();

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshPositions()]);
  }, [refreshSummary, refreshPositions]);

  // Format number with decimals
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format USD value
  const formatUSD = (num: number) => {
    return `$${formatNumber(num, 2)}`;
  };

  // Loading state
  if (!isClientReady || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-darkgray">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-primary" height={48} />
          <p className="text-dark dark:text-white text-sm">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // Uninitialized state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-darkgray p-6">
        <div className="max-w-4xl mx-auto">
          <DriftAccountStatus />
        </div>
      </div>
    );
  }

  const totalPnL = summary?.unrealizedPnl || 0;
  const isPnLPositive = totalPnL >= 0;

  return (
    <div className="min-h-screen bg-white dark:bg-darkgray p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">Portfolio Overview</h1>
            <p className="text-sm text-muted dark:text-darklink mt-1">
              Complete view of your trading activity
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50"
          >
            <Icon icon="ph:arrow-clockwise" className={isLoading ? 'animate-spin' : ''} height={18} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Collateral */}
          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted dark:text-darklink uppercase tracking-wide">
                Total Collateral
              </span>
              <Icon icon="ph:wallet-duotone" className="text-primary" height={20} />
            </div>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {formatUSD(summary?.totalCollateral || 0)}
            </p>
            <p className="text-xs text-muted dark:text-darklink mt-1">
              USDC deposited
            </p>
          </div>

          {/* Free Collateral */}
          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted dark:text-darklink uppercase tracking-wide">
                Free Collateral
              </span>
              <Icon icon="ph:coins-duotone" className="text-success" height={20} />
            </div>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {formatUSD(summary?.freeCollateral || 0)}
            </p>
            <p className="text-xs text-muted dark:text-darklink mt-1">
              Available for trading
            </p>
          </div>

          {/* Unrealized PnL */}
          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted dark:text-darklink uppercase tracking-wide">
                Unrealized PnL
              </span>
              <Icon
                icon={isPnLPositive ? 'ph:trend-up-duotone' : 'ph:trend-down-duotone'}
                className={isPnLPositive ? 'text-success' : 'text-error'}
                height={20}
              />
            </div>
            <p className={`text-2xl font-bold ${isPnLPositive ? 'text-success' : 'text-error'}`}>
              {isPnLPositive ? '+' : ''}{formatUSD(totalPnL)}
            </p>
            <p className="text-xs text-muted dark:text-darklink mt-1">
              From open positions
            </p>
          </div>

          {/* SOL Balance */}
          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted dark:text-darklink uppercase tracking-wide">
                SOL Balance
              </span>
              <Icon icon="ph:currency-circle-dollar-duotone" className="text-warning" height={20} />
            </div>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {formatNumber(walletBalance, 4)} SOL
            </p>
            <p className="text-xs text-muted dark:text-darklink mt-1">
              Native wallet balance
            </p>
          </div>
        </div>

        {/* Account Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="ph:percent-duotone" className="text-primary" height={18} />
              <span className="text-sm text-muted dark:text-darklink">Leverage</span>
            </div>
            <p className="text-xl font-bold text-dark dark:text-white">
              {formatNumber((summary?.leverage || 0) * 100, 2)}%
            </p>
          </div>

          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="ph:shield-check-duotone" className="text-success" height={18} />
              <span className="text-sm text-muted dark:text-darklink">Margin Ratio</span>
            </div>
            <p className="text-xl font-bold text-dark dark:text-white">
              {formatNumber((summary?.marginRatio || 0) * 100, 2)}%
            </p>
          </div>

          <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="ph:chart-line-duotone" className="text-warning" height={18} />
              <span className="text-sm text-muted dark:text-darklink">Open Positions</span>
            </div>
            <p className="text-xl font-bold text-dark dark:text-white">
              {summary?.openPositions || 0}
            </p>
          </div>
        </div>

        {/* Futures Positions */}
        <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border dark:border-darkborder">
            <div className="flex items-center gap-2">
              <Icon icon="ph:trend-up-duotone" className="text-primary" height={20} />
              <h2 className="text-lg font-semibold text-dark dark:text-white">Futures Positions</h2>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="p-12 text-center">
              <Icon icon="ph:chart-line-duotone" className="mx-auto mb-4 text-muted dark:text-darklink" height={48} />
              <p className="text-muted dark:text-darklink text-sm">No open futures positions</p>
              <p className="text-muted dark:text-darklink text-xs mt-1">
                Open a position to start trading
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/20 dark:bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Market
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Side
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Entry Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Unrealized PnL
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                      Leverage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-darkborder">
                  {positions.map((position, index) => {
                    const currentPrice = getMarketPrice(position.marketIndex, 'perp');
                    const pnlPositive = position.unrealizedPnl >= 0;
                    
                    return (
                      <tr key={index} className="hover:bg-muted/10 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-dark dark:text-white">
                            {position.marketName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              position.direction === 'long'
                                ? 'bg-success/10 text-success'
                                : 'bg-error/10 text-error'
                            }`}
                          >
                            {position.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                          {formatNumber(position.baseAmount, 4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                          {formatUSD(position.entryPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                          {formatUSD(currentPrice)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          pnlPositive ? 'text-success' : 'text-error'
                        }`}>
                          {pnlPositive ? '+' : ''}{formatUSD(position.unrealizedPnl)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
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
        <div className="bg-white dark:bg-dark border border-border dark:border-darkborder rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border dark:border-darkborder">
            <div className="flex items-center gap-2">
              <Icon icon="ph:coins-duotone" className="text-primary" height={20} />
              <h2 className="text-lg font-semibold text-dark dark:text-white">Spot Balances</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/20 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted dark:text-darklink uppercase tracking-wider">
                    USD Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-darkborder">
                {/* USDC from freeCollateral */}
                <tr className="hover:bg-muted/10 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-dark dark:text-white">USDC</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      Collateral
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                    {formatNumber(summary?.freeCollateral || 0, 2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                    {formatUSD(1.00)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                    {formatUSD(summary?.freeCollateral || 0)}
                  </td>
                </tr>

                {/* Other spot positions (filter out USDC index 0 and zero balances) */}
                {spotPositions
                  .filter(pos => pos.marketIndex !== 0 && pos.amount > 0)
                  .map((position, index) => (
                    <tr key={index} className="hover:bg-muted/10 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-dark dark:text-white">
                          {position.marketName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            position.balanceType === 'deposit'
                              ? 'bg-success/10 text-success'
                              : 'bg-error/10 text-error'
                          }`}
                        >
                          {position.balanceType === 'deposit' ? 'Deposit' : 'Borrow'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                        {formatNumber(position.amount, 4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                        {formatUSD(position.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-dark dark:text-white">
                        {formatUSD(position.value)}
                      </td>
                    </tr>
                  ))}

                {/* Empty state if no other spot balances */}
                {spotPositions.filter(pos => pos.marketIndex !== 0 && pos.amount > 0).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <p className="text-muted dark:text-darklink text-sm">No other spot balances</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
