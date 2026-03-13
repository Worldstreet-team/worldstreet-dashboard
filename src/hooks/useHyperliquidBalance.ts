import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/app/context/walletContext';

interface HyperliquidBalance {
  coin: string;
  total: number;
  available: number;
  hold: number;
}

interface UseHyperliquidBalanceResult {
  balances: HyperliquidBalance[];
  usdcBalance: {
    total: number;
    available: number;
    hold: number;
  };
  accountValue: number;
  withdrawable: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHyperliquidBalance(userId?: string, enabled = true): UseHyperliquidBalanceResult {
  const { walletsGenerated, addresses, isLoading: walletsLoading } = useWallet();
  const [balances, setBalances] = useState<HyperliquidBalance[]>([]);
  const [usdcBalance, setUsdcBalance] = useState({ total: 0, available: 0, hold: 0 });
  const [accountValue, setAccountValue] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    // Wait until wallets are generated and addresses are populated
    if (!enabled || !userId || !walletsGenerated || !addresses?.ethereum) {
      if (!userId || !enabled) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useHyperliquidBalance] Fetching balance for user:', userId, 'with address:', addresses.ethereum);
      const response = await fetch(`/api/hyperliquid/balance?userId=${userId}`);
      
      // Handle the case where the API might still return 404 despite our checks
      if (response.status === 404) {
        setLoading(false);
        // We don't set an error here, just wait for next retry or manual refetch
        // as this usually means the DB record is just a bit late
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch balance');
      }

      setBalances(data.data.balances);
      setUsdcBalance(data.data.usdcBalance);
      setAccountValue(data.data.accountValue);
      setWithdrawable(data.data.withdrawable);
    } catch (err: any) {
      console.error('Failed to fetch Hyperliquid balance:', err);
      setError(err.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [userId, enabled, walletsGenerated, addresses]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balances,
    usdcBalance,
    accountValue,
    withdrawable,
    loading: loading || walletsLoading,
    error,
    refetch: fetchBalance
  };
}