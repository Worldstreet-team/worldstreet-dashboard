"use client";

import React, { useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useFuturesPolling, usePostActionPolling } from '@/hooks/useFuturesPolling';

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
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { isPolling: isConfirmingAction, startPostActionPolling } = usePostActionPolling();

  const userId = user?.userId || '';

  const fetchCollateral = useCallback(async () => {
    if (loading && collateral) return; // Prevent overlapping requests
    
    // Don't set loading to true - keep showing current data
    try {
      // Use Drift account summary endpoint
      const response = await fetch('/api/drift/account/summary');
      
      if (response.status === 404) {
        // Wallet not found - show message to create wallet
        setCollateral(null);
        setError('Futures wallet not found. Please create a futures wallet first.');
        setInitialLoad(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        // Map Drift account summary to collateral format
        setCollateral({
          total: data.totalCollateral || 0,
          available: data.freeCollateral || 0,
          used: (data.totalCollateral || 0) - (data.freeCollateral || 0),
          currency: 'USDC',
          exists: true,
        });
        setLastUpdate(new Date());
        setError('');
        setInitialLoad(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch collateral');
        setInitialLoad(false);
      }
    } catch (err) {
      console.error('Failed to fetch collateral:', err);
      setError('Failed to fetch collateral');
      setInitialLoad(false);
    }
  }, [loading, collateral]);

  // Manual refresh function (shows loading spinner)
  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/drift/account/summary');
      
      if (response.status === 404) {
        setCollateral(null);
        setError('Futures wallet not found. Please create a futures wallet first.');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setCollateral({
          total: data.totalCollateral || 0,
          available: data.freeCollateral || 0,
          used: (data.totalCollateral || 0) - (data.freeCollateral || 0),
          currency: 'USDC',
          exists: true,
        });
        setLastUpdate(new Date());
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch collateral');
      }
    } catch (err) {
      console.error('Failed to fetch collateral:', err);
      setError('Failed to fetch collateral');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-polling every 30 seconds (increased from 10s)
  useFuturesPolling({
    interval: 30000,
    enabled: userId !== '',
    onPoll: fetchCollateral,
    dependencies: [userId],
  });

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
      // Use Drift deposit endpoint
      const response = await fetch('/api/drift/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: depositAmount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Depositing ${amount} USDC... TX: ${data.txSignature?.slice(0, 8)}...`);
        
        // Start post-action polling to confirm deposit
        startPostActionPolling({
          checkCondition: async () => {
            await fetchCollateral();
            const newTotal = collateral?.total || 0;
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
        setError(data.error || 'Failed to deposit collateral');
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
      // Use Drift withdraw endpoint
      const response = await fetch('/api/drift/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show detailed success message with both transaction hashes
        const driftTx = data.driftWithdrawTx?.slice(0, 8) || 'N/A';
        const transferTx = data.transferToUserTx?.slice(0, 8) || 'N/A';
        
        setSuccess(
          `Withdrawing ${amount} USDC...\n` +
          `Step 1: Drift withdrawal (${driftTx}...)\n` +
          `Step 2: Transfer to wallet (${transferTx}...)`
        );
        
        // Start post-action polling to confirm withdrawal
        startPostActionPolling({
          checkCondition: async () => {
            await fetchCollateral();
            const newTotal = collateral?.total || 0;
            // Check if balance decreased
            return newTotal <= previousTotal - withdrawAmount * 0.99; // Allow 1% tolerance
          },
          onSuccess: () => {
            setSuccess(
              `Successfully withdrew ${amount} USDC!\n` +
              `Funds transferred to your futures wallet.\n` +
              `Drift TX: ${driftTx}... | Transfer TX: ${transferTx}...`
            );
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 8000);
          },
          onTimeout: () => {
            setSuccess(
              `Withdrawal submitted but taking longer to confirm.\n` +
              `Check your futures wallet balance.\n` +
              `Drift TX: ${driftTx}... | Transfer TX: ${transferTx}...`
            );
            setAmount('');
            setAction(null);
            setProcessing(false);
            setTimeout(() => setSuccess(''), 8000);
          },
          maxAttempts: 20,
          interval: 1000,
        });
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          setError('Futures wallet not found. Please create a futures wallet first.');
        } else if (data.error?.includes('Insufficient balance')) {
          setError(data.message || data.error);
        } else if (data.error?.includes('not properly loaded')) {
          setError('Temporary synchronization issue. Please try again in a few seconds.');
        } else {
          setError(data.message || data.error || 'Failed to withdraw collateral');
        }
        setProcessing(false);
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      setError('Network error. Please try again.');
      setProcessing(false);
    }
  };

  if (initialLoad) {
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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-dark dark:text-white">Collateral (USDC)</h3>
          {lastUpdate && !loading && (
            <span className="text-xs text-muted dark:text-darklink">
              {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
            </span>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors disabled:opacity-50"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-darklink ${loading ? 'animate-spin' : ''}`} 
            height={18} 
          />
        </button>
      </div>

      {/* Collateral Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Total</p>
          <p className="text-lg font-semibold text-dark dark:text-white">
            ${(collateral?.total ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Available</p>
          <p className="text-lg font-semibold text-success">
            ${(collateral?.available ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
          <p className="text-xs text-muted dark:text-darklink mb-1">Used</p>
          <p className="text-lg font-semibold text-error">
            ${(collateral?.used ?? 0).toFixed(2)}
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
              <>
                <p className="text-xs text-muted dark:text-darklink mt-1">
                  Available: ${(collateral.available ?? 0).toFixed(2)}
                </p>
                {/* Quick amount buttons for withdraw */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.25).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-muted/30 dark:bg-white/5 rounded text-xs font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.5).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-muted/30 dark:bg-white/5 rounded text-xs font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount((collateral.available * 0.75).toFixed(2))}
                    className="flex-1 px-2 py-1 bg-muted/30 dark:bg-white/5 rounded text-xs font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(collateral.available.toFixed(2))}
                    className="flex-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    Max
                  </button>
                </div>
              </>
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
              <p className="text-sm text-success whitespace-pre-line">{success}</p>
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
              disabled={processing || isConfirmingAction || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'deposit'
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
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
      <div className="mt-4 pt-4 border-t border-border dark:border-darkborder">
        <div className="flex items-start gap-2">
          <Icon icon="ph:info" className="text-primary flex-shrink-0 mt-0.5" height={16} />
          <div className="text-xs text-muted dark:text-darklink space-y-1">
            <p>
              Collateral is used as margin for your futures positions. Deposit USDC to increase your trading capacity.
            </p>
            {action === 'withdraw' && (
              <p className="text-blue-600 dark:text-blue-400 mt-2">
                Withdrawal is a 2-step process: (1) Withdraw from Drift account, (2) Transfer to your futures wallet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
