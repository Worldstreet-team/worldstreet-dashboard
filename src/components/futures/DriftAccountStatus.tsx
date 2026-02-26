"use client";

import React, { useState } from 'react';
import { useDrift } from '@/app/context/driftContext';
import { Icon } from '@iconify/react';

export const DriftAccountStatus: React.FC = () => {
  const { 
    isInitialized, 
    needsInitialization, 
    canTrade, 
    status, 
    summary,
    isLoading,
    error,
    initializeAccount,
    refreshSummary
  } = useDrift();

  const [initializing, setInitializing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleInitialize = async () => {
    setInitializing(true);
    const result = await initializeAccount();
    
    if (result.success) {
      console.log('Drift account initialized successfully');
    } else {
      console.error('Failed to initialize:', result.error);
    }
    
    setInitializing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSummary();
    setRefreshing(false);
  };

  if (isLoading && !status) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <div className="flex items-center gap-3">
          <Icon icon="svg-spinners:ring-resize" className="text-primary" height={24} />
          <span className="text-sm text-muted dark:text-darklink">Checking Drift account status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border-2 border-error/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:warning-circle-duotone" className="text-error flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-error mb-1">Error Loading Account</h4>
            <p className="text-xs text-error/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="bg-warning/10 border-2 border-warning/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:info-duotone" className="text-warning flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-warning mb-1">Drift Account Initialization Required</h4>
            <p className="text-xs text-warning/80 mb-3">
              Your Drift subaccount needs to be initialized before you can trade futures. 
              This is a one-time setup that costs approximately {status?.initializationCost.sol ?? 0.035} SOL 
              (~${status?.initializationCost.usd ?? 7}).
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initializing ? (
                <>
                  <Icon icon="svg-spinners:ring-resize" className="inline mr-2" height={16} />
                  Initializing...
                </>
              ) : (
                <>
                  <Icon icon="ph:rocket-launch" className="inline mr-2" height={16} />
                  Initialize Account ({status?.initializationCost.sol ?? 0.035} SOL)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-info/10 border-2 border-info/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon icon="ph:clock-duotone" className="text-info flex-shrink-0 mt-0.5" height={24} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-info mb-1">Account Initializing</h4>
            <p className="text-xs text-info/80">
              Your Drift account is being set up. This may take a few moments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Account is initialized - show summary
  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon 
            icon={canTrade ? "ph:check-circle-duotone" : "ph:warning-duotone"} 
            className={canTrade ? "text-success" : "text-warning"} 
            height={24} 
          />
          <h3 className="text-sm font-semibold text-dark dark:text-white">
            Drift Account Status
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark rounded-lg transition-colors disabled:opacity-50"
          title="Refresh account data"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-darklink ${refreshing ? 'animate-spin' : ''}`}
            height={18} 
          />
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Total Collateral</p>
            <p className="text-lg font-semibold text-dark dark:text-white">
              ${summary.totalCollateral.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Free Collateral</p>
            <p className="text-lg font-semibold text-dark dark:text-white">
              ${summary.freeCollateral.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Unrealized PnL</p>
            <p className={`text-lg font-semibold ${
              summary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'
            }`}>
              ${summary.unrealizedPnl >= 0 ? '+' : ''}{summary.unrealizedPnl.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Leverage</p>
            <p className="text-lg font-semibold text-dark dark:text-white">
              {summary.leverage.toFixed(2)}x
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Margin Ratio</p>
            <p className={`text-lg font-semibold ${
              summary.marginRatio > 0.5 ? 'text-success' : 
              summary.marginRatio > 0.2 ? 'text-warning' : 'text-error'
            }`}>
              {(summary.marginRatio * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-3">
            <p className="text-xs text-muted dark:text-darklink mb-1">Open Positions</p>
            <p className="text-lg font-semibold text-dark dark:text-white">
              {summary.openPositions}
            </p>
          </div>
        </div>
      )}

      {!canTrade && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-xs text-warning">
            <Icon icon="ph:warning" className="inline mr-1" height={14} />
            Trading is currently disabled. Please add collateral or close positions to continue trading.
          </p>
        </div>
      )}
    </div>
  );
};
