"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

export const RiskPanel: React.FC = () => {
  const { summary, refreshSummary, isLoading, depositCollateral, withdrawCollateral } = useDrift();
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
        setSuccess(`Successfully deposited ${amount} USDC. TX: ${result.txSignature?.slice(0, 8)}...`);
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

    if (summary && parseFloat(amount) > summary.freeCollateral) {
      setError('Insufficient free collateral');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await withdrawCollateral(parseFloat(amount));

      if (result.success) {
        setSuccess(`Successfully withdrew ${amount} USDC. TX: ${result.txSignature?.slice(0, 8)}...`);
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
            {error || 'No account data available'}
          </p>
        </div>
      </div>
    );
  }

  const usedCollateral = summary.totalCollateral - summary.freeCollateral;
  const isHighRisk = summary.marginRatio < 0.2;

  return (
    <>
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-[#848e9c] uppercase">Risk Summary</h3>
          <button
            onClick={refreshSummary}
            disabled={isLoading}
            className="p-1 hover:bg-[#2b3139] rounded transition-colors disabled:opacity-50"
          >
            <Icon icon="ph:arrow-clockwise" className={`text-[#848e9c] ${isLoading ? 'animate-spin' : ''}`} height={16} />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Total Collateral */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Total Collateral</span>
            <span className="text-sm font-semibold text-white">
              ${(Number(summary.totalCollateral) || 0).toFixed(2)}
            </span>
          </div>

          {/* Used Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Used Margin</span>
            <span className="text-sm font-semibold text-white">
              ${(Number(usedCollateral) || 0).toFixed(2)}
            </span>
          </div>

          {/* Free Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Free Margin</span>
            <span className="text-sm font-semibold text-[#0ecb81]">
              ${(Number(summary.freeCollateral) || 0).toFixed(2)}
            </span>
          </div>

          <div className="border-t border-[#2b3139] my-2"></div>

          {/* Margin Ratio */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Margin Ratio</span>
            <span className={`text-sm font-semibold ${
              isHighRisk ? 'text-[#f6465d]' : 'text-white'
            }`}>
              {((summary.marginRatio ?? 0) * 100).toFixed(2)}%
            </span>
          </div>

          {/* Leverage */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Account Leverage</span>
            <span className="text-sm font-semibold text-white">
              {(Number(summary?.leverage) || 0).toFixed(2)}x
            </span>
          </div>

          {/* Unrealized PnL */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Unrealized PnL</span>
            <span className={`text-sm font-semibold ${
              (summary.unrealizedPnl ?? 0) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
            }`}>
              {(summary.unrealizedPnl ?? 0) >= 0 ? '+' : ''}${(Number(summary?.unrealizedPnl) || 0).toFixed(2)}
            </span>
          </div>

          {/* Open Positions */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#848e9c]">Open Positions</span>
            <span className="text-sm font-semibold text-white">
              {summary.openPositions}
            </span>
          </div>

          {/* Risk Warning */}
          {isHighRisk && (
            <div className="mt-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded flex items-start gap-2">
              <Icon icon="ph:warning" className="text-[#f6465d] flex-shrink-0 mt-0.5" height={18} />
              <div>
                <p className="text-sm font-semibold text-[#f6465d]">High Liquidation Risk</p>
                <p className="text-xs text-[#f6465d]/80 mt-1">
                  Your margin ratio is below 20%. Consider adding margin or closing positions.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!action && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAction('deposit')}
                className="flex-1 px-3 py-2 rounded bg-[#0ecb81]/10 text-[#0ecb81] hover:bg-[#0ecb81]/20 transition-colors text-sm font-medium"
              >
                <Icon icon="ph:arrow-down" className="inline mr-1" height={14} />
                Deposit
              </button>
              <button
                onClick={() => setAction('withdraw')}
                disabled={summary.freeCollateral <= 0}
                className="flex-1 px-3 py-2 rounded bg-[#fcd535]/10 text-[#fcd535] hover:bg-[#fcd535]/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="ph:arrow-up" className="inline mr-1" height={14} />
                Withdraw
              </button>
            </div>
          )}

          {/* Deposit/Withdraw Form */}
          {action && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded border border-[#2b3139] bg-[#2b3139] text-white focus:outline-none focus:border-[#fcd535] font-mono"
                />
                {action === 'withdraw' && (
                  <p className="text-xs text-[#848e9c] mt-1">
                    Available: ${(Number(summary.freeCollateral) || 0).toFixed(2)}
                  </p>
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
                  <p className="text-sm text-[#0ecb81]">{success}</p>
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
                  disabled={isProcessing}
                  className="flex-1 py-2 px-3 bg-[#2b3139] text-white rounded text-sm font-medium hover:bg-[#2b3139]/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
                  disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'deposit'
                      ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                      : 'bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20]'
                  }`}
                >
                  {isProcessing ? 'Processing...' : action === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
