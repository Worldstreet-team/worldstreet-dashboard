"use client";

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useUser } from '@clerk/nextjs';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';

export default function PositionsList() {
  const { user } = useUser();
  const { balances, loading, error, refetch } = useHyperliquidBalance(user?.id, !!user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="ph:spinner" className="animate-spin text-[#848e9c]" width={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:warning-circle" className="mx-auto mb-2 text-[#f6465d]" width={32} />
          <p className="text-sm text-[#f6465d]">{error}</p>
          <button onClick={() => refetch()} className="text-xs text-[#848e9c] underline mt-2 hover:text-white">Retry</button>
        </div>
      </div>
    );
  }

  // Filter out assets with tiny balances (dust)
  const tokenHoldings = balances.filter(b => parseFloat(b.total) > 0.0001);

  if (tokenHoldings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:coins" className="mx-auto mb-2 text-[#848e9c]" width={32} />
          <p className="text-sm text-[#848e9c]">No tokens found in your wallet</p>
          <p className="text-[10px] text-[#848e9c]/60 mt-1">Balances will appear after your first trade or deposit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e11] text-white">
      <div className="px-4 py-2 bg-[#161a1e] border-b border-[#1e2329] grid grid-cols-3 text-[10px] text-[#848e9c] font-medium uppercase tracking-wider">
        <span>Asset</span>
        <span className="text-right">Total Balance</span>
        <span className="text-right">Available</span>
      </div>
      <div className="divide-y divide-[#1e2329]">
        {tokenHoldings.map((position, i) => (
          <div
            key={i}
            className="px-4 py-3 grid grid-cols-3 hover:bg-[#1e2329] transition-colors cursor-default group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#2b3139] flex items-center justify-center text-[10px] font-bold text-white group-hover:bg-[#3b4149]">
                {position.coin.charAt(0)}
              </div>
              <span className="text-sm font-semibold text-[#eaecef]">
                {position.coin}
              </span>
            </div>
            
            <div className="text-right flex flex-col justify-center">
              <span className="text-sm font-mono text-white">
                {parseFloat(position.total).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
            </div>

            <div className="text-right flex flex-col justify-center">
              <span className="text-sm font-mono text-[#0ecb81]">
                {parseFloat(position.available).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
              {parseFloat(position.hold) > 0 && (
                <span className="text-[9px] text-[#848e9c]">
                  {parseFloat(position.hold).toFixed(4)} in orders
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}