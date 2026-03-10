"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { CollateralDepositModal } from './CollateralDepositModal';
import { CollateralWithdrawModal } from './CollateralWithdrawModal';
import { useDrift } from '@/app/context/driftContext';

export const CollateralManagementPanel: React.FC = () => {
  const { summary, depositCollateral, withdrawCollateral } = useDrift();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const totalCollateral = summary?.totalCollateral || 0;
  const freeCollateral = summary?.freeCollateral || 0;

  const formatUSD = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleDeposit = async (amount: number) => {
    const result = await depositCollateral(amount);
    return {
      success: result.success,
      error: result.error,
    };
  };

  const handleWithdraw = async (amount: number) => {
    const result = await withdrawCollateral(amount);
    return {
      success: result.success,
      error: result.error,
    };
  };

  return (
    <>
      <div className="bg-[#1e2329] border border-[#2b3139] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2b3139]">
          <div className="flex items-center gap-2">
            <Icon icon="ph:wallet" className="text-[#848e9c]" height={20} />
            <h2 className="text-lg font-semibold text-white">Collateral Management</h2>
          </div>
          <p className="text-xs text-[#848e9c] mt-1">
            Manage your Drift account collateral
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Collateral Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Total Collateral
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${formatUSD(totalCollateral)}
              </p>
              <p className="text-xs text-[#848e9c] mt-1">
                USDC in Drift account
              </p>
            </div>

            <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c] uppercase tracking-wide">
                  Available to Withdraw
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${formatUSD(freeCollateral)}
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
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2b3139] hover:bg-[#3a4149] text-white border border-[#3a4149] rounded transition-colors font-medium"
            >
              <Icon icon="ph:arrow-down" height={18} />
              <span>Deposit Collateral</span>
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={freeCollateral <= 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2b3139] hover:bg-[#3a4149] text-white border border-[#3a4149] rounded transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#2b3139]"
            >
              <Icon icon="ph:arrow-up" height={18} />
              <span>Withdraw Collateral</span>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
            <div className="flex items-start gap-3">
              <Icon icon="ph:info" className="text-[#848e9c] shrink-0 mt-0.5" height={18} />
              <div className="space-y-2 text-xs text-[#848e9c]">
                <p>
                  <span className="text-white">Deposit:</span> Transfer USDC from your main wallet to your Drift trading account. A 5% platform fee is deducted.
                </p>
                <p>
                  <span className="text-white">Withdraw:</span> Transfer unused USDC back to your main wallet. Only free collateral (not used in positions) can be withdrawn.
                </p>
                <p>
                  <span className="text-white">Note:</span> All transactions require SOL for network fees.
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
        onDeposit={handleDeposit}
        feePercentage={5}
      />

      <CollateralWithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={handleWithdraw}
        availableBalance={freeCollateral}
      />
    </>
  );
};
