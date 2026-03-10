"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { CollateralDepositModal } from './CollateralDepositModal';
import { CollateralWithdrawModal } from './CollateralWithdrawModal';

interface CollateralManagementPanelProps {
  totalCollateral: number;
  freeCollateral: number;
  onDeposit: (amount: number) => Promise<{
    success: boolean;
    feeAmount?: number;
    collateralAmount?: number;
    error?: string;
  }>;
  onWithdraw: (amount: number) => Promise<{
    success: boolean;
    error?: string;
  }>;
  feePercentage?: number;
}

export const CollateralManagementPanel: React.FC<CollateralManagementPanelProps> = ({
  totalCollateral,
  freeCollateral,
  onDeposit,
  onWithdraw,
  feePercentage = 5,
}) => {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const formatUSD = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      <div className="bg-[#2b3139] border border-[#2b3139] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e2329]">
          <div className="flex items-center gap-2">
            <Icon icon="ph:wallet-duotone" className="text-[#fcd535]" height={20} />
            <h2 className="text-lg font-semibold text-white">Collateral Management</h2>
          </div>
          <p className="text-xs text-[#848e9c] mt-1">
            Manage your Drift account collateral
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Collateral Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1e2329] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Total Collateral
                </span>
                <Icon icon="ph:coins-duotone" className="text-[#fcd535]" height={18} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatUSD(totalCollateral)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                USDC in Drift account
              </p>
            </div>

            <div className="bg-[#1e2329] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Available to Withdraw
                </span>
                <Icon icon="ph:arrow-up-duotone" className="text-[#0ecb81]" height={18} />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatUSD(freeCollateral)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                Not used in positions
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white rounded-lg transition-colors font-medium"
            >
              <Icon icon="ph:arrow-down" height={20} />
              <span>Deposit Collateral</span>
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={freeCollateral <= 0}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="ph:arrow-up" height={20} />
              <span>Withdraw Collateral</span>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-[#1e2329] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon icon="ph:info-duotone" className="text-[#fcd535] shrink-0 mt-0.5" height={20} />
              <div className="space-y-2 text-xs text-[#848e9c]">
                <p>
                  <span className="font-medium text-white">Deposit:</span> Transfer USDC from your main wallet to your Drift trading account. A {feePercentage}% platform fee is deducted.
                </p>
                <p>
                  <span className="font-medium text-white">Withdraw:</span> Transfer unused USDC back to your main wallet. Only free collateral (not used in positions) can be withdrawn.
                </p>
                <p>
                  <span className="font-medium text-white">Note:</span> All transactions require SOL for network fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CollateralDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDeposit={onDeposit}
        feePercentage={feePercentage}
      />

      <CollateralWithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={onWithdraw}
        availableBalance={freeCollateral}
      />
    </>
  );
};
