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
    <div className="bg-[#181a20] border border-[#2b3139] rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
        <h3 className="text-xs font-medium text-[#848e9c] uppercase">Drift Balance</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-[#2b3139] rounded transition-colors"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`} 
            height={14} 
          />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Total Collateral */}
        <div className="flex items-center justify-between p-3 bg-[#2b3139] rounded">
          <div className="flex items-center gap-2">
            <img 
              src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" 
              alt="USDC" 
              className="w-5 h-5 rounded-full"
            />
            <div>
              <span className="text-[10px] font-medium text-[#848e9c] uppercase">Total Collateral</span>
              <div className="text-sm font-bold text-white font-mono tabular-nums">
                {isLoading ? '...' : `${(summary?.totalCollateral ?? 0).toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Free Collateral */}
        <div className={`flex items-center justify-between p-3 rounded ${
          hasLowCollateral 
            ? 'bg-[#f6465d]/10 border border-[#f6465d]/20' 
            : 'bg-[#0ecb81]/10 border border-[#0ecb81]/20'
        }`}>
          <div className="flex items-center gap-2">
            <Icon icon="ph:wallet" className="text-[#fcd535]" height={20} />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium uppercase ${
                  hasLowCollateral ? 'text-[#f6465d]' : 'text-[#0ecb81]'
                }`}>Free Collateral</span>
              </div>
              <div className={`text-sm font-bold font-mono tabular-nums ${
                hasLowCollateral ? 'text-[#f6465d]' : 'text-white'
              }`}>
                {isLoading ? '...' : `${(summary?.freeCollateral ?? 0).toFixed(2)}`}
              </div>
            </div>
          </div>
          {hasLowCollateral && !isLoading && (
            <Icon icon="ph:warning-fill" className="text-[#f6465d]" height={18} />
          )}
        </div>

        {/* Low Collateral Warning */}
        {hasLowCollateral && !isLoading && (
          <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded flex items-start gap-2">
            <Icon icon="ph:warning" className="text-[#f6465d] flex-shrink-0 mt-0.5" height={16} />
            <div>
              <p className="text-xs font-bold text-[#f6465d]">Low Collateral</p>
              <p className="text-xs text-[#f6465d]/80 mt-1">
                Add more collateral to continue trading
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Address */}
      {summary && (
        <div className="px-4 py-3 border-t border-[#2b3139] bg-[#2b3139]/30">
          <p className="text-[10px] font-medium text-[#848e9c] mb-2 uppercase">Drift Account</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-white bg-[#181a20] px-2 py-1.5 rounded flex-1 truncate border border-[#2b3139]">
              {summary.publicAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(summary.publicAddress)}
              className="p-1.5 hover:bg-[#2b3139] rounded transition-colors border border-[#2b3139]"
              title="Copy address"
            >
              <Icon icon="ph:copy" className="text-[#848e9c]" height={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
