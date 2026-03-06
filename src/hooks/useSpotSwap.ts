/**
 * Spot Swap Hook - Calls backend API routes for quoting and execution.
 *
 * Flow:
 *   1.  fetchQuote  →  POST /api/quote  →  backend calls LI.FI  →  returns quote data
 *   2.  executeSpotSwap  →  (Solana) Use DriftContext OR (EVM) POST /api/execute-trade
 *   3.  (optional) poll blockchain for confirmation via getSignatureStatuses
 *
 * The frontend NEVER calls LI.FI directly; the backend is the single source.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';
import { useWallet } from '@/app/context/walletContext';
import { useSwap } from '@/app/context/swapContext';
import { useDrift } from '@/app/context/driftContext';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SpotSwapParams {
  pair: string;       // e.g. "SOL-USDT"
  side: 'buy' | 'sell';
  amount: string;     // Human-readable amount the user typed
  slippage?: number;  // Optional percentage, default 3
}

export interface SpotSwapQuote {
  id: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  executionPrice: string;
  estimatedDuration: number;
  priceImpact: number;
  gasEstimate: string;
  route: string;
  /** Raw data from backend – kept for the execute call */
  _raw?: Record<string, any>;
}

export interface SpotSwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ─── Token Metadata ────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────

function getChainFromPair(pair: string): 'ethereum' | 'solana' {
  const [base] = pair.split('-');
  if (base === 'SOL') return 'solana';
  return 'ethereum';
}

function getChainLabel(pair: string): string | number {
  const chain = getChainFromPair(pair);
  return chain === 'solana' ? 1151111081099710 : 1;
}

function getTokenMeta(pair: string, chain: string) {
  const [base, quote] = pair.split('-');
  const baseMeta = TOKEN_META[chain]?.[base];
  const quoteMeta = TOKEN_META[chain]?.[quote];
  return {
    base: baseMeta?.address || '',
    quote: quoteMeta?.address || '',
    baseDecimals: baseMeta?.decimals ?? 18,
    quoteDecimals: quoteMeta?.decimals ?? 6,
  };
}

