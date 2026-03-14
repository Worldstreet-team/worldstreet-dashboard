"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';

export const CollateralPanel: React.FC = () => {
  const { summary, isInitialized, isLoading, refreshSummary } = useHyperliquid();
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      const result = await response.json();

      if (result.success) {
        setSuccess('Deposit initiated! Check your wallet for confirmation.');
        setAmount('');
        refreshSummary();
      } else {
        setError(result.error || 'Deposit failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading && !isInitialized) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4 text-center">
        <Icon icon="svg-spinners:ring-resize" className="mx-auto text-[#fcd535]" height={24} />
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-2 uppercase">Collateral</h3>
        <p className="text-xs text-[#848e9c]">Initialize your Trading account to manage collateral.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#848e9c] uppercase">Collateral (USDC)</h3>
        <button onClick={() => refreshSummary()} className="text-[#848e9c] hover:text-white">
          <Icon icon="ph:arrow-clockwise" width={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-xs text-[#848e9c]">Account Value</span>
          <span className="text-xs text-white font-bold">${summary?.totalCollateral.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[#848e9c]">Withdrawable</span>
          <span className="text-xs text-white font-bold">${summary?.withdrawable.toFixed(2)}</span>
        </div>

        <div className="pt-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0b0e11] border border-[#2b3139] rounded p-2 text-white text-xs focus:outline-none focus:border-[#f0b90b] mb-2"
            placeholder="Amount to deposit"
          />
          <button
            onClick={handleDeposit}
            disabled={processing}
            className="w-full py-2 bg-[#f0b90b] hover:bg-[#f0b90b]/90 text-[#0b0e11] rounded text-[11px] font-bold disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Deposit USDC'}
          </button>
          {error && <p className="text-[#f6465d] text-[10px] mt-1">{error}</p>}
          {success && <p className="text-[#0ecb81] text-[10px] mt-1">{success}</p>}
        </div>
      </div>
    </div>
  );
};
