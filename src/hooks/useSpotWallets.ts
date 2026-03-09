import { useState, useEffect, useCallback } from 'react';

/**
 * Wallet data structure from backend
 */
interface SpotWallet {
  asset: string;
  chain: string;
  public_address: string;
}

/**
 * Hook return type
 */
interface UseSpotWalletsReturn {
  wallets: SpotWallet[];
  getWalletAddress: (chain: string) => string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch spot wallet addresses from backend
 * 
 * @param userId - User ID to fetch wallets for
 * @returns Object containing wallets array, helper function to get address by chain, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { getWalletAddress, loading } = useSpotWallets(user?.userId);
 * const solAddress = getWalletAddress('sol');
 * const evmAddress = getWalletAddress('evm');
 * ```
 */
export function useSpotWallets(
  userId: string | undefined
): UseSpotWalletsReturn {
  const [wallets, setWallets] = useState<SpotWallet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch wallets from the backend API
   */
  const fetchWallets = useCallback(async () => {
    // Reset if no user
    if (!userId) {
      console.log('[useSpotWallets] No userId, resetting wallets');
      setWallets([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('[useSpotWallets] Fetching wallets for user:', userId);
    setLoading(true);
    setError(null);

    try {
      const url = `/api/users/${userId}/wallets`;
      console.log('[useSpotWallets] Fetching from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch wallets: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useSpotWallets] API Response:', data);

      // Backend returns array of wallet objects
      const walletsArray = Array.isArray(data) ? data : data.wallets || [];
      console.log('[useSpotWallets] Parsed wallets:', walletsArray);

      setWallets(walletsArray);

      if (walletsArray.length === 0) {
        console.warn('[useSpotWallets] No wallets found for user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallets';
      setError(errorMessage);
      console.error('[useSpotWallets] Error:', err);
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Get wallet address for a specific chain
   * Returns the first wallet found for that chain
   */
  const getWalletAddress = useCallback((chain: string): string | null => {
    const wallet = wallets.find(
      w => w.chain.toLowerCase() === chain.toLowerCase()
    );
    
    if (wallet) {
      console.log(`[useSpotWallets] Found wallet for ${chain}:`, wallet.public_address);
      return wallet.public_address;
    }
    
    console.warn(`[useSpotWallets] No wallet found for chain: ${chain}`);
    return null;
  }, [wallets]);

  // Fetch wallets when userId changes
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return {
    wallets,
    getWalletAddress,
    loading,
    error,
    refetch: fetchWallets,
  };
}
