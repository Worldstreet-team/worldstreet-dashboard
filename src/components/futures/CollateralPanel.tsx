"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface CollateralData {
  total: number;
  available: number;
  used: number;
  currency: string;
  exists: boolean;
}

export const CollateralPanel: React.FC = () => {
  const { user } = useAuth();
  const [collateral, setCollateral] = useState<CollateralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userId = user?.userId || '';

  useEffect(() => {
    if (userId) {
      fetchCollateral();
    }
  }, [userId]);

  const fetchCollateral = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/futures/collateral?chain=solana');
      
      if (response.status === 404) {
        // Wallet not found - show message to create wallet
        setCollateral(null);
        setError('Futures wallet not found. Please create a futures wallet first.');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setCollateral(data);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch collateral');
      }
    } catch (err) {
      console.error('Failed to fetch collateral:', err);
      setError('Failed to fetch collateral');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'solana',
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully deposited ${amount} USDC`);
        setAmount('');
        setAction(null);
        await fetchCollateral();
      } else {
        setError(data.error || 'Failed to deposit collateral');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (collateral && parseFloat(amount) > collateral.available) {
      setError('Insufficient available collateral');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/futures/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'solana',
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully withdrew ${amount} USDC`);
        setAmount('');
        setAction(null);
        await fetchCollateral();
      } else {
        setError(data.error || 'Failed to withdraw collateral');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Show wallet creation message if no collateral data
  if (!collateral && error) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Collateral (USDC)</h3>
        <div className="text-center py-6">
          <Icon icon="ph:wallet-duotone" className="mx-auto text-muted dark:text-darklink mb-3" height={48} />
          <p className="text-sm text-muted dark:text-darklink mb-2">
            {error}
          </p>
          <p className="text-xs text-muted dark:text-darklink">
            Create a futures wallet to start trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">Collateral (USDC)</h3>
        <button
          onClick={fetchCollateral}
          className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
        >
          <Icon icon="ph:arrow-clockwise" className="text-muted dark:text-darklink" height={18} />
        </button>
      </div>

      {/* Collateral Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Total</p>
          <p className="text-lg font-semibold text-dark dark:text-white">
            ${collateral?.total.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Available</p>
          <p className="text-lg font-semibold text-success">
            ${collateral?.available.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Used</p>
          <p className="text-lg font-semibold text-error">
            ${collateral?.used.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {!action && (
        <div className="flex gap-2">
          <button
            onClick={() => setAction('deposit')}
            className="flex-1 py-2 px-4 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
          >
            <Icon icon="ph:arrow-down" height={18} />
            Deposit
          </button>
          <button
            onClick={() => setAction('withdraw')}
            disabled={!collateral || collateral.available <= 0}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Icon icon="ph:arrow-up" height={18} />
            Withdraw
          </button>
        </div>
      )}

      {/* Deposit/Withdraw Form */}
      {action && (
        <div className="space-y-3">
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
            {action === 'withdraw' && collateral && (
              <p className="text-xs text-muted dark:text-darklink mt-1">
                Available: ${collateral.available.toFixed(2)}
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
              disabled={processing}
              className="flex-1 py-2 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white rounded-lg font-medium hover:bg-muted/40 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={processing || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'deposit'
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              {processing ? 'Processing...' : action === 'deposit' ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-border dark:border-darkborder">
        <div className="flex items-start gap-2">
          <Icon icon="ph:info" className="text-primary flex-shrink-0 mt-0.5" height={16} />
          <p className="text-xs text-muted dark:text-darklink">
            Collateral is used as margin for your futures positions. Deposit USDC to increase your trading capacity.
          </p>
        </div>
      </div>
    </div>
  );
};
