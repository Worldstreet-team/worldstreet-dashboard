/**
 * Backend Spot Trading Hook
 * Uses the existing backend API at https://trading.watchup.site
 * 
 * Flow:
 * 1. fetchQuote → POST /api/spot/quote → backend handles Li.Fi quote
 * 2. executeSwap → POST /api/spot/execute → backend signs & submits transaction
 * 3. Backend handles all wallet encryption/decryption and transaction signing
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';

// Token metadata for address resolution
const TOKEN_META: Record<string, Record<string, { address: string; decimals: number }>> = {
  ethereum: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  },
  solana: {
    SOL: { address: '11111111111111111111111111111111', decimals: 9 },
    WSOL: { address: 'So11111111111111111111111111111111111111112', decimals: 9 },
    USDT: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    USDC: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  },
};

export interface BackendQuote {
  toAmount: string;
  toAmountMin: string;
  priceImpact: number;
  gasEstimate: string;
  tool: string;
  route: string;
  transactionRequest: any;
}

export interface BackendExecuteResult {
  status: string;
  txHash: string;
  fromChain: string;
  toChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  executionPrice: number;
  routeProvider: string;
  tool: string;
}

export function useBackendSpotTrading() {
  const { user } = useAuth();
  
  const [quote, setQuote] = useState<BackendQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch quote from backend
   */
  const fetchQuote = useCallback(async (params: {
    pair: string;
    side: 'buy' | 'sell';
    amount: string;
    chain: string; // 'sol' or 'evm'
  }): Promise<BackendQuote | null> => {
    setError(null);
    setQuote(null);
    setLoading(true);

    try {
      if (!user?.userId) {
        throw new Error('User not authenticated');
      }

      const [baseAsset, quoteAsset] = params.pair.split('-');
      const chainType = params.chain === 'sol' ? 'solana' : 'ethereum';
      const chainMeta = TOKEN_META[chainType];

      // Get token addresses
      const fromTokenMeta = params.side === 'buy' ? chainMeta[quoteAsset] : chainMeta[baseAsset];
      const toTokenMeta = params.side === 'buy' ? chainMeta[baseAsset] : chainMeta[quoteAsset];

      if (!fromTokenMeta || !toTokenMeta) {
        throw new Error('Token not supported');
      }

      // Convert amount to smallest unit
      const decimals = fromTokenMeta.decimals;
      const [intPart = '0', fracPart = ''] = params.amount.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';

      console.log('[BackendSpotTrading] Fetching quote:', {
        pair: params.pair,
        side: params.side,
        chain: chainType,
        fromToken: fromTokenMeta.address,
        toToken: toTokenMeta.address,
        rawAmount,
      });

      const response = await fetch('/api/spot/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          fromChain: chainType === 'solana' ? 'SOL' : 'ETH',
          toChain: chainType === 'solana' ? 'SOL' : 'ETH',
          tokenIn: fromTokenMeta.address,
          tokenOut: toTokenMeta.address,
          amountIn: rawAmount,
          slippage: 0.005, // 0.5%
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get quote');
      }

      console.log('[BackendSpotTrading] Quote received:', data);

      setQuote(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch quote';
      console.error('[BackendSpotTrading] Quote error:', msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Execute swap via backend
   * Backend handles all signing and transaction submission
   */
  const executeSwap = useCallback(async (params: {
    pair: string;
    side: 'buy' | 'sell';
    amount: string;
    chain: string;
  }): Promise<BackendExecuteResult | null> => {
    setError(null);
    setExecuting(true);

    try {
      if (!user?.userId) {
        throw new Error('User not authenticated');
      }

      if (!quote) {
        throw new Error('No quote available. Please fetch a quote first.');
      }

      const [baseAsset, quoteAsset] = params.pair.split('-');
      const chainType = params.chain === 'sol' ? 'solana' : 'ethereum';
      const chainMeta = TOKEN_META[chainType];

      // Get token addresses
      const fromTokenMeta = params.side === 'buy' ? chainMeta[quoteAsset] : chainMeta[baseAsset];
      const toTokenMeta = params.side === 'buy' ? chainMeta[baseAsset] : chainMeta[quoteAsset];

      if (!fromTokenMeta || !toTokenMeta) {
        throw new Error('Token not supported');
      }

      // Convert amount to smallest unit
      const decimals = fromTokenMeta.decimals;
      const [intPart = '0', fracPart = ''] = params.amount.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';

      console.log('[BackendSpotTrading] Executing swap:', {
        pair: params.pair,
        side: params.side,
        chain: chainType,
        fromToken: fromTokenMeta.address,
        toToken: toTokenMeta.address,
        rawAmount,
      });

      const response = await fetch('/api/spot/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          fromChain: chainType === 'solana' ? 'sol' : 'eth',
          toChain: chainType === 'solana' ? 'sol' : 'eth',
          tokenIn: fromTokenMeta.address,
          tokenOut: toTokenMeta.address,
          amountIn: rawAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to execute swap');
      }

      console.log('[BackendSpotTrading] Swap executed:', data);

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error('[BackendSpotTrading] Execute error:', msg);
      setError(msg);
      return null;
    } finally {
      setExecuting(false);
    }
  }, [user, quote]);

  return {
    quote,
    fetchQuote,
    executeSwap,
    loading,
    executing,
    error,
  };
}