/** Convert human amount → smallest-unit string (no floating-point). */
function toSmallestUnit(amount: string, decimals: number): string {
  let value = amount.trim();
  if (!value || value === '.' || isNaN(Number(value))) return '0';
  const negative = value.startsWith('-');
  if (negative) value = value.slice(1);
  const [intPart = '0', fracPart = ''] = value.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  let result = (intPart + paddedFrac).replace(/^0+/, '') || '0';
  if (negative && result !== '0') result = '-' + result;
  return result;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSpotSwap() {
  const { user } = useAuth();
  const { addresses } = useWallet();
  const { placeSpotOrder, getSpotMarketIndexBySymbol } = useDrift();

  const [quote, setQuote] = useState<SpotSwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── fetchQuote ───────────────────────────────────────────────────────────

  const fetchQuote = useCallback(async (params: SpotSwapParams): Promise<SpotSwapQuote | null> => {
    setError(null);
    setQuote(null);
    setLoading(true);

    try {
      const chain = getChainFromPair(params.pair);
      const tokens = getTokenMeta(params.pair, chain);

      if (!user?.userId) throw new Error("User not authenticated");

      // Get the appropriate wallet address from encrypted wallet system
      const walletAddress = chain === 'solana' ? addresses?.solana : addresses?.ethereum;

      // Validate wallet address exists
      if (!walletAddress) {
        throw new Error(`Wallet not set up for ${chain === 'solana' ? 'Solana' : 'Ethereum'}. Please set up your wallet first.`);
      }

      // Determine from/to token based on buy/sell
      const fromTokenAddr = params.side === 'buy' ? tokens.quote : tokens.base;
      const toTokenAddr = params.side === 'buy' ? tokens.base : tokens.quote;
      const fromDecimals = params.side === 'buy' ? tokens.quoteDecimals : tokens.baseDecimals;
      const amountIn = toSmallestUnit(params.amount, fromDecimals);
      const slippage = (params.slippage ?? 3) / 100; // percentage → decimal

      console.log('[useSpotSwap] Fetching quote:', { pair: params.pair, side: params.side, amountIn, fromTokenAddr, toTokenAddr, chain, walletAddress });

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          fromChain: getChainLabel(params.pair),
          toChain: getChainLabel(params.pair),
          tokenIn: fromTokenAddr,
          tokenOut: toTokenAddr,
          amountIn,
          fromAddress: walletAddress,
          toAddress: walletAddress,
          slippage,
        }),
      });

      const data = await res.json();
      console.log('[useSpotSwap] Quote response:', data);

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to get quote');
      }

      // Parse the response from /api/quote
      const expectedOut = data.expectedOutput || data.expectedOut || '0';
      const toDecimals = params.side === 'buy' ? tokens.baseDecimals : tokens.quoteDecimals;

      // Compute human-readable values
      const fromAmountHuman = params.amount;
      const toAmountHuman = (parseFloat(expectedOut) / Math.pow(10, toDecimals)).toFixed(6);
      const toAmountMinHuman = data.toAmountMin
        ? (parseFloat(data.toAmountMin) / Math.pow(10, toDecimals)).toFixed(6)
        : toAmountHuman;

      const fromAmountNum = parseFloat(fromAmountHuman);
      const toAmountNum = parseFloat(toAmountHuman) || 1;
      const executionPrice = params.side === 'buy'
        ? (fromAmountNum / toAmountNum).toFixed(6)
        : (toAmountNum / fromAmountNum).toFixed(6);

      // Extract tool name safely (backend might return string or object)
      const routeName = typeof data.route === "string"
        ? data.route
        : (data.route?.tool || data.route?.name || "LI.FI");

      const spotQuote: SpotSwapQuote = {
        id: `quote-${Date.now()}`,
        fromAmount: fromAmountHuman,
        toAmount: toAmountHuman,
        toAmountMin: toAmountMinHuman,
        executionPrice,
        estimatedDuration: 30,
        priceImpact: data.priceImpact || 0,
        gasEstimate: data.gasEstimate || '0',
        route: routeName,
        _raw: data,
      };

      setQuote(spotQuote);
      return spotQuote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch quote';
      console.error('[useSpotSwap] Quote error:', msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, addresses]);

  // ── executeSpotSwap (Redirect to Client-Side Signing or Drift) ────────────
  const { executeSwap: contextExecuteSwap } = useSwap();

  const executeSpotSwap = useCallback(async (
    params: SpotSwapParams,
    pin: string
  ): Promise<SpotSwapResult> => {
    setError(null);
    setExecuting(true);

    try {
      if (!user?.userId) throw new Error("User not authenticated");

      const chain = getChainFromPair(params.pair);

      // DRIFT INTEGRATION: If it's Solana, use Drift for spot trading
      if (chain === 'solana') {
        console.log('[useSpotSwap] Using Drift for Solana spot trade');
        const [baseAsset] = params.pair.split('-');

        // Map asset to Drift market index
        const marketIndex = getSpotMarketIndexBySymbol(baseAsset);

        if (marketIndex === undefined) {
          throw new Error(`Market not found on Drift: ${baseAsset}`);
        }

        const amountNum = parseFloat(params.amount);
        const result = await placeSpotOrder(
          marketIndex,
          params.side === 'buy' ? 'buy' : 'sell',
          amountNum
        );

        if (!result.success) {
          throw new Error(result.error || 'Drift spot order failed');
        }

        return { success: true, txHash: result.txSignature };
      }

      // LEGACY LI.FI/BACKEND FLOW for other chains
      if (!quote) throw new Error('No quote available. Please fetch a quote first.');

      // 1. Prepare the execution parameters
      const chainLabel = getChainLabel(params.pair);
      const tokens = getTokenMeta(params.pair, chain);
      const fromTokenAddr = params.side === 'buy' ? tokens.quote : tokens.base;
      const toTokenAddr = params.side === 'buy' ? tokens.base : tokens.quote;

      console.log('[useSpotSwap] Redirecting execution to SwapContext for client-side signing...', {
        pair: params.pair,
        side: params.side
      });

      // 2. Map the spot quote to a SwapQuote format that contextExecuteSwap expects
      const mappedQuote = {
        fromChain: chain === 'solana' ? 'solana' : 'ethereum',
        toChain: chain === 'solana' ? 'solana' : 'ethereum',
        fromToken: { address: fromTokenAddr, decimals: 18 } as any, // Simplified
        toToken: { address: toTokenAddr, decimals: 18 } as any,
        fromAmount: quote._raw?.amountIn || quote.fromAmount,
        toAmount: quote.toAmount,
        transactionRequest: quote._raw?.executionData || quote._raw?.transactionRequest,
      } as any;

      if (!mappedQuote.transactionRequest) {
        throw new Error("Execution data still missing from quote. Please try fetching a new quote.");
      }

      // 3. Call the context execution
      const txHash = await contextExecuteSwap(mappedQuote, pin);

      // 4. Update local history/state
      const [baseToken, quoteToken] = params.pair.split('-');

      fetch('/api/spot/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          txHash,
          chainId: typeof chainLabel === 'number' ? chainLabel : 1,
          pair: params.pair,
          side: params.side.toUpperCase(),
          fromTokenAddress: fromTokenAddr,
          fromTokenSymbol: params.side === 'buy' ? quoteToken : baseToken,
          fromAmount: quote.fromAmount,
          toTokenAddress: toTokenAddr,
          toTokenSymbol: params.side === 'buy' ? baseToken : quoteToken,
          toAmount: quote.toAmount,
          executionPrice: quote.executionPrice,
          slippagePercent: params.slippage || 3,
          status: 'CONFIRMED',
        }),
      }).catch(err => console.warn('[useSpotSwap] Backend tracking failed:', err));

      return { success: true, txHash };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error('[useSpotSwap] Execution Error:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setExecuting(false);
    }
  }, [quote, user, contextExecuteSwap, placeSpotOrder, getSpotMarketIndexBySymbol]);

  return {
    quote,
    fetchQuote,
    executeSpotSwap,
    loading,
    executing,
    error,
  };
}
