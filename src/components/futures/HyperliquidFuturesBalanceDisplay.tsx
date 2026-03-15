'use client';

import { Icon } from '@iconify/react';
import { useHyperliquidFuturesBalance } from '@/hooks/useHyperliquidFuturesBalance';

interface HyperliquidFuturesBalanceDisplayProps {
  userId?: string;
  className?: string;
}

export default function HyperliquidFuturesBalanceDisplay({ 
  userId, 
  className = '' 
}: HyperliquidFuturesBalanceDisplayProps) {
  const { 
    accountValue,
    totalMarginUsed,
    availableMargin,
    positions,
    positionCount,
    loading, 
    error, 
    refetch 
  } = useHyperliquidFuturesBalance(userId, !!userId);

  if (!userId) {
    return (
      <div className={`flex items-center gap-2 text-[#848e9c] ${className}`}>
        <Icon icon="ph:wallet" width={16} />
        <span className="text-xs">Connect Wallet</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-[#848e9c] ${className}`}>
        <Icon icon="ph:spinner" width={16} className="animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-[#f6465d] ${className}`}>
        <Icon icon="ph:warning" width={16} />
        <button 
          onClick={refetch}
          className="text-xs hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Account Value */}
      <div className="flex items-center gap-2">
        <Icon icon="ph:chart-line" width={16} className="text-[#0ecb81]" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">
            ${accountValue.toFixed(2)}
          </span>
          <span className="text-[9px] text-[#848e9c]">
            Account Value
          </span>
        </div>
      </div>

      {/* Available Margin */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-white">
          ${availableMargin.toFixed(2)}
        </span>
        <span className="text-[9px] text-[#848e9c]">
          Available
        </span>
      </div>

      {/* Margin Used */}
      {totalMarginUsed > 0 && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[#f0b90b]">
            ${totalMarginUsed.toFixed(2)}
          </span>
          <span className="text-[9px] text-[#848e9c]">
            Used Margin
          </span>
        </div>
      )}

      {/* Position Count */}
      {positionCount > 0 && (
        <div className="flex items-center gap-1">
          <Icon icon="ph:stack" width={14} className="text-[#848e9c]" />
          <span className="text-[9px] text-[#848e9c]">
            {positionCount} positions
          </span>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={refetch}
        className="p-1 hover:bg-[#1e2329] rounded transition-colors"
        title="Refresh Balance"
      >
        <Icon icon="ph:arrow-clockwise" width={12} className="text-[#848e9c]" />
      </button>
    </div>
  );
}