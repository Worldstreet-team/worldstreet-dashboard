"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';

interface CollateralData {
  total: number;
  available: number;
  used: number;
  currency: string;
  exists: boolean;
}

export const CollateralPanel: React.FC = () => {
  const { summary, isInitialized, isLoading, refreshSummary, depositCollateral, withdrawCollateral } = useDrift();
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
      // Use client-side Drift deposit
      const result = await depositCollateral(depositAmount);

      if (result.success) {
        setSuccess(`Depositing ${amount} USDC... TX: ${result.txSignature?.slice(0, 8)}...`);
        
        // Start post-action polling to confirm deposit
        startPostActionPolling({
          checkCondition: async () => {
            await refreshSummary();
            const newTotal = summary?.totalCollateral || 0;
            // Check if balance increased
            return newTotal >= previousTotal + depositAmount * 0.99; // Allow 1% slippage
          },
          onSuccess: () => {
            setSuccess(`Successfully deposited ${amount} USDC!`);
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 5000);
          },
          onTimeout: () => {
            setSuccess('Deposit submitted but taking longer to confirm. Check your balance.');
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

    if (collateral && parseFloat(amount) > collateral.available) {
      setError(`Insufficient available collateral. Available: ${collateral.available.toFixed(2)} USDC`);
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const previousTotal = collateral?.total || 0;

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Use client-side Drift withdraw
      const result = await withdrawCollateral(withdrawAmount);

      if (result.success) {
        setSuccess(`Withdrawing ${amount} USDC... TX: ${result.txSignature?.slice(0, 8)}...`);
        
        // Start post-action polling to confirm withdrawal
        startPostActionPolling({
          checkCondition: async () => {
            await refreshSummary();
            const newTotal = summary?.totalCollateral || 0;
            // Check if balance decreased
            return newTotal <= previousTotal - withdrawAmount * 0.99; // Allow 1% tolerance
          },
          onSuccess: () => {
            setSuccess(`Successfully withdrew ${amount} USDC!`);
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 8000);
          },
          onTimeout: () => {
            setSuccess('Withdrawal submitted but taking longer to confirm. Check your balance.');
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

  // Show wallet creation message if not initialized
  if (!isInitialized || !collateral) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-4 uppercase">Collateral (USDC)</h3>
        <div className="text-center py-6">
          <Icon icon="ph:wallet" className="mx-auto text-[#848e9c] mb-3" height={32} />
          <p className="text-sm text-[#848e9c] mb-2">
            Drift account not initialized
          </p>
          <p className="text-xs text-[#848e9c]/60">
            Initialize your Drift account to start trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-[#848e9c] uppercase">Collateral (USDC)</h3>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="p-1 hover:bg-[#2b3139] rounded transition-colors disabled:opacity-50"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`} 
            height={16} 
          />
        </button>
      </div>

      {/* Collateral Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#2b3139] rounded p-2">
          <p className="text-[10px] text-[#848e9c] mb-1">Total</p>
          <p className="text-sm font-semibold text-white">
            ${(Number(collateral?.total) || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#2b3139] rounded p-2">
          <p className="text-[10px] text-[#848e9c] mb-1">Available</p>
          <p className="text-sm font-semibold text-[#0ecb81]">
            ${(Number(collateral?.available) || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#2b3139] rounded p-2">
          <p className="text-[10px] text-[#848e9c] mb-1">Used</p>
          <p className="text-sm font-semibold text-[#f6465d]">
            ${(Number(collateral?.used) || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {!action && (
        <div className="flex gap-2">
          <button
            onClick={() => setAction('deposit')}
            className="flex-1 py-2 px-3 bg-[#0ecb81] text-white rounded text-sm font-semibold hover:bg-[#0ecb81]/90 transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon icon="ph:arrow-down" height={16} />
            Deposit
          </button>
          <button
            onClick={() => setAction('withdraw')}
            disabled={!collateral || collateral.available <= 0}
            className="flex-1 py-2 px-3 bg-[#fcd535] text-[#181a20] rounded text-sm font-semibold hover:bg-[#fcd535]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Icon icon="ph:arrow-up" height={16} />
            Withdraw
          </button>
        </div>
      )}

      {/* Deposit/Withdraw Form */}
      {action && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded border border-[#2b3139] bg-[#2b3139] text-white focus:outline-none focus:border-[#fcd535] font-mono"
            />
            {action === 'withdraw' && collateral && (
              <>
                <p className="text-xs text-[#848e9c] mt-1">
                  Available: ${(Number(collateral.available) || 0).toFixed(2)}
                </p>
                {/* Quick amount buttons for withdraw */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.25).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-[#2b3139] rounded text-xs font-medium text-white hover:bg-[#2b3139]/80 transition-colors"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.5).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-[#2b3139] rounded text-xs font-medium text-white hover:bg-[#2b3139]/80 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.75).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-[#2b3139] rounded text-xs font-medium text-white hover:bg-[#2b3139]/80 transition-colors"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(collateral.available.toFixed(2))}
                    className="flex-1 px-2 py-1 bg-[#fcd535]/10 text-[#fcd535] rounded text-xs font-medium hover:bg-[#fcd535]/20 transition-colors"
                  >
                    Max
                  </button>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded flex items-start gap-2">
              <Icon icon="ph:warning-circle" className="text-[#f6465d] flex-shrink-0 mt-0.5" height={16} />
              <p className="text-sm text-[#f6465d]">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded flex items-start gap-2">
              <Icon icon="ph:check-circle" className="text-[#0ecb81] flex-shrink-0 mt-0.5" height={16} />
              <p className="text-sm text-[#0ecb81] whitespace-pre-line">{success}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAction(null);
                setAmount('');
                setError('');
                setSuccess('');
              }}
              disabled={processing}
              className="flex-1 py-2 px-3 bg-[#2b3139] text-white rounded text-sm font-medium hover:bg-[#2b3139]/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={processing || isConfirmingAction || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'deposit'
                  ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                  : 'bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20]'
              }`}
            >
              {isConfirmingAction ? (
                <span className="flex items-center justify-center gap-1">
                  <Icon icon="svg-spinners:ring-resize" height={14} />
                  Confirming...
                </span>
              ) : processing ? (
                'Processing...'
              ) : action === 'deposit' ? (
                'Deposit'
              ) : (
                'Withdraw'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-[#2b3139]">
        <div className="flex items-start gap-2">
          <Icon icon="ph:info" className="text-[#fcd535] flex-shrink-0 mt-0.5" height={14} />
          <div className="text-xs text-[#848e9c] space-y-1">
            <p>
              Collateral is used as margin for your futures positions. Deposit USDC to increase your trading capacity.
            </p>
            {action === 'withdraw' && (
              <p className="text-[#fcd535] mt-2">
                Withdrawal is a 2-step process: (1) Withdraw from Drift account, (2) Transfer to your futures wallet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
