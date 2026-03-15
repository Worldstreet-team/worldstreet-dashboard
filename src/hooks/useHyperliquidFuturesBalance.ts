import { useState, useEffect, useCallback } from 'react';

interface FuturesPosition {
  coin: string;
  szi: number;
  entryPx: number;
  positionValue: number;
  returnOnEquity: number;
  unrealizedPnl: number;
  marginUsed: number;
}

interface UseHyperliquidFuturesBalanceResult {
  accountValue: number;
  totalMarginUsed: number;
  totalNtlPos: number;
  totalRawUsd: number;
  withdrawable: number;
  availableMargin: number;
  positions: FuturesPosition[];
  positionCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHyperliquidFuturesBalance(
  userId?: string, 
  enabled = true
): UseHyperliquidFuturesBalanceResult {
  const [accountValue, setAccountValue] = useState(0);
  const [totalMarginUsed, setTotalMarginUsed] = useState(0);
  const [totalNtlPos, setTotalNtlPos] = useState(0);
  const [totalRawUsd, setTotalRawUsd] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [availableMargin, setAvailableMargin] = useState(0);
  const [positions, setPositions] = useState<FuturesPosition[]>([]);
  const [positionCount, setPositionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/hyperliquid/futures/balance?userId=${userId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch futures balance');
      }

      const balanceData = data.data;
      setAccountValue(balanceData.accountValue);
      setTotalMarginUsed(balanceData.totalMarginUsed);
      setTotalNtlPos(balanceData.totalNtlPos);
      setTotalRawUsd(balanceData.totalRawUsd);
      setWithdrawable(balanceData.withdrawable);
      setAvailableMargin(balanceData.availableMargin);
      setPositions(balanceData.positions);
      setPositionCount(balanceData.positionCount);
    } catch (err: any) {
      console.error('Failed to fetch futures balance:', err);
      setError(err.message || 'Failed to fetch futures balance');
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    accountValue,
    totalMarginUsed,
    totalNtlPos,
    totalRawUsd,
    withdrawable,
    availableMargin,
    positions,
    positionCount,
    loading,
    error,
    refetch: fetchBalance
  };
}