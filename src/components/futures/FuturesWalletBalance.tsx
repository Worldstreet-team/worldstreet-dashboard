"use client";

import React from 'react';
import { Icon } from '@iconify/react';

export const FuturesWalletBalance: React.FC = () => {
  // Drift removal - placeholders
  const summary: any = null;
  const isLoading = false;
  const refreshSummary = async () => {};

  const handleRefresh = async () => {
    await refreshSummary();
  };

  if (!summary && !isLoading) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
          <h3 className="text-xs font-medium text-[#848e9c] uppercase">Hyperliquid Balance</h3>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-[#2b3139] rounded transition-colors"
          >
            <Icon 
              icon="ph:arrow-clockwise" 
              className="text-[#848e9c]" 
              height={14} 
            />
          </button>
        </div>
        <div className="p-8 text-center">
            <Icon icon="ph:wallet" className="mx-auto text-[#fcd535] mb-2" width={32} />
            <p className="text-white text-xs font-bold">Migration in Progress</p>
            <p className="text-[#848e9c] text-[10px] mt-1">Connect your trading wallet to view balances</p>
        </div>
      </div>
    );
  }

  const hasLowCollateral = (summary?.freeCollateral ?? 0) < 10;

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
        <h3 className="text-xs font-medium text-[#848e9c] uppercase">Hyperliquid Balance</h3>
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
              src="https://img.icons8.com/color/48/usdc.png" 
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
      </div>
    </div>
  );
};
