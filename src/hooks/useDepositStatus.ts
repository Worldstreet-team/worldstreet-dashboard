import { useState, useEffect, useCallback } from 'react';

interface DepositStatus {
  depositId: string;
  stage: 'initiated' | 'detected' | 'disbursing' | 'disbursed' | 'bridging' | 'completed' | 'failed' | 'expired';
  message: string;
  estimatedTimeRemaining: string | null;
  amount: number;
  depositChain: string;
  treasuryAddress: string;
  txHash: string | null;
  bridgeTxHash: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export function useDepositStatus(depositId: string | null, enabled = true) {
  const [status, setStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!depositId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/spot/deposit/status?depositId=${depositId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get deposit status');
      }

      const newStatus = data.data;
      setStatus(newStatus);

      // Auto-trigger bridge when disbursed
      if (newStatus.stage === 'disbursed' && status?.stage !== 'disbursed') {
        console.log('[Deposit Status] Auto-triggering bridge...');
        triggerBridge(depositId, newStatus.amount);
      }

      return newStatus;
    } catch (err: any) {
      console.error('Failed to get deposit status:', err);
      setError(err.message || 'Failed to get deposit status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [depositId, enabled, status?.stage]);

  const triggerBridge = useCallback(async (depositId: string, amount: number) => {
    try {
      const response = await fetch('/api/spot/deposit/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ depositId, amount }),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to trigger bridge:', data.error);
      } else {
        console.log('Bridge triggered successfully:', data.data);
      }
    } catch (err: any) {
      console.error('Failed to trigger bridge:', err);
    }
  }, []);

  // Poll every 5 seconds when deposit is active
  useEffect(() => {
    if (!depositId || !enabled) return;

    const interval = setInterval(() => {
      if (status?.stage && !['completed', 'failed', 'expired'].includes(status.stage)) {
        fetchStatus();
      }
    }, 5000);

    // Initial fetch
    fetchStatus();

    return () => clearInterval(interval);
  }, [depositId, enabled, fetchStatus, status?.stage]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  };
}