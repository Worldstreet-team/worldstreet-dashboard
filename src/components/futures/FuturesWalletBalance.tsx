"use client";

import React from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

export const FuturesWalletBalance: React.FC = () => {
  const { summary, isLoading, refreshSummary } = useDrift();

  const handleRefresh = async () => {
    await refreshSummary();
  };

  if (!summary && !isLoading) {
    return null;
  }

  const hasLowCollateral = (summary?.freeCollateral ?? 0) < 10;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-white/5">
        <h3 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">Drift Balance</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-200"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} 
            height={16} 
          />
        </button>
      </div>

      <div className="p-6 space-y-3">
        {/* Total Collateral */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl border border-primary/20 dark:border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
              <img 
                src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" 
                alt="USDC" 
                className="w-6 h-6 rounded-full"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary/70 dark:text-primary/60 uppercase tracking-wide">Total Collateral</span>
              <div className="text-sm font-bold text-dark dark:text-white font-mono tabular-nums">
                {isLoading ? '...' : `$${(summary?.totalCollateral ?? 0).toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Free Collateral */}
        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
          hasLowCollateral 
            ? 'bg-gradient-to-br from-error/5 to-error/10 dark:from-error/10 dark:to-error/5 border-error/20 dark:border-error/30' 
            : 'bg-gradient-to-br from-success/5 to-success/10 dark:from-success/10 dark:to-success/5 border-success/20 dark:border-success/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
              <Icon icon="ph:wallet-duotone" className="text-primary" height={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  hasLowCollateral ? 'text-error/70 dark:text-error/60' : 'text-success/70 dark:text-success/60'
                }`}>Free Collateral</span>
              </div>
              <div className={`text-sm font-bold font-mono tabular-nums ${
                hasLowCollateral ? 'text-error' : 'text-dark dark:text-white'
              }`}>
                {isLoading ? '...' : `$${(summary?.freeCollateral ?? 0).toFixed(2)}`}
              </div>
            </div>
          </div>
          {hasLowCollateral && !isLoading && (
            <Icon icon="ph:warning-fill" className="text-error" height={20} />
          )}
        </div>

        {/* Low Collateral Warning */}
        {hasLowCollateral && !isLoading && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
            <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={18} />
            <div>
              <p className="text-xs font-bold text-error">Low Collateral</p>
              <p className="text-xs text-error/80 mt-1">
                Add more collateral to continue trading
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Address */}
      {summary && (
        <div className="px-6 py-4 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <p className="text-xs font-semibold text-muted dark:text-gray-400 mb-2 uppercase tracking-wide">Drift Account</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-dark dark:text-white bg-white dark:bg-black/20 px-3 py-2 rounded-lg flex-1 truncate border border-gray-200/50 dark:border-white/10">
              {summary.publicAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(summary.publicAddress)}
              className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-all duration-200 border border-gray-200/50 dark:border-white/10"
              title="Copy address"
            >
              <Icon icon="ph:copy" className="text-muted dark:text-gray-400" height={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
