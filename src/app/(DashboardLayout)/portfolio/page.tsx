'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PortfolioPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reports'>('overview');

  // Force dark background immediately on mount
  useEffect(() => {
    document.body.style.backgroundColor = '#0b0e11';
    document.documentElement.setAttribute('data-page', 'portfolio');
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.removeAttribute('data-page');
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Placeholder for refresh logic
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

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

  // Mock data since we removed Drift
  const mockSummary = {
    totalCollateral: 0,
    freeCollateral: 0,
    unrealizedPnl: 0,
    leverage: 0,
    marginRatio: 0,
    openPositions: 0
  };

  const totalPnL = mockSummary.unrealizedPnl;
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
                ${formatUSD(mockSummary.totalCollateral)}
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
                ${formatUSD(mockSummary.freeCollateral)}
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

            {/* Balance */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#848e9c] uppercase tracking-widest">
                  Balance
                </span>
                <Icon icon="ph:coins" className="text-[#848e9c]" height={16} />
              </div>
              <p className="text-[22px] font-bold text-white">
                {formatNumber(0, 4)}
              </p>
              <p className="text-[11px] text-[#848e9c] mt-1">
                Total balance
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
                  {formatNumber(mockSummary.leverage * 100, 2)}%
                </p>
              </div>

              <div className="px-4 py-3 bg-[#161a1e] border border-[#2b3139] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="ph:shield-check" className="text-[#848e9c]" height={14} />
                  <span className="text-[11px] text-[#848e9c] uppercase tracking-wide">Margin Ratio</span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {formatNumber(mockSummary.marginRatio * 100, 2)}%
                </p>
              </div>

              <div className="px-4 py-3 bg-[#161a1e] border border-[#2b3139] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon="ph:chart-line" className="text-[#848e9c]" height={14} />
                  <span className="text-[11px] text-[#848e9c] uppercase tracking-wide">Open Positions</span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {mockSummary.openPositions}
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="px-6 py-12 text-center">
            <Icon icon="ph:chart-line" className="mx-auto mb-4 text-[#2b3139]" height={64} />
            <h3 className="text-lg font-semibold text-white mb-2">Portfolio Overview</h3>
            <p className="text-[#848e9c] mb-6 max-w-md mx-auto">
              Your portfolio is currently empty. Start trading to see your positions, balances, and performance metrics here.
            </p>
            <div className="flex gap-3 justify-center">
              <Link 
                href="/spot" 
                className="px-6 py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-sm font-semibold transition-colors"
              >
                Start Spot Trading
              </Link>
              <Link 
                href="/futures" 
                className="px-6 py-2.5 bg-transparent border border-[#2b3139] hover:bg-[#2b3139] text-white rounded text-sm font-semibold transition-colors"
              >
                Try Futures
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}