/**
 * Spot Swap Execution Service
 *
 * Calls the backend API routes (/api/quote and /api/execute-trade) to
 * perform swaps. The backend handles LI.FI interaction, signing, and
 * transaction submission.
 *
 * This class is used server-side or in API route handlers — NOT from
 * React components (use the useSpotSwap hook for that).
 */

import { swapLock } from '@/lib/swap/SwapExecutionLock';
import {
  SwapExecutionParams,
  SwapExecutionResult,
} from '@/types/spot-trading';
import { sanitizeError } from '@/lib/errors/swapErrors';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://trading.watchup.site';

export class SpotSwapExecutor {
  /**
   * Main execution function — uses a lock to prevent double-click
   */
  async execute(params: SwapExecutionParams): Promise<SwapExecutionResult> {
    return await swapLock.execute(
      params.userId,
      params.pair,
      () => this.executeInternal(params)
    );
  }

  private async executeInternal(
    params: SwapExecutionParams
  ): Promise<SwapExecutionResult> {
    try {
      // Step 1: Validate inputs
      if (!params.userId || !params.pair || !params.amount) {
        return {
          success: false,
          error: 'Missing required fields (userId, pair, amount)',
          errorCode: 'VALIDATION_ERROR',
        };
      }

      const [base, quote] = params.pair.split('-');
      const chain = base === 'SOL' ? 'SOL' : 'ETH';

      // Determine from / to token addresses
      const fromToken = params.side === 'BUY'
        ? params.quoteToken  // Buying base → spending quote (e.g. USDT)
        : params.baseToken;  // Selling base → spending base (e.g. SOL)

      const toToken = params.side === 'BUY'
        ? params.baseToken   // Buying base → receiving base (e.g. SOL)
        : params.quoteToken; // Selling base → receiving quote (e.g. USDT)

      const slippage = (params.slippage ?? 3) / 100; // percentage → decimal

      // Convert human amount to smallest unit via string math
      const decimals = params.side === 'BUY'
        ? params.quoteToken.decimals
        : params.baseToken.decimals;

      const amountIn = this.toSmallestUnit(params.amount, decimals);

      console.log('[SpotSwapExecutor] Executing trade:', {
        userId: params.userId,
        pair: params.pair,
        side: params.side,
        amountIn,
        fromToken: fromToken.address,
        toToken: toToken.address,
        chain,
      });

      // Step 2: Use local services instead of external backend
      const { fetchQuote } = await import('./quoteService');
      const { executeSwap } = await import('./executionService');

      // 1. Fetch quote locally
      const quoteResponse = await fetchQuote({
        fromChain: chain === 'SOL' ? 1151111081099710 : 1,
        toChain: chain === 'SOL' ? 1151111081099710 : 1,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: amountIn,
        fromAddress: params.fromAddress || '',
        toAddress: params.toAddress || params.fromAddress,
        slippageOverride: slippage
      });

      // 2. Execute locally (Server-side execution assumes we have the private key)
      // This is primarily for automated trading features
      if (!params.privateKey) {
        throw new Error('Private key required for server-side execution');
      }

      const result = await executeSwap({
        quote: quoteResponse,
        userAddress: params.fromAddress || '',
        privateKey: params.privateKey,
        chainType: chain === 'SOL' ? 'solana' : 'evm',
        rpcUrl: chain === 'SOL'
          ? (process.env.NEXT_PUBLIC_SOL_RPC || 'https://api.mainnet-beta.solana.com')
          : (process.env.NEXT_PUBLIC_ETH_RPC || 'https://cloudflare-eth.com')
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Execution failed',
          errorCode: 'EXECUTION_FAILED',
        };
      }

      return {
        success: true,
        txHash: result.txHash!,
      };
    } catch (error) {
      console.error('[SpotSwapExecutor] Error:', error);
      return {
        success: false,
        error: sanitizeError(error),
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Fetch a quote from the backend
   */
  async getQuote(params: {
    userId: string;
    fromChain: string;
    toChain: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage?: number;
  }) {
    const res = await fetch(`${BACKEND_BASE}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        slippage: params.slippage ?? 0.03,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Quote failed');
    }
    return data;
  }

  /**
   * Convert a human-readable amount to the smallest unit string.
   * Uses string manipulation to avoid floating-point precision issues.
   */
  private toSmallestUnit(amount: string, decimals: number): string {
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
}

export const spotSwapExecutor = new SpotSwapExecutor();
