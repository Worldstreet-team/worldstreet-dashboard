"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';

interface CollateralData {
  total: number;
  available: number;
  used: number;
  currency: string;
  exists: boolean;
}

export const CollateralPanel: React.FC = () => {
  // Drift removal - placeholders
  const summary: any = null;
  const isInitialized = false;
  const isLoading = false;
  const refreshSummary = async () => {};
  const depositCollateral = async (amt: number) => ({ success: false, error: 'Not implemented' });
  const withdrawCollateral = async (amt: number) => ({ success: false, error: 'Not implemented' });

  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isPolling: isConfirmingAction, startPostActionPolling } = usePostActionPolling();

  // Map summary to collateral format
  const collateral: CollateralData | null = summary ? {
    total: summary.totalCollateral || 0,
    available: summary.freeCollateral || 0,
    used: (summary.totalCollateral || 0) - (summary.freeCollateral || 0),
    currency: 'USDC',
    exists: summary.initialized,
  } : null;

  // Manual refresh function
  const handleManualRefresh = async () => {
    await refreshSummary();
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const depositAmount = parseFloat(amount);
    const previousTotal = collateral?.total || 0;

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await depositCollateral(depositAmount);

      if (result.success) {
        setSuccess(`Depositing ${amount} USDC...`);
        
        startPostActionPolling({
          checkCondition: async () => {
            await refreshSummary();
            return true;
          },
          onSuccess: () => {
            setSuccess(`Successfully deposited ${amount} USDC!`);
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 5000);
          },
          onTimeout: () => {
            setSuccess('Deposit submitted. Please check your balance.');
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 5000);
          },
          maxAttempts: 20,
          interval: 1000,
        });
      } else {
        setError(result.error || 'Failed to deposit collateral');
        setProcessing(false);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await withdrawCollateral(parseFloat(amount));

      if (result.success) {
        setSuccess(`Withdrawing ${amount} USDC...`);
        
        startPostActionPolling({
          checkCondition: async () => {
            await refreshSummary();
            return true;
          },
          onSuccess: () => {
            setSuccess(`Successfully withdrew ${amount} USDC!`);
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 8000);
          },
          onTimeout: () => {
            setSuccess('Withdrawal submitted. Please check your balance.');
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 8000);
          },
          maxAttempts: 20,
          interval: 1000,
        });
      } else {
        setError(result.error || 'Failed to withdraw collateral');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      setError('Network error. Please try again.');
      setProcessing(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <div className="flex items-center justify-center py-8">
          <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535]" height={32} />
        </div>
      </div>
    );
  }

  // Show wallet creation message since Drift is removed
  if (!isInitialized || !collateral) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-4 uppercase">Collateral (USDC)</h3>
        <div className="text-center py-6">
          <Icon icon="ph:bank" className="mx-auto text-[#848e9c] mb-3" height={32} />
          <p className="text-sm text-[#848e9c] mb-2">
            Hyperliquid Assets
          </p>
          <p className="text-xs text-[#848e9c]/60">
            Visit the Portfolio page to manage your trading balances
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
      {/* Rest of the UI remains but with disabled functionality or placeholders */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-[#848e9c] uppercase">Collateral (USDC)</h3>
        </div>
      </div>
      <div className="text-center py-4">
        <p className="text-xs text-[#848e9c]">Manage your Hyperliquid collateral through the account dashboard.</p>
      </div>
    </div>
  );
};
