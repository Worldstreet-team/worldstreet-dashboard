import { useQuery } from '@tanstack/react-query';

/**
 * Balance data for a single asset
 */
interface AssetBalance {
  asset: string;
  chain: string;
  available_balance: string;
  locked_balance: string;
  total_balance: string;
}

/**
 * API response structure
 */
interface BalancesResponse {
  balances?: AssetBalance[];
}

/**
 * Hook return type
 */
interface UsePairBalancesQueryReturn {
  tokenIn: number;
  tokenOut: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

/**
 * Fetch balances from API
 */
async function fetchPairBalances(
  userId: string,
  baseAsset: string,
  quoteAsset: string,
  chain?: string,
  tokenAddress?: string
): Promise<{ tokenIn: number; tokenOut: number }> {
  const params = new URLSearchParams({
    assets: `${baseAsset},${quoteAsset}`,
  });

  if (chain) {
    params.append('chain', chain);
  }

  const response = await fetch(`/api/users/${userId}/balances?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data: BalancesResponse = await response.json();
  const balances = Array.isArray(data) ? data : data.balances || [];

  // Find balance for base asset (tokenIn)
  const baseBalance = balances.find(
    (b: AssetBalance) => b.asset.toUpperCase() === baseAsset.toUpperCase()
  );
  let tokenIn = baseBalance ? parseFloat(baseBalance.available_balance) : 0;
  
  // If base asset not found and tokenAddress provided, fetch from blockchain
  const standardTokens = ['SOL', 'SOLANA', 'ETH', 'ETHEREUM', 'BTC', 'BITCOIN', 'USDT', 'USDC', 'TRX', 'TRON'];
  if (tokenIn === 0 && !standardTokens.includes(baseAsset.toUpperCase()) && tokenAddress && chain) {
    const tokenBalanceResponse = await fetch(
      `/api/users/${userId}/token-balance?tokenAddress=${tokenAddress}&chain=${chain}`
    );
    if (tokenBalanceResponse.ok) {
      const tokenData = await tokenBalanceResponse.json();
      if (tokenData.success) {
        tokenIn = tokenData.balance;
      }
    }
  }

  // Find balance for quote asset (tokenOut)
  const quoteBalance = balances.find(
    (b: AssetBalance) => b.asset.toUpperCase() === quoteAsset.toUpperCase()
  );
  const tokenOut = quoteBalance ? parseFloat(quoteBalance.available_balance) : 0;

  return { tokenIn, tokenOut };
}

/**
 * Custom hook with React Query for fetching and caching pair balances
 * 
 * NOTE: Requires @tanstack/react-query to be installed:
 * npm install @tanstack/react-query
 * 
 * Features:
 * - Automatic caching with 30s stale time
 * - Auto-refetch on window focus
 * - Auto-refetch every 60s
 * - Optimistic updates support
 * - Custom token support via tokenAddress
 * 
 * @param userId - User ID to fetch balances for
 * @param selectedPair - Trading pair in format "BTC-USDT"
 * @param chain - Blockchain network (e.g., "ethereum", "solana", "bitcoin")
 * @param tokenAddress - Optional: mint/contract address for custom tokens
 * @returns Object containing tokenIn balance, tokenOut balance, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { tokenIn, tokenOut, loading, refetch } = usePairBalancesQuery(
 *   user?.userId,
 *   'BTC-USDT',
 *   'ethereum',
 *   '0x...' // Optional: for custom tokens
 * );
 * 
 * // Refetch after trade execution
 * await executeTrade();
 * refetch();
 * ```
 */
export function usePairBalancesQuery(
  userId: string | undefined,
  selectedPair: string,
  chain?: string,
  tokenAddress?: string
): UsePairBalancesQueryReturn {
  // Parse the trading pair
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['pairBalances', userId, baseAsset, quoteAsset, chain, tokenAddress],
    queryFn: () => fetchPairBalances(userId!, baseAsset, quoteAsset, chain, tokenAddress),
    enabled: !!userId, // Only fetch if userId exists
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  return {
    tokenIn: data?.tokenIn ?? 0,
    tokenOut: data?.tokenOut ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => { refetch(); },
    isRefetching,
  };
}

/**
 * Invalidate pair balances cache (useful after trades)
 * 
 * @example
 * ```tsx
 * import { useQueryClient } from '@tanstack/react-query';
 * 
 * const queryClient = useQueryClient();
 * 
 * // After trade execution
 * await executeTrade();
 * queryClient.invalidateQueries({ queryKey: ['pairBalances'] });
 * ```
 */
export const PAIR_BALANCES_QUERY_KEY = 'pairBalances';
