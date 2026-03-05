/**
 * Quote Service - LI.FI Quote Management
 * Handles quote fetching, caching, and validation with dynamic slippage
 */

import {
  calculateDynamicSlippage,
  validateQuoteFreshness,
  validatePriceImpact,
  bpsToDecimal,
  SLIPPAGE_CONFIG,
  type LiFiQuote,
  type SlippageCalculation,
} from '@/lib/swap/slippage';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const LIFI_API_BASE = 'https://li.quest/v1';
const INTEGRATOR = 'worldstreet';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface QuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  // Optional: allow override for testing
  slippageOverride?: number;
}

export interface QuoteResponse {
  quote: LiFiQuote;
  slippage: SlippageCalculation;
  timestamp: number;
  requestId: string;
}

export interface QuoteCache {
  [key: string]: {
    response: QuoteResponse;
    expiresAt: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTE CACHE
// ═══════════════════════════════════════════════════════════════════════════

class QuoteCacheManager {
  private cache: QuoteCache = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired quotes every 10 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  private generateKey(request: QuoteRequest): string {
    return `${request.fromChain}-${request.toChain}-${request.fromToken}-${request.toToken}-${request.fromAmount}-${request.fromAddress}`;
  }

  get(request: QuoteRequest): QuoteResponse | null {
    const key = this.generateKey(request);
    const cached = this.cache[key];

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      delete this.cache[key];
      return null;
    }

    // Validate freshness
    const freshness = validateQuoteFreshness(cached.response.timestamp);
    if (!freshness.isValid) {
      delete this.cache[key];
      return null;
    }

    return cached.response;
  }

  set(request: QuoteRequest, response: QuoteResponse): void {
    const key = this.generateKey(request);
    this.cache[key] = {
      response,
      expiresAt: Date.now() + SLIPPAGE_CONFIG.QUOTE_TTL_MS,
    };
  }

  invalidate(request: QuoteRequest): void {
    const key = this.generateKey(request);
    delete this.cache[key];
  }

  clear(): void {
    this.cache = {};
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (now > this.cache[key].expiresAt) {
        delete this.cache[key];
      }
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const quoteCache = new QuoteCacheManager();

// ═══════════════════════════════════════════════════════════════════════════
// QUOTE FETCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch quote from LI.FI with automatic slippage calculation
 * 
 * Flow:
 * 1. Check cache for recent quote
 * 2. Fetch initial quote from LI.FI (with base slippage)
 * 3. Calculate dynamic slippage based on quote
 * 4. Re-fetch quote with calculated slippage
 * 5. Validate and cache result
 */
export async function fetchQuote(
  request: QuoteRequest,
  abortSignal?: AbortSignal
): Promise<QuoteResponse> {
  // Generate request ID for tracking
  const requestId = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('[QuoteService] Fetching quote:', {
    requestId,
    fromChain: request.fromChain,
    toChain: request.toChain,
    fromToken: request.fromToken,
    toToken: request.toToken,
    fromAmount: request.fromAmount,
  });

  // Check cache first
  const cached = quoteCache.get(request);
  if (cached) {
    console.log('[QuoteService] Using cached quote:', requestId);
    return cached;
  }

  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Fetch initial quote with base slippage
    // ─────────────────────────────────────────────────────────────────────

    const baseSlippage = bpsToDecimal(SLIPPAGE_CONFIG.BASE_BPS);
    const initialQuote = await fetchQuoteFromLiFi(
      request,
      baseSlippage,
      abortSignal
    );

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Calculate dynamic slippage
    // ─────────────────────────────────────────────────────────────────────

    const slippageCalc = calculateDynamicSlippage(initialQuote);

    // Note: Logging removed for silent operation

    // Validate slippage calculation
    if (!slippageCalc.validation.isValid) {
      throw new Error(
        `Invalid slippage calculation: ${slippageCalc.validation.errors.join(', ')}`
      );
    }

    // Note: Price impact validation removed - allow all trades

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Re-fetch quote with calculated slippage (if different)
    // ─────────────────────────────────────────────────────────────────────

    let finalQuote = initialQuote;
    const calculatedSlippage = bpsToDecimal(slippageCalc.slippageBps);

    // Only re-fetch if slippage changed significantly (>0.1% difference)
    if (Math.abs(calculatedSlippage - baseSlippage) > 0.001) {
      console.log('[QuoteService] Re-fetching with calculated slippage:', {
        requestId,
        baseSlippage,
        calculatedSlippage,
      });

      finalQuote = await fetchQuoteFromLiFi(
        request,
        calculatedSlippage,
        abortSignal
      );

      // Recalculate slippage with final quote to ensure accuracy
      const finalSlippageCalc = calculateDynamicSlippage(finalQuote);
      Object.assign(slippageCalc, finalSlippageCalc);
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Build response
    // ─────────────────────────────────────────────────────────────────────

    const response: QuoteResponse = {
      quote: finalQuote,
      slippage: slippageCalc,
      timestamp: Date.now(),
      requestId,
    };

    // Cache the response
    quoteCache.set(request, response);

    console.log('[QuoteService] Quote fetched successfully:', {
      requestId,
      toAmount: finalQuote.estimate.toAmount,
      minReceived: slippageCalc.minReceived,
      slippageBps: slippageCalc.slippageBps,
    });

    return response;
  } catch (error) {
    console.error('[QuoteService] Quote fetch failed:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Enhance error message
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Quote request was cancelled');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to fetch quote from LI.FI');
      }
    }

    throw error;
  }
}

/**
 * Fetch quote directly from LI.FI API
 */
async function fetchQuoteFromLiFi(
  request: QuoteRequest,
  slippage: number,
  abortSignal?: AbortSignal
): Promise<LiFiQuote> {
  const params = new URLSearchParams({
    fromChain: request.fromChain.toString(),
    toChain: request.toChain.toString(),
    fromToken: request.fromToken,
    toToken: request.toToken,
    fromAmount: request.fromAmount,
    fromAddress: request.fromAddress,
    toAddress: request.toAddress || request.fromAddress,
    slippage: slippage.toString(),
    integrator: INTEGRATOR,
    allowSwitchChain: 'false', // Prevent unexpected chain switches
  });

  const url = `${LIFI_API_BASE}/quote?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `LI.FI API error: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const quote: LiFiQuote = await response.json();

  // Validate quote structure
  if (!quote.estimate || !quote.action) {
    throw new Error('Invalid quote structure received from LI.FI');
  }

  return quote;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate quote before execution
 */
export function validateQuote(response: QuoteResponse): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check quote freshness
  const freshness = validateQuoteFreshness(response.timestamp);
  if (!freshness.isValid) {
    errors.push(freshness.error!);
  } else if (freshness.ageMs > SLIPPAGE_CONFIG.QUOTE_TTL_MS / 2) {
    warnings.push(`Quote is ${(freshness.ageMs / 1000).toFixed(0)}s old`);
  }

  // Check slippage validation
  if (!response.slippage.validation.isValid) {
    errors.push(...response.slippage.validation.errors);
  }
  // Note: Warnings removed - silent operation

  // Note: Price impact validation removed - allow all trades

  // Check transaction request exists
  if (!response.quote.transactionRequest) {
    errors.push('Quote missing transaction request data');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Invalidate cached quote
 */
export function invalidateQuote(request: QuoteRequest): void {
  quoteCache.invalidate(request);
}

/**
 * Clear all cached quotes
 */
export function clearQuoteCache(): void {
  quoteCache.clear();
}

/**
 * Format quote for display
 */
export function formatQuoteForDisplay(response: QuoteResponse): {
  fromAmount: string;
  toAmount: string;
  minReceived: string;
  priceImpact: string;
  slippage: string;
  estimatedTime: string;
  gasCost: string;
  totalFees: string;
} {
  const { quote, slippage } = response;

  // Calculate total fees in USD
  const totalFeesUSD =
    (quote.estimate.feeCosts?.reduce(
      (sum, fee) => sum + parseFloat(fee.amountUSD || '0'),
      0
    ) || 0) +
    (quote.estimate.gasCosts?.reduce(
      (sum, gas) => sum + parseFloat(gas.amountUSD || '0'),
      0
    ) || 0);

  return {
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    minReceived: slippage.minReceived,
    priceImpact: `${(slippage.maxPriceImpactBps / 100).toFixed(2)}%`,
    slippage: `${(slippage.slippageBps / 100).toFixed(2)}%`,
    estimatedTime: `${slippage.estimatedExecutionTime}s`,
    gasCost: quote.estimate.gasCosts?.[0]?.amountUSD || '0',
    totalFees: totalFeesUSD.toFixed(2),
  };
}

/**
 * Create abort controller with timeout
 */
export function createQuoteAbortController(
  timeoutMs: number = 30000
): AbortController {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Clean up timeout when aborted
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeout);
  });

  return controller;
}

// Export cache manager for testing
export { quoteCache };
