import { useState, useEffect, useCallback } from 'react';
import { useDrift } from '@/app/context/driftContext';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

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

export function usePairBalances(
  userId: string | undefined,
  selectedPair: string,
  chain?: string,
  tokenAddress?: string
): UsePairBalancesReturn {
  const {
    spotPositions: driftSpotPositions,
    isLoading: loadingDrift,
    refreshPositions,
    walletBalance,
    summary,
    connection
  } = useDrift();

  const [tokenIn, setTokenIn] = useState<number>(0);
  const [tokenOut, setTokenOut] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Parse the trading pair (e.g., SOL-USDC)
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  const fetchBalances = useCallback(async () => {
    if (!summary?.publicAddress || !connection) {
      setTokenIn(0);
      setTokenOut(0);
      return;
    }

    setLoading(true);
    console.log('[usePairBalances] Refreshing balances for:', selectedPair, 'Chain:', chain);

    try {
      let baseAmount = 0;
      let quoteAmount = 0;

      // 1. Check Drift positions first
      if (driftSpotPositions) {
        const normalizedBase = baseAsset.toUpperCase();
        const normalizedQuote = quoteAsset.toUpperCase();

        driftSpotPositions.forEach(p => {
          const pName = p.marketName.toUpperCase();
          if (pName === normalizedBase || pName === `${normalizedBase}/USDC` || pName === `${normalizedBase}/USDT`) {
            baseAmount = p.amount;
          }
          if (pName === normalizedQuote) {
            quoteAmount = p.amount;
          }
        });
      }

      // 2. Fallbacks for Solana tokens (Drift or Wallet)
      if (chain === 'sol') {
        const userPubkey = new PublicKey(summary.publicAddress);

        // Handle Base Asset (e.g. TRUMP)
        if (baseAmount === 0) {
          if (baseAsset.toUpperCase() === 'SOL') {
            baseAmount = walletBalance;
          } else if (tokenAddress) {
            // Fetch balance from wallet's ATA if not on Drift
            try {
              const mint = new PublicKey(tokenAddress);
              const ata = getAssociatedTokenAddressSync(mint, userPubkey);
              const balResponse = await connection.getTokenAccountBalance(ata);
              baseAmount = balResponse.value.uiAmount || 0;
            } catch (err) {
              // Account likely doesn't exist (0 balance)
              baseAmount = 0;
            }
          }
        }

        // Handle Quote Asset (usually USDC/USDT)
        if (quoteAmount === 0) {
          if (quoteAsset.toUpperCase() === 'SOL') {
            quoteAmount = walletBalance;
          } else {
            // Usually we have standard Mints for USDC/USDT if we wanted to check wallet
            // But if it's on Drift, it should have been caught in step 1.
          }
        }
      }

      console.log(`[usePairBalances] Final balances: ${baseAsset}=${baseAmount}, ${quoteAsset}=${quoteAmount}`);

      setTokenIn(baseAmount);
      setTokenOut(quoteAmount);
      setError(null);
    } catch (err) {
      console.error('[usePairBalances] Error fetching balances:', err);
      setError('Failed to fetch token balances');
    } finally {
      setLoading(false);
    }
  }, [driftSpotPositions, baseAsset, quoteAsset, summary, connection, walletBalance, tokenAddress, chain]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleRefetch = async () => {
    await refreshPositions();
    await fetchBalances();
  };

  return {
    tokenIn,
    tokenOut,
    loading: loadingDrift || loading,
    error: error,
    refetch: handleRefetch,
  };
}
