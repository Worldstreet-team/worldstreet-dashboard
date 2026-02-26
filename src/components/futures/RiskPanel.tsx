"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useDriftTrading } from '@/hooks/useDriftTrading';

interface AccountSummary {
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  openOrders: number;
}

export const RiskPanel: React.FC = () => {
  const { user } = useAuth();
  const { depositCollateral, withdrawCollateral, fetchAccountSummary } = useDriftTrading();
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userId = user?.userId || '';

  useEffect(() => {
    if (userId) {
      loadAccountSummary();
    }
  }, [userId]);

  const loadAccountSummary = async () => {
    setLoading(true);
    try {
      const data = await fetchAccountSummary();
      setAccountSummary(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch account summary:', err);
      setError('Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

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
      setSuccess(`Successfully deposited ${amount} USDC. TX: ${result.txSignature?.slice(0, 8)}...`);
      setAmount('');
      setAction(null);
      await loadAccountSummary();
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

    if (accountSummary && parseFloat(amount) > accountSummary.freeCollateral) {
      setError('Insufficient free collateral');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await withdrawCollateral(parseFloat(amount));
      setSuccess(`Successfully withdrew ${amount} USDC. TX: ${result.txSignature?.slice(0, 8)}...`);
      setAmount('');
      setAction(null);
      await loadAccountSummary();
    } catch (err) {
      setError((err as Error).message || 'Failed to withdraw collateral');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!accountSummary) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted dark:text-darklink">
            {error || 'No account data available'}
          </p>
        </div>
      </div>
    );
  }

  const usedCollateral = accountSummary.totalCollateral - accountSummary.freeCollateral;
  const isHighRisk = accountSummary.marginRatio < 0.2;

  return (
    <>
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark dark:text-white">Risk Summary</h3>
          <button
            onClick={loadAccountSummary}
            className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
          >
            <Icon icon="ph:arrow-clockwise" className="text-muted dark:text-darklink" height={18} />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Total Collateral */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Total Collateral</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              ${accountSummary.totalCollateral.toFixed(2)}
            </span>
          </div>

          {/* Used Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Used Margin</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              ${usedCollateral.toFixed(2)}
            </span>
          </div>

          {/* Free Margin */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Free Margin</span>
            <span className="text-sm font-semibold text-success">
              ${accountSummary.freeCollateral.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-border dark:border-darkborder my-2"></div>

          {/* Margin Ratio */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Margin Ratio</span>
            <span className={`text-sm font-semibold ${
              isHighRisk ? 'text-error' : 'text-dark dark:text-white'
            }`}>
              {(accountSummary.marginRatio * 100).toFixed(2)}%
            </span>
          </div>

          {/* Leverage */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Account Leverage</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              {accountSummary.leverage.toFixed(2)}x
            </span>
          </div>

          {/* Unrealized PnL */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Unrealized PnL</span>
            <span className={`text-sm font-semibold ${
              accountSummary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'
            }`}>
              {accountSummary.unrealizedPnl >= 0 ? '+' : ''}${accountSummary.unrealizedPnl.toFixed(2)}
            </span>
          </div>

          {/* Open Positions */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted dark:text-darklink">Open Positions</span>
            <span className="text-sm font-semibold text-dark dark:text-white">
              {accountSummary.openPositions}
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
          {!action && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAction('deposit')}
                className="flex-1 px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
              >
                <Icon icon="ph:arrow-down-duotone" className="inline mr-1" height={16} />
                Deposit
              </button>
              <button
                onClick={() => setAction('withdraw')}
                disabled={accountSummary.freeCollateral <= 0}
                className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="ph:arrow-up-duotone" className="inline mr-1" height={16} />
                Withdraw
              </button>
            </div>
          )}

          {/* Deposit/Withdraw Form */}
          {action && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {action === 'withdraw' && (
                  <p className="text-xs text-muted dark:text-darklink mt-1">
                    Available: ${accountSummary.freeCollateral.toFixed(2)}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                  <Icon icon="ph:warning-circle" className="text-error flex-shrink-0 mt-0.5" height={16} />
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2">
                  <Icon icon="ph:check-circle" className="text-success flex-shrink-0 mt-0.5" height={16} />
                  <p className="text-sm text-success">{success}</p>
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
                  className="flex-1 py-2 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white rounded-lg font-medium hover:bg-muted/40 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
                  disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'deposit'
                      ? 'bg-success hover:bg-success/90 text-white'
                      : 'bg-primary hover:bg-primary/90 text-white'
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
