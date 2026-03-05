/**
 * Spot Swap Hook - Integrates LI.FI swaps with spot trading
 * Uses existing swapContext for quote fetching and execution
 */

import { useState, useCallback } from 'react';
import { useSwap } from '@/app/context/swapContext';
import { useAuth } from '@/app/context/authContext';
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';

export interface SpotSwapParams {
  pair: string; // e.g., "BTC-USDT"
  side: 'buy' | 'sell';
  amount: string; // Human readable amount
  slippage?: number; // Optional, defaults to 0.5%
}

export interface SpotSwapQuote {
  id: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  executionPrice: string;
  estimatedDuration: number;
  gasCosts: Array<{
    amount: string;
    amountUSD: string;
    token: {
      symbol: string;
      decimals: number;
    };
  }>;
  feeCosts: Array<{
    amount: string;
    amountUSD: string;
    name: string;
  }>;
  route: string; // DEX/Bridge name
}

export interface SpotSwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useSpotSwap() {
  const { user } = useAuth();
  const { address: solAddress } = useSolana();
  const { address: evmAddress } = useEvm();
  const { getQuote, executeSwap, quoteLoading, executing } = useSwap();

  const [quote, setQuote] = useState<SpotSwapQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get token addresses for a trading pair
   */
  const getTokenAddresses = useCallback((pair: string, chain: 'ethereum' | 'solana') => {
    const [base, quote] = pair.split('-');
    
    // Token address mappings
    const TOKEN_ADDRESSES = {
      ethereum: {
        ETH: '0x0000000000000000000000000000000000000000',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      solana: {
        SOL: '11111111111111111111111111111111',
        WSOL: 'So11111111111111111111111111111111111111112',
        USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      },
    };

    return {
      base: TOKEN_ADDRESSES[chain][base as keyof typeof TOKEN_ADDRESSES[typeof chain]] || '',
      quote: TOKEN_ADDRESSES[chain][quote as keyof typeof TOKEN_ADDRESSES[typeof chain]] || '',
    };
  }, []);

  /**
   * Determine chain from pair
   */
  const getChainFromPair = useCallback((pair: string): 'ethereum' | 'solana' => {
    const [base] = pair.split('-');
    if (base === 'SOL') return 'solana';
    if (base === 'ETH' || base === 'BTC') return 'ethereum';
    return 'ethereum'; // Default
  }, []);

  /**
   * Fetch swap quote
   */
  const fetchQuote = useCallback(async (params: SpotSwapParams): Promise<SpotSwapQuote | null> => {
    setError(null);
    setQuote(null);

    try {
      const [base, quote] = params.pair.split('-');
      const chain = getChainFromPair(params.pair);
      const tokens = getTokenAddresses(params.pair, chain);

      // Determine from/to based on buy/sell
      const fromToken = params.side === 'buy' ? tokens.quote : tokens.base;
      const toToken = params.side === 'buy' ? tokens.base : tokens.quote;

      // Get user address for the chain
      const userAddress = chain === 'solana' ? solAddress : evmAddress;
      
      if (!userAddress) {
        throw new Error(`${chain === 'solana' ? 'Solana' : 'Ethereum'} wallet not connected`);
      }

      // Convert amount to smallest unit (assuming 6 decimals for USDT, 18 for others)
      const decimals = quote === 'USDT' ? 6 : 18;
      const amountInSmallestUnit = (parseFloat(params.amount) * Math.pow(10, decimals)).toString();

      // Fetch quote from LI.FI
      const lifiQuote = await getQuote({
        fromChain: chain,
        toChain: chain, // Same chain swaps only
        fromToken,
        toToken,
        fromAmount: amountInSmallestUnit,
        fromAddress: userAddress,
        toAddress: userAddress,
      });

      if (!lifiQuote) {
        throw new Error('Failed to get quote from LI.FI');
      }

      // Calculate execution price
      const fromAmountNum = parseFloat(lifiQuote.fromAmount) / Math.pow(10, lifiQuote.fromToken.decimals);
      const toAmountNum = parseFloat(lifiQuote.toAmount) / Math.pow(10, lifiQuote.toToken.decimals);
      const executionPrice = (fromAmountNum / toAmountNum).toFixed(6);

      const spotQuote: SpotSwapQuote = {
        id: lifiQuote.id,
        fromAmount: fromAmountNum.toFixed(6),
        toAmount: toAmountNum.toFixed(6),
        toAmountMin: (parseFloat(lifiQuote.toAmountMin) / Math.pow(10, lifiQuote.toToken.decimals)).toFixed(6),
        executionPrice,
        estimatedDuration: lifiQuote.estimatedDuration,
        gasCosts: lifiQuote.gasCosts.map(cost => ({
          amount: (parseFloat(cost.amount) / Math.pow(10, cost.token.decimals)).toFixed(6),
          amountUSD: cost.amountUSD,
          token: {
            symbol: cost.token.symbol,
            decimals: cost.token.decimals,
          },
        })),
        feeCosts: lifiQuote.feeCosts.map(cost => ({
          amount: (parseFloat(cost.amount) / Math.pow(10, cost.token.decimals)).toFixed(6),
          amountUSD: cost.amountUSD,
          name: cost.name,
        })),
        route: lifiQuote.toolDetails?.name || 'Unknown DEX',
      };

      setQuote(spotQuote);
      return spotQuote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quote';
      setError(errorMessage);
      return null;
    }
  }, [getQuote, getChainFromPair, getTokenAddresses, solAddress, evmAddress]);

  /**
   * Execute swap with PIN
   */
  const executeSpotSwap = useCallback(async (
    params: SpotSwapParams,
    pin: string
  ): Promise<SpotSwapResult> => {
    setError(null);

    try {
      if (!quote) {
        throw new Error('No quote available. Please fetch a quote first.');
      }

      const [base, quoteToken] = params.pair.split('-');
      const chain = getChainFromPair(params.pair);
      const tokens = getTokenAddresses(params.pair, chain);

      // Get the full LI.FI quote again (needed for transaction data)
      const userAddress = chain === 'solana' ? solAddress : evmAddress;
      if (!userAddress) {
        throw new Error(`${chain === 'solana' ? 'Solana' : 'Ethereum'} wallet not connected`);
      }

      const fromToken = params.side === 'buy' ? tokens.quote : tokens.base;
      const toToken = params.side === 'buy' ? tokens.base : tokens.quote;
      const decimals = quoteToken === 'USDT' ? 6 : 18;
      const amountInSmallestUnit = (parseFloat(params.amount) * Math.pow(10, decimals)).toString();

      const lifiQuote = await getQuote({
        fromChain: chain,
        toChain: chain,
        fromToken,
        toToken,
        fromAmount: amountInSmallestUnit,
        fromAddress: userAddress,
        toAddress: userAddress,
      });

      if (!lifiQuote) {
        throw new Error('Failed to get quote for execution');
      }

      // Execute the swap
      const txHash = await executeSwap(lifiQuote, pin);

      // Save to database with full details
      const saveResponse = await fetch('/api/spot/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          pair: params.pair,
          side: params.side,
          txHash,
          chain,
          fromAmount: lifiQuote.fromAmount,
          toAmount: lifiQuote.toAmount,
          executionPrice: quote.executionPrice,
          fromToken: lifiQuote.fromToken,
          toToken: lifiQuote.toToken,
          gasCost: lifiQuote.gasCosts[0],
          feeCost: lifiQuote.feeCosts[0],
          status: 'PENDING',
        }),
      });

      if (!saveResponse.ok) {
        console.warn('[useSpotSwap] Failed to save trade to database');
      }

      // Start monitoring transaction status
      const chainId = chain === 'ethereum' ? 1 : 1151111081099710;
      fetch('/api/spot/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          fromChainId: chainId,
          toChainId: chainId,
        }),
      }).catch(err => console.warn('[useSpotSwap] Failed to start monitoring:', err));

      return {
        success: true,
        txHash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [quote, getQuote, executeSwap, getChainFromPair, getTokenAddresses, solAddress, evmAddress, user]);

  return {
    quote,
    fetchQuote,
    executeSpotSwap,
    loading: quoteLoading,
    executing,
    error,
  };
}
