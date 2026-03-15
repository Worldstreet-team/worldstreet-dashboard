'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { useWallet } from '@/app/context/walletContext';
import DepositModal from './DepositModal';
import DepositStatusTracker from './DepositStatusTracker';

interface HyperliquidBalanceDisplayProps {
  userId?: string;
  className?: string;
}

export default function HyperliquidBalanceDisplay({ 
  userId, 
  className = '' 
}: HyperliquidBalanceDisplayProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  
  const { walletsGenerated, addresses, isLoading: walletsContextLoading } = useWallet();
  const { 
    usdcBalance, 
    accountValue, 
    balances, 
    loading, 
    error, 
    refetch 
  } = useHyperliquidBalance(userId, !!userId);

  const handleDepositInitiated = (depositData: any) => {
    setActiveDepositId(depositData.depositId);
    setShowDepositModal(false);
  };

  const handleDepositComplete = () => {
    setActiveDepositId(null);
    refetch(); // Refresh balance
  };

  if (!userId) {
    return (
      <div className={`flex items-center gap-2 text-[#848e9c] ${className}`}>
        <Icon icon="ph:wallet" width={16} />
        <span className="text-xs">Connect Wallet</span>
      </div>
    );
  }

  // Handle wallet context loading or pre-generation
  if (walletsContextLoading || (userId && !walletsGenerated)) {
    return (
      <div className={`flex items-center gap-2 text-[#848e9c] ${className}`}>
        <Icon icon="ph:spinner" width={16} className="animate-spin" />
        <span className="text-xs">Initializing Wallet...</span>
      </div>
    );
  }

  // Handle case where wallet generation didn't provide an address
  if (walletsGenerated && !addresses?.ethereum) {
    return (
      <div className={`flex items-center gap-2 text-[#f6465d] ${className}`}>
        <Icon icon="ph:warning-circle" width={16} />
        <span className="text-xs">Wallet not set up</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-[#848e9c] ${className}`}>
        <Icon icon="ph:spinner" width={16} className="animate-spin" />
        <span className="text-xs">Loading Balance...</span>
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
          Check Balance
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-3 ${className}`}>
        {/* USDC Balance */}
        <div className="flex items-center gap-2">
          <Icon icon="cryptocurrency:usdc" width={16} className="text-[#2775ca]" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">
              ${usdcBalance.available.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#848e9c]">
              Available USDC
            </span>
          </div>
        </div>

        {/* Account Value */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">
            ${accountValue.toFixed(2)}
          </span>
          <span className="text-[9px] text-[#848e9c]">
            Total Value
          </span>
        </div>

        {/* In Orders (if any) */}
        {usdcBalance.hold > 0 && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#f0b90b]">
              ${usdcBalance.hold.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#848e9c]">
              In Orders
            </span>
          </div>
        )}

        {/* Other Assets Count */}
        {balances.length > 1 && (
          <div className="flex items-center gap-1">
            <Icon icon="ph:coins" width={14} className="text-[#848e9c]" />
            <span className="text-[9px] text-[#848e9c]">
              +{balances.length - 1} assets
            </span>
          </div>
        )}

        {/* Deposit Button */}
        <button
          onClick={() => setShowDepositModal(true)}
          className="px-2 py-1 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white text-xs font-medium rounded transition-colors"
          title="Deposit USDT"
        >
          <Icon icon="ph:plus" width={12} />
        </button>

        {/* Refresh Button */}
        <button
          onClick={refetch}
          className="p-1 hover:bg-[#1e2329] rounded transition-colors"
          title="Refresh Balance"
        >
          <Icon icon="ph:arrow-clockwise" width={12} className="text-[#848e9c]" />
        </button>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDepositInitiated={handleDepositInitiated}
      />

      {/* Active Deposit Status Tracker */}
      {activeDepositId && (
        <div className="fixed bottom-4 right-4 w-80 z-50">
          <DepositStatusTracker
            depositId={activeDepositId}
            onComplete={handleDepositComplete}
          />
        </div>
      )}
    </>
  );
}