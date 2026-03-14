"use client";

import React from 'react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { Icon } from '@iconify/react';

export const FuturesWalletBalance: React.FC = () => {
  const { summary, isLoading, isInitialized, refreshSummary } = useHyperliquid();

  const handleRefresh = async () => {
    await refreshSummary();
  };

  if (!isInitialized && !isLoading) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139]">
          <h3 className="text-xs font-medium text-[#848e9c] uppercase">Hyperliquid Balance</h3>
          <button onClick={handleRefresh} className="p-1.5 hover:bg-[#2b3139] rounded transition-colors">
            <Icon icon="ph:arrow-clockwise" className="text-[#848e9c]" height={14} />
          </button>
        </div>
        <div className="p-8 text-center text-[#848e9c]">
          <Icon icon="ph:wallet" className="mx-auto text-[#fcd535] mb-2" width={32} />
          <p className="text-xs font-bold text-white">No active account</p>
          <p className="text-[10px] mt-1">Initialize your Hyperliquid session to view balances</p>
        </div>
      </div>
    );
  }

  const hasLowCollateral = (summary?.freeCollateral ?? 0) < 10;

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3139] bg-[#1c2026]">
        <div className="flex items-center gap-2">
          <Icon icon="ph:currency-circle-dollar" className="text-[#fcd535]" height={18} />
          <h3 className="text-xs font-medium text-[#eaecef] uppercase">Hyperliquid Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-[#2b3139] rounded transition-colors disabled:opacity-50"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`} 
            height={14} 
          />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Total Account Value */}
        <div className="p-4 bg-[#1e2329] border border-[#2b3139] rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-medium text-[#848e9c] uppercase">Account Value</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#0ecb81]/10 text-[#0ecb81]">Active</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-white tabular-nums">
              ${(summary?.totalCollateral ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-[#848e9c]">USDC</span>
          </div>
        </div>

        {/* Available for Trading */}
        <div className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${
          hasLowCollateral 
            ? 'bg-[#f6465d]/5 border-[#f6465d]/20' 
            : 'bg-[#0ecb81]/5 border-[#0ecb81]/20'
        }`}>
          <div>
            <span className={`text-[10px] font-medium uppercase ${
              hasLowCollateral ? 'text-[#f6465d]' : 'text-[#848e9c]'
            }`}>Available to Trade</span>
            <div className={`text-md font-bold mt-1 font-mono ${
              hasLowCollateral ? 'text-[#f6465d]' : 'text-white'
            }`}>
              ${(summary?.freeCollateral ?? 0).toFixed(2)}
            </div>
          </div>
          {hasLowCollateral && (
            <div className="flex flex-col items-center">
              <Icon icon="ph:warning-octagon-fill" className="text-[#f6465d]" height={20} />
              <span className="text-[8px] text-[#f6465d] uppercase font-bold mt-1">LOW</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button className="py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded font-bold text-xs shadow-sm transition-all active:scale-95">
              Deposit
            </button>
            <button className="py-2.5 bg-[#2b3139] hover:bg-[#323a45] text-white rounded font-bold text-xs border border-[#484f59] transition-all active:scale-95">
              Withdraw
            </button>
        </div>
      </div>
    </div>
  );
};
