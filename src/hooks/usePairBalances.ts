import { useState, useEffect, useCallback } from 'react';

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
 * Tron balance response structure
 */
interface TronBalanceResponse {
  success: boolean;
  balance: {
    trx: number;
    tokens: Array<{
      symbol: string;
      balance: number;
      decimals: number;
    }>;
  };
}

/**
 * Hook return type
 */
interface UsePairBalancesReturn {
  tokenIn: number;
  tokenOut: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage balances for a trading pair
 * 
 * @param userId - User ID to fetch balances for
 * @param selectedPair - Trading pair in format "BTC-USDT"
 * @param chain - Blockchain network (e.g., "ethereum", "solana", "bitcoin")
 * @returns Object containing tokenIn balance, tokenOut balance, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { tokenIn, tokenOut, loading, refetch } = usePairBalances(
 *   user?.userId,
 *   'BTC-USDT',
 *   'ethereum'
 * );
 * ```
 */
export function usePairBalances(
  userId: string | undefined,
  selectedPair: string,
  chain?: string
): UsePairBalancesReturn {
  const [tokenIn, setTokenIn] = useState<number>(0);
  const [tokenOut, setTokenOut] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parse the trading pair
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  /**
   * Determine which chain to use for USDT based on the base asset
   * BTC, ETH -> Use EVM USDT (Ethereum)
   * SOL -> Use Solana USDT
   * Default -> Use Tron USDT
   */
  const getUSDTChain = (chain: string): 'tron' | 'evm' | 'sol' => {
    const asset = chain.toUpperCase();
    
    // Map assets to their preferred USDT chain
    if (asset === 'evm' || asset === 'btc') {
      return 'evm'; // Ethereum USDT for ETH and BTC pairs
    } else if (asset === 'sol') {
      return 'sol'; // Solana USDT for SOL pairs
    }
    
    return 'tron'; // Default to Tron USDT
  };

  /**
   * Fetch USDT balance from Tron wallet
   */
  const fetchTronUSDT = async (): Promise<number> => {
    try {
      const response = await fetch('/api/tron/balance');
      
      if (!response.ok) {
        console.log('[usePairBalances] Tron balance API error:', response.status);
        return 0;
      }

      const data: TronBalanceResponse = await response.json();
      
      if (!data.success) {
        console.log('[usePairBalances] Tron balance API returned error');
        return 0;
      }

      // Find USDT token in the balance
      const usdtToken = data.balance.tokens.find(
        token => token.symbol.toUpperCase() === 'USDT'
      );

      if (usdtToken) {
        console.log('[usePairBalances] Found USDT in Tron wallet:', usdtToken.balance);
        return usdtToken.balance;
      }

      return 0;
    } catch (err) {
      console.error('[usePairBalances] Error fetching Tron USDT:', err);
      return 0;
    }
  };

  /**
   * Fetch balances from the API (backend via Next.js proxy)
   */
  const fetchBalances = useCallback(async () => {
    // Reset if no user
    if (!userId) {
      console.log('[usePairBalances] No userId, resetting balances');
      setTokenIn(0);
      setTokenOut(0);
      setLoading(false);
      setError(null);
      return;
    }

    console.log('[usePairBalances] Fetching balances:', { userId, baseAsset, quoteAsset, chain });
    setLoading(true);
    setError(null);

    try {
      // Call Next.js API route which proxies to backend
      // Backend returns ALL balances with real-time RPC data
      const url = `/api/users/${userId}/balances`;
      console.log('[usePairBalances] Fetching from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch balances: ${response.statusText}`);
      }

      const data: BalancesResponse = await response.json();
      console.log('[usePairBalances] API Response:', data);

      const balances = Array.isArray(data) ? data : data.balances || [];
      console.log('[usePairBalances] Parsed balances:', balances);

      if (balances.length === 0) {
        console.warn('[usePairBalances] No balances returned from backend');
      }

      // Determine which chain to use for USDT based on the base asset
      const usdtChain = getUSDTChain(baseAsset);
      console.log('[usePairBalances] USDT chain for', baseAsset, ':', usdtChain);

      // Find balance for base asset (tokenIn - what you're selling/trading)
      // Match by asset name and chain
      const baseBalance = balances.find(
        (b: AssetBalance) => {
          const matchesAsset = b.asset.toUpperCase() === baseAsset.toUpperCase();
          const matchesChain = chain ? b.chain.toLowerCase() === chain.toLowerCase() : true;
          console.log(`[usePairBalances] Checking base: ${b.asset}(${b.chain}) === ${baseAsset}(${chain})? asset=${matchesAsset}, chain=${matchesChain}`);
          return matchesAsset && matchesChain;
        }
      );
      const tokenInValue = baseBalance ? parseFloat(baseBalance.available_balance || '0') : 0;
      console.log('[usePairBalances] Base asset balance:', { 
        baseAsset, 
        chain,
        balance: baseBalance, 
        value: tokenInValue,
        allAssets: balances.map((b: AssetBalance) => `${b.asset}(${b.chain})`)
      });
      setTokenIn(isNaN(tokenInValue) ? 0 : tokenInValue);

      // Find balance for quote asset (tokenOut - what you're buying with, typically USDT)
      // For USDT, match both asset AND the correct chain
      const quoteBalance = balances.find(
        (b: AssetBalance) => {
          if (quoteAsset.toUpperCase() === 'USDT') {
            const matchesAsset = b.asset.toUpperCase() === 'USDT';
            const matchesChain = b.chain.toLowerCase() === usdtChain.toLowerCase();
            console.log(`[usePairBalances] Checking USDT: ${b.asset}(${b.chain}) expected=${usdtChain}, matches=${matchesAsset && matchesChain}`);
            return matchesAsset && matchesChain;
          }
          const matchesAsset = b.asset.toUpperCase() === quoteAsset.toUpperCase();
          const matchesChain = chain ? b.chain.toLowerCase() === chain.toLowerCase() : true;
          console.log(`[usePairBalances] Checking quote: ${b.asset}(${b.chain}) === ${quoteAsset}(${chain})? asset=${matchesAsset}, chain=${matchesChain}`);
          return matchesAsset && matchesChain;
        }
      );
      let tokenOutValue = quoteBalance ? parseFloat(quoteBalance.available_balance || '0') : 0;
      
      // If quote asset is USDT and we didn't find it with the expected chain, try fallback
      if (quoteAsset.toUpperCase() === 'USDT' && tokenOutValue === 0) {
        console.log(`[usePairBalances] USDT not found on ${usdtChain} chain, trying fallback...`);
        
        // Try Tron as fallback
        const tronUSDT = await fetchTronUSDT();
        if (tronUSDT > 0) {
          tokenOutValue = tronUSDT;
          console.log('[usePairBalances] Using USDT from Tron wallet (fallback):', tronUSDT);
        } else {
          // Try any USDT balance as last resort
          const anyUSDT = balances.find((b: AssetBalance) => b.asset.toUpperCase() === 'USDT');
          if (anyUSDT) {
            tokenOutValue = parseFloat(anyUSDT.available_balance || '0');
            console.log('[usePairBalances] Using any USDT balance (last resort):', tokenOutValue, 'from chain:', anyUSDT.chain);
          }
        }
      }
      
      console.log('[usePairBalances] Quote asset balance:', { 
        quoteAsset, 
        expectedChain: usdtChain,
        balance: quoteBalance, 
        value: tokenOutValue,
        allAssets: balances.map((b: AssetBalance) => `${b.asset}(${b.chain})`)
      });
      setTokenOut(isNaN(tokenOutValue) ? 0 : tokenOutValue);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(errorMessage);
      console.error('[usePairBalances] Error:', err);
      
      // Set to 0 on error (no dummy data)
      setTokenIn(0);
      setTokenOut(0);
    } finally {
      setLoading(false);
    }
  }, [userId, baseAsset, quoteAsset, chain]);

  // Fetch balances when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    tokenIn,
    tokenOut,
    loading,
    error,
    refetch: fetchBalances,
  };
}
