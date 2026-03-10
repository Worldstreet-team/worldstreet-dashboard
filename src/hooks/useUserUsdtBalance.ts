import { useState, useCallback, useEffect } from "react";

interface UseUserUsdtBalanceReturn {
  balance: number;
  address: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch any user's USDT balance on Solana by user ID
 * @param userId - The MongoDB user ID
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @param refreshInterval - Auto-refresh interval in ms (default: 30000 = 30s, 0 = disabled)
 */
export function useUserUsdtBalance(
  userId: string | null,
  autoFetch: boolean = true,
  refreshInterval: number = 30000
): UseUserUsdtBalanceReturn {
  const [balance, setBalance] = useState<number>(0);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/solana-usdt-balance`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch USDT balance");
      }

      const data: {
        success: boolean;
        balance: number;
        address: string | null;
      } = await response.json();

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
      console.error("useUserUsdtBalance error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchBalance();
    }
  }, [autoFetch, userId, fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && userId) {
      const interval = setInterval(() => {
        fetchBalance();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, userId, fetchBalance]);

  return {
    balance,
    address,
    loading,
    error,
    refetch: fetchBalance,
  };
}
