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
  const getUSDTChain = (baseAsset: string): 'tron' | 'evm' | 'sol' => {
    const asset = baseAsset.toUpperCase();
    
    // Map assets to their preferred USDT chain
    if (asset === 'ETH' || asset === 'BTC') {
      return 'evm'; // Ethereum USDT for ETH and BTC pairs
    } else if (asset === 'SOL') {
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
   * Fetch balances from the API
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
      // Build query parameters
      const params = new URLSearchParams({
        assets: `${baseAsset},${quoteAsset}`,
      });

      if (chain) {
        params.append('chain', chain);
      }

      const url = `/api/users/${userId}/balances?${params.toString()}`;
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
        console.warn('[usePairBalances] No balances returned from API');
      }

      // Find balance for base asset (tokenIn - what you're selling/trading)
      const baseBalance = balances.find(
        (b: AssetBalance) => {
          const match = b.asset.toUpperCase() === baseAsset.toUpperCase();
          console.log(`[usePairBalances] Checking base asset: ${b.asset} === ${baseAsset}? ${match}`);
          return match;
        }
      );
      const tokenInValue = baseBalance ? parseFloat(baseBalance.available_balance || '0') : 0;
      console.log('[usePairBalances] Base asset balance:', { 
        baseAsset, 
        balance: baseBalance, 
        value: tokenInValue,
        allAssets: balances.map((b: AssetBalance) => b.asset)
      });
      setTokenIn(isNaN(tokenInValue) ? 0 : tokenInValue);

      // Find balance for quote asset (tokenOut - what you're buying with, typically USDT)
      const quoteBalance = balances.find(
        (b: AssetBalance) => {
          const match = b.asset.toUpperCase() === quoteAsset.toUpperCase();
          console.log(`[usePairBalances] Checking quote asset: ${b.asset} === ${quoteAsset}? ${match}`);
          return match;
        }
      );
      let tokenOutValue = quoteBalance ? parseFloat(quoteBalance.available_balance || '0') : 0;
      
      // If quote asset is USDT and we didn't find it in spot balances, check appropriate chain
      if (quoteAsset.toUpperCase() === 'USDT' && tokenOutValue === 0) {
        const usdtChain = getUSDTChain(baseAsset);
        console.log(`[usePairBalances] USDT not found in spot balances, checking ${usdtChain} wallet for ${baseAsset}-USDT pair...`);
        
        if (usdtChain === 'tron') {
          const tronUSDT = await fetchTronUSDT();
          if (tronUSDT > 0) {
            tokenOutValue = tronUSDT;
            console.log('[usePairBalances] Using USDT from Tron wallet:', tronUSDT);
          }
        } else if (usdtChain === 'evm' || usdtChain === 'sol') {
          // Try to fetch from the specific chain's balance
          console.log(`[usePairBalances] Fetching USDT from ${usdtChain} chain...`);
          const chainResponse = await fetch(`/api/users/${userId}/balances?assets=USDT&chain=${usdtChain}`);
          
          if (chainResponse.ok) {
            const chainData: BalancesResponse = await chainResponse.json();
            const chainBalances = Array.isArray(chainData) ? chainData : chainData.balances || [];
            const chainUSDT = chainBalances.find(b => b.asset.toUpperCase() === 'USDT');
            
            if (chainUSDT) {
              tokenOutValue = parseFloat(chainUSDT.available_balance || '0');
              console.log(`[usePairBalances] Using USDT from ${usdtChain} chain:`, tokenOutValue);
            }
          }
          
          // If still 0, fallback to Tron as last resort
          if (tokenOutValue === 0) {
            console.log('[usePairBalances] No USDT found on preferred chain, falling back to Tron...');
            const tronUSDT = await fetchTronUSDT();
            if (tronUSDT > 0) {
              tokenOutValue = tronUSDT;
              console.log('[usePairBalances] Using USDT from Tron wallet (fallback):', tronUSDT);
            }
          }
        }
      }
      
      console.log('[usePairBalances] Quote asset balance:', { 
        quoteAsset, 
        balance: quoteBalance, 
        value: tokenOutValue,
        allAssets: balances.map((b: AssetBalance) => b.asset)
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
