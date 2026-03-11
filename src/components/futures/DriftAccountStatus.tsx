"use client";

import React, { useState } from 'react';
import { useDrift } from '@/app/context/driftContext';
import { Icon } from '@iconify/react';

export const DriftAccountStatus: React.FC = () => {
  const { 
    isInitialized, 
    needsInitialization, 
    canTrade, 
    summary,
    isLoading,
    error,
    refreshSummary,
    resetInitializationFailure,
  } = useDrift();

  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    resetInitializationFailure();
    await refreshSummary();
    setRefreshing(false);
  };

  const handleInitialize = async () => {
    setInitializing(true);
    resetInitializationFailure();
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

  if (error) {
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
            <h4 className="text-sm font-bold text-[#fcd535] mb-1">Drift Account Not Initialized</h4>
            <p className="text-xs text-[#fcd535]/80 mb-4">
              Your Drift account needs to be initialized. Click below to start the process.
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
                  Initialize Drift Account
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded p-4">
        <div className="flex items-start gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#fcd535] mb-1">Initializing Drift Account</h4>
            <p className="text-xs text-[#fcd535]/80">
              Please wait while we set up your account. This may take a few moments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:clock" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={20} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#fcd535] mb-1">Account Initializing</h4>
            <p className="text-xs text-[#fcd535]/80">
              Your Drift account is being set up. This may take a few moments...
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
        <div className="flex-1 px-4 pb-2 overflow-hidden">
          {/* Horizontal Stats Grid - Compact */}
          <div className="grid grid-cols-4 gap-2">
            {/* Total Collateral */}
            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Total Collateral
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                ${summary.totalCollateral.toFixed(2)}
              </p>
            </div>
            
            {/* Free Collateral */}
            <div className="bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded p-1.5">
              <p className="text-[9px] font-medium text-[#0ecb81] mb-0.5 uppercase">
                Free Collateral
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                ${summary.freeCollateral.toFixed(2)}
              </p>
            </div>

            {/* Unrealized PnL */}
            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Unrealized PnL
              </p>
              <p className={`text-[12px] font-bold tabular-nums ${
                summary.unrealizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
              }`}>
                {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
              </p>
            </div>
            
            {/* Leverage */}
            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Leverage
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                {summary.leverage.toFixed(2)}x
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Margin Ratio */}
            <div className={`rounded p-1.5 ${
              summary.marginRatio > 0.5 
                ? 'bg-[#0ecb81]/10 border border-[#0ecb81]/20' 
                : summary.marginRatio > 0.2 
                ? 'bg-[#fcd535]/10 border border-[#fcd535]/20'
                : 'bg-[#f6465d]/10 border border-[#f6465d]/20'
            }`}>
              <p className={`text-[9px] font-medium mb-0.5 uppercase ${
                summary.marginRatio > 0.5 
                  ? 'text-[#0ecb81]' 
                  : summary.marginRatio > 0.2 
                  ? 'text-[#fcd535]'
                  : 'text-[#f6465d]'
              }`}>
                Margin Ratio
              </p>
              <p className={`text-[12px] font-bold tabular-nums ${
                summary.marginRatio > 0.5 ? 'text-[#0ecb81]' : 
                summary.marginRatio > 0.2 ? 'text-[#fcd535]' : 'text-[#f6465d]'
              }`}>
                {(summary.marginRatio * 100).toFixed(1)}%
              </p>
            </div>
            
            {/* Open Positions */}
            <div className="bg-[#1f2329] rounded p-1.5">
              <p className="text-[9px] font-medium text-[#848e9c] mb-0.5 uppercase">
                Open Positions
              </p>
              <p className="text-[12px] font-bold text-white tabular-nums">
                {summary.openPositions}
              </p>
            </div>
          </div>

          {/* Trading Disabled Warning */}
          {!canTrade && (
            <div className="mt-2 p-2 bg-[#fcd535]/10 border border-[#fcd535]/20 rounded flex items-start gap-1.5">
              <Icon icon="ph:warning" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={14} />
              <div>
                <p className="text-[10px] font-bold text-[#fcd535]">Trading Disabled</p>
                <p className="text-[9px] text-[#fcd535]/80 mt-0.5">
                  Please add collateral or close positions to continue trading.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
