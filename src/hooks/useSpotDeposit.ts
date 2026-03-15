import { useState, useCallback } from 'react';

interface DepositInitiateParams {
  amount: number;
  depositChain: 'ethereum' | 'solana';
  depositFromAddress: string;
}

interface DepositData {
  depositId: string;
  treasuryAddress: string;
  amount: number;
  depositChain: string;
  depositToken: string;
  destinationChain: string;
  destinationToken: string;
  tradingWalletAddress: string;
  expiresAt: string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

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

export function useSpotDeposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateDeposit = useCallback(async (params: DepositInitiateParams): Promise<DepositData | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/spot/deposit/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate deposit');
      }

      return data.data;
    } catch (err: any) {
      console.error('Failed to initiate deposit:', err);
      setError(err.message || 'Failed to initiate deposit');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiateDeposit,
    loading,
    error,
  };
}