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
    resetInitializationFailure(); // Reset the failure flag when manually refreshing
    await refreshSummary();
    setRefreshing(false);
  };

  const handleInitialize = async () => {
    setInitializing(true);
    resetInitializationFailure(); // Reset the failure flag before retrying
    await refreshSummary();
    setInitializing(false);
  };

  if (isLoading && !summary) {
    return (
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 p-6">
        <div className="flex items-center gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-primary" height={24} />
          <span className="text-sm font-medium text-muted dark:text-gray-400">Checking account status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-error/5 to-error/10 dark:from-error/10 dark:to-error/5 border border-error/20 dark:border-error/30 rounded-2xl shadow-lg shadow-error/10 p-6">
        <div className="flex items-start gap-3">
          <Icon icon="ph:warning-circle-duotone" className="text-error flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-error mb-1">Error Loading Account</h4>
            <p className="text-xs text-error/80">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-xl text-xs font-bold transition-all duration-200"
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
      <div className="bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/5 border border-warning/20 dark:border-warning/30 rounded-2xl shadow-lg shadow-warning/10 p-6">
        <div className="flex items-start gap-3">
          <Icon icon="ph:info-duotone" className="text-warning flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-warning mb-1">Drift Account Not Initialized</h4>
            <p className="text-xs text-warning/80 mb-4">
              Your Drift account needs to be initialized. Click below to start the process.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="px-4 py-2.5 bg-warning hover:bg-warning/90 text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-warning/20 hover:shadow-xl hover:shadow-warning/30"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <Icon icon="svg-spinners:ring-resize" height={16} />
                  Initializing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon icon="ph:rocket-launch" height={16} />
                  Initialize Drift Account
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state during initialization
  if (initializing) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg shadow-primary/10 p-6">
        <div className="flex items-start gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-primary flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-primary mb-1">Initializing Drift Account</h4>
            <p className="text-xs text-primary/80">
              Please wait while we set up your account. This may take a few moments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg shadow-primary/10 p-6">
        <div className="flex items-start gap-3">
          <Icon icon="ph:clock-duotone" className="text-primary flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-primary mb-1">Account Initializing</h4>
            <p className="text-xs text-primary/80">
              Your Drift account is being set up. This may take a few moments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Account is initialized - show summary
  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${canTrade ? 'bg-success animate-pulse' : 'bg-warning'}`} />
          <h3 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">
            Account Status
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-200 disabled:opacity-50"
          title="Refresh account data"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
            height={18} 
          />
        </button>
      </div>

      {summary && (
        <div className="p-6">
          {/* Horizontal Stats Strip */}
          <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {/* Total Collateral */}
            <div className="flex-1 min-w-[140px] bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl p-4 border border-primary/20 dark:border-primary/30">
              <p className="text-[10px] font-bold text-primary/70 dark:text-primary/60 mb-1.5 uppercase tracking-wider">
                Total Collateral
              </p>
              <p className="text-xl font-bold text-dark dark:text-white tabular-nums">
                ${summary.totalCollateral.toFixed(2)}
              </p>
            </div>
            
            {/* Free Collateral */}
            <div className="flex-1 min-w-[140px] bg-gradient-to-br from-success/5 to-success/10 dark:from-success/10 dark:to-success/5 rounded-xl p-4 border border-success/20 dark:border-success/30">
              <p className="text-[10px] font-bold text-success/70 dark:text-success/60 mb-1.5 uppercase tracking-wider">
                Free Collateral
              </p>
              <p className="text-xl font-bold text-dark dark:text-white tabular-nums">
                ${summary.freeCollateral.toFixed(2)}
              </p>
            </div>
            
            {/* Unrealized PnL */}
            <div className="flex-1 min-w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
              <p className="text-[10px] font-bold text-muted dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                Unrealized PnL
              </p>
              <p className={`text-xl font-bold tabular-nums ${
                summary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'
              }`}>
                {summary.unrealizedPnl >= 0 ? '+' : ''}${summary.unrealizedPnl.toFixed(2)}
              </p>
            </div>
            
            {/* Leverage */}
            <div className="flex-1 min-w-[120px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
              <p className="text-[10px] font-bold text-muted dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                Leverage
              </p>
              <p className="text-xl font-bold text-dark dark:text-white tabular-nums">
                {summary.leverage.toFixed(2)}x
              </p>
            </div>
            
            {/* Margin Ratio */}
            <div className={`flex-1 min-w-[120px] rounded-xl p-4 border ${
              summary.marginRatio > 0.5 
                ? 'bg-gradient-to-br from-success/5 to-success/10 dark:from-success/10 dark:to-success/5 border-success/20 dark:border-success/30' 
                : summary.marginRatio > 0.2 
                ? 'bg-gradient-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/5 border-warning/20 dark:border-warning/30'
                : 'bg-gradient-to-br from-error/5 to-error/10 dark:from-error/10 dark:to-error/5 border-error/20 dark:border-error/30'
            }`}>
              <p className={`text-[10px] font-bold mb-1.5 uppercase tracking-wider ${
                summary.marginRatio > 0.5 
                  ? 'text-success/70 dark:text-success/60' 
                  : summary.marginRatio > 0.2 
                  ? 'text-warning/70 dark:text-warning/60'
                  : 'text-error/70 dark:text-error/60'
              }`}>
                Margin Ratio
              </p>
              <p className={`text-xl font-bold tabular-nums ${
                summary.marginRatio > 0.5 ? 'text-success' : 
                summary.marginRatio > 0.2 ? 'text-warning' : 'text-error'
              }`}>
                {(summary.marginRatio * 100).toFixed(1)}%
              </p>
            </div>
            
            {/* Open Positions */}
            <div className="flex-1 min-w-[120px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
              <p className="text-[10px] font-bold text-muted dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                Open Positions
              </p>
              <p className="text-xl font-bold text-dark dark:text-white tabular-nums">
                {summary.openPositions}
              </p>
            </div>
          </div>

          {/* Trading Disabled Warning */}
          {!canTrade && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3">
              <Icon icon="ph:warning-duotone" className="text-warning flex-shrink-0 mt-0.5" height={20} />
              <div>
                <p className="text-xs font-bold text-warning">Trading Disabled</p>
                <p className="text-xs text-warning/80 mt-1">
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
