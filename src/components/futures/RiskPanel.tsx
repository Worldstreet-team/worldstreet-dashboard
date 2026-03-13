"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

export const RiskPanel: React.FC = () => {
  // Drift removal - placeholders
  const summary: any = null;
  const refreshSummary = async () => {};
  const isLoading = false;
  const depositCollateral = async (amt: number) => ({ success: false, error: 'Not implemented' });
  const withdrawCollateral = async (amt: number) => ({ success: false, error: 'Not implemented' });

  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await depositCollateral(parseFloat(amount));

      if (result.success) {
        setSuccess(`Successfully deposited ${amount} USDC.`);
        setAmount('');
        setAction(null);
        await refreshSummary();
      } else {
        setError(result.error || 'Failed to deposit collateral');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to deposit collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await withdrawCollateral(parseFloat(amount));

      if (result.success) {
        setSuccess(`Successfully withdrew ${amount} USDC.`);
        setAmount('');
        setAction(null);
        await refreshSummary();
      } else {
        setError(result.error || 'Failed to withdraw collateral');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to withdraw collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-4 uppercase">Risk Summary</h3>
        <div className="text-center py-4">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto text-[#fcd535]" height={32} />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-4 uppercase">Risk Summary</h3>
        <div className="text-center py-4">
          <p className="text-sm text-[#848e9c]">
            Hyperliquid Risk Management
          </p>
          <p className="text-xs text-[#848e9c]/60 mt-1">
            Futures risk data is available on the main dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#848e9c] uppercase">Risk Summary</h3>
      </div>
      <div className="text-center py-2">
        <p className="text-xs text-[#848e9c]">Account leverage and margin ratios are managed on the Hyperliquid L1.</p>
      </div>
    </div>
  );
};
