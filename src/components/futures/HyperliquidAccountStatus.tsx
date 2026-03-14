"use client";

import React, { useState } from 'react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { Icon } from '@iconify/react';

export const HyperliquidAccountStatus: React.FC = () => {
  const {
    isInitialized,
    needsInitialization,
    canTrade,
    summary,
    isLoading,
    error,
    refreshSummary,
  } = useHyperliquid();

  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSummary();
    setRefreshing(false);
  };

  const handleInitialize = async () => {
    setInitializing(true);
    await fetch('/api/futures/subaccount/initialize', { method: 'POST' });
    await refreshSummary();
    setInitializing(false);
  };

  if (isLoading && !summary) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <div className="flex items-center gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535]" height={20} />
          <span className="text-sm font-medium text-[#848e9c]">Checking account status...</span>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-[#f6465d]/10 border border-[#f6465d]/20 rounded p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:warning-circle" className="text-[#f6465d] flex-shrink-0 mt-0.5" height={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#f6465d] mb-1">Error Loading Account</h4>
            <p className="text-xs text-[#f6465d]/80">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1.5 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white rounded text-xs font-bold transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:info" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#fcd535] mb-1">Trading Account Not Initialized</h4>
            <p className="text-xs text-[#fcd535]/80 mb-4">
              Your trading wallet needs to be registered. Click below to start the process.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="px-3 py-2 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <Icon icon="svg-spinners:ring-resize" height={14} />
                  Initializing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon icon="ph:rocket-launch" height={14} />
                  Initialize Trading Account
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized && isLoading) {
    return (
      <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded p-4">
        <div className="flex items-start gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#fcd535] mb-1">Connecting to Trading Session</h4>
            <p className="text-xs text-[#fcd535]/80">
              Please wait while we fetch your account details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Account is initialized - show summary
  return (
    <div className="bg-[#0b0e11] h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${canTrade ? 'bg-[#0ecb81] animate-pulse' : 'bg-[#fcd535]'}`} />
          <h3 className="text-[11px] font-medium text-[#848e9c] uppercase">
            Account Status
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 hover:bg-[#2b3139] rounded transition-colors disabled:opacity-50"
          title="Refresh account data"
        >
          <Icon
            icon="ph:arrow-clockwise"
            className={`text-[#848e9c] ${refreshing ? 'animate-spin' : ''}`}
            height={14}
          />
        </button>
      </div>

      {summary && (
        <div className="flex-1 px-4 pb-2 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Collateral
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                ${summary.totalCollateral.toFixed(2)}
              </p>
            </div>

            <div className="bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded p-1.5">
              <p className="text-[9px] font-medium text-[#0ecb81] mb-0.5 uppercase">
                Free
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                ${summary.freeCollateral.toFixed(2)}
              </p>
            </div>

            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                UPnL
              </p>
              <p className={`text-[12px] font-bold tabular-nums ${summary.unrealizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                }`}>
                {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
              </p>
            </div>

            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Lev
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                {summary.leverage.toFixed(2)}x
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className={`rounded p-1.5 ${summary.marginRatio > 0.5
              ? 'bg-[#0ecb81]/10 border border-[#0ecb81]/20'
              : 'bg-[#f6465d]/10 border border-[#f6465d]/20'
              }`}>
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Margin Ratio
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                {(summary.marginRatio * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Positions
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                {summary.openPositions}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
