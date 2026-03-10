import { useState, useCallback, useEffect } from "react";

interface UsdtBalanceData {
  balance: number;
  address: string | null;
  mint: string;
  decimals: number;
}

interface UseUsdtBalanceReturn {
  balance: number;
  address: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch user's USDT balance on Solana
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @param refreshInterval - Auto-refresh interval in ms (default: 30000 = 30s, 0 = disabled)
 */
export function useUsdtBalance(
  autoFetch: boolean = true,
  refreshInterval: number = 30000
): UseUsdtBalanceReturn {
  const [balance, setBalance] = useState<number>(0);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/solana/usdt-balance", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch USDT balance");
      }

      const data: { success: boolean; balance: number; address: string | null } =
        await response.json();

      if (data.success) {
        setBalance(data.balance);
        setAddress(data.address);
      } else {
        throw new Error("Invalid response from API");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch USDT balance";
      setError(errorMessage);
      console.error("useUsdtBalance error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchBalance();
    }
  }, [autoFetch, fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchBalance();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchBalance]);

  return {
    balance,
    address,
    loading,
    error,
    refetch: fetchBalance,
  };
}
