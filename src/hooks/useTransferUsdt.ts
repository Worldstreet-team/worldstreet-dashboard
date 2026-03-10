import { useState, useCallback } from "react";

interface TransferResponse {
  success: boolean;
  transactionHash?: string;
  from?: string;
  to?: string;
  amount?: number;
  message?: string;
}

interface UseTransferUsdtReturn {
  transfer: (userId: string, recipient: string, amount: number, pin: string) => Promise<string>;
  loading: boolean;
  error: string | null;
  transactionHash: string | null;
  clearError: () => void;
}

/**
 * Hook to transfer USDT for a user through the backend
 * Handles PIN verification and transaction signing on the backend
 */
export function useTransferUsdt(): UseTransferUsdtReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const transfer = useCallback(
    async (
      userId: string,
      recipient: string,
      amount: number,
      pin: string
    ): Promise<string> => {
      setLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        // Validate inputs
        if (!userId || !recipient || !amount || !pin) {
          throw new Error("All fields are required");
        }

        if (amount <= 0) {
          throw new Error("Amount must be greater than 0");
        }

        const response = await fetch(`/api/users/${userId}/transfer-usdt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin,
            recipient,
            amount,
          }),
        });

        const data: TransferResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Transfer failed");
        }

        if (!data.success) {
          throw new Error(data.message || "Transfer failed");
        }

        if (!data.transactionHash) {
          throw new Error("No transaction hash returned");
        }

        setTransactionHash(data.transactionHash);
        return data.transactionHash;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Transfer failed";
        setError(errorMessage);
        console.error("useTransferUsdt error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transfer,
    loading,
    error,
    transactionHash,
    clearError,
  };
}
