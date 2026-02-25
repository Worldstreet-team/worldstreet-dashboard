"use client";

import React, { useState } from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

export const RiskPanel: React.FC = () => {
  const { collateral, selectedChain } = useFuturesStore();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: selectedChain,
          amount: parseFloat(amount),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Deposited ${amount} successfully. TX: ${data.txHash}`);
        setAmount('');
        setShowDepositModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to deposit');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Failed to deposit collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (collateral && parseFloat(amount) > collateral.free) {
      alert('Insufficient free margin');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/futures/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: selectedChain,
          amount: parseFloat(amount),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Withdrew ${amount} successfully. TX: ${data.txHash}`);
        setAmount('');
        setShowWithdrawModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to withdraw');
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      alert('Failed to withdraw collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!collateral) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted dark:text-darklink">Loading collateral data...</p>
        </div>
      </div>
    );
  }

  const isHighRisk = collateral.marginRatio < 0.2;

  return (
    <>
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
        
        <div className="space-y-3">
          {/* Total Collateral */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Total Collateral</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              ${collateral.total.toFixed(2)}
            </span>
          </div>

          {/* Used Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Used Margin</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              ${collateral.used.toFixed(2)}
            </span>
          </div>

          {/* Free Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Free Margin</span>
            <span className="text-sm font-semibold text-success">
              ${collateral.free.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-border dark:border-darkborder my-2"></div>

          {/* Margin Ratio */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Margin Ratio</span>
            <span className={`text-sm font-semibold ${
              isHighRisk ? 'text-error' : 'text-dark dark:text-white'
            }`}>
              {(collateral.marginRatio * 100).toFixed(2)}%
            </span>
          </div>

          {/* Unrealized PnL */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Total Unrealized PnL</span>
            <span className={`text-sm font-semibold ${
              collateral.totalUnrealizedPnL >= 0 ? 'text-success' : 'text-error'
            }`}>
              {collateral.totalUnrealizedPnL >= 0 ? '+' : ''}${collateral.totalUnrealizedPnL.toFixed(2)}
            </span>
          </div>

          {/* Funding Accrued */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Funding Accrued</span>
            <span className={`text-sm font-semibold ${
              collateral.fundingAccrued >= 0 ? 'text-success' : 'text-error'
            }`}>
              {collateral.fundingAccrued >= 0 ? '+' : ''}${collateral.fundingAccrued.toFixed(4)}
            </span>
          </div>

          {/* Risk Warning */}
          {isHighRisk && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
              <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={20} />
              <div>
                <p className="text-sm font-semibold text-error">High Liquidation Risk</p>
                <p className="text-xs text-error/80 mt-1">
                  Your margin ratio is below 20%. Consider adding margin or closing positions.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex-1 px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
            >
              <Icon icon="ph:arrow-down-duotone" className="inline mr-1" height={16} />
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={collateral.free <= 0}
              className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="ph:arrow-up-duotone" className="inline mr-1" height={16} />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkgray rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-dark dark:text-white">Deposit Collateral</h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-muted dark:text-darklink hover:text-dark dark:hover:text-white"
              >
                <Icon icon="ph:x" height={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkgray rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-dark dark:text-white">Withdraw Collateral</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-muted dark:text-darklink hover:text-dark dark:hover:text-white"
              >
                <Icon icon="ph:x" height={24} />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-dark dark:text-white">
                  Amount (USD)
                </label>
                <span className="text-xs text-muted dark:text-darklink">
                  Available: ${collateral.free.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={collateral.free}
                className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setAmount(collateral.free.toString())}
                className="text-xs text-primary hover:underline mt-1"
              >
                Max
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > collateral.free}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
