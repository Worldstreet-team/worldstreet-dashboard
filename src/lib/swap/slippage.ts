/**
 * Dynamic Slippage Calculation System
 * Production-grade slippage management for multi-chain swaps
 * 
 * CRITICAL: All calculations use basis points (BPS) to avoid floating point errors
 * 1 BPS = 0.01% = 0.0001
 * 10000 BPS = 100%
 */

import { formatUnits } from 'viem';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const SLIPPAGE_CONFIG = {
  // Base slippage in basis points (100 BPS = 1.0%)
  BASE_BPS: 100,
  
  // Minimum allowed slippage (50 BPS = 0.5%)
  MIN_BPS: 50,
  
  // Maximum allowed slippage (500 BPS = 5%)
  MAX_BPS: 500,
  
  // Emergency ceiling - never exceed this (1000 BPS = 10%)
  ABSOLUTE_MAX_BPS: 1000,
  
  // Price impact thresholds
  PRICE_IMPACT: {
    LOW: 50,      // 0.5% - minimal impact
    MEDIUM: 100,  // 1% - moderate impact
    HIGH: 300,    // 3% - high impact
    EXTREME: 500, // 5% - reject trade
  },
  
  // Route complexity multipliers (in BPS to add)
  ROUTE_COMPLEXITY: {
    SINGLE_HOP: 0,      // Direct swap
    TWO_HOPS: 10,       // One intermediate token
    THREE_PLUS_HOPS: 25, // Multiple hops
    CROSS_CHAIN: 50,    // Bridge involved
  },
  
  // Liquidity thresholds (trade size as % of pool)
  LIQUIDITY_IMPACT: {
    SMALL: 1,    // <1% of pool
    MEDIUM: 5,   // 1-5% of pool
    LARGE: 10,   // 5-10% of pool
    HUGE: 20,    // >10% of pool - reject
  },
  
  // Quote freshness (milliseconds)
  QUOTE_TTL_MS: 30000, // 30 seconds
  
  // Execution deadline (seconds from now)
  EXECUTION_DEADLINE_SECONDS: 120, // 2 minutes
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LiFiQuote {
  id: string;
  type: string;
  tool: string;
  toolDetails?: {
    name: string;
    logoURI?: string;
  };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      priceUSD?: string;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      priceUSD?: string;
    };
    fromAmount: string;
    toAmount: string;
    slippage?: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration?: number;
    feeCosts?: Array<{
      name: string;
      description?: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
      };
      amount: string;
      amountUSD?: string;
      percentage?: string;
      included: boolean;
    }>;
    gasCosts?: Array<{
      type: string;
      price?: string;
      estimate?: string;
      limit?: string;
      amount: string;
      amountUSD?: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
      };
    }>;
    data?: {
      priceImpact?: number | string;
      liquidityProviderFee?: string;
    };
  };
  includedSteps?: Array<{
    id: string;
    type: string;
    tool: string;
    action: {
      fromChainId: number;
      toChainId: number;
    };
  }>;
  transactionRequest?: {
    from: string;
    to: string;
    chainId: number;
    data: string;
    value: string;
    gasPrice?: string;
    gasLimit?: string;
  };
}

export interface SlippageCalculation {
  // Final slippage in basis points
  slippageBps: number;
  
  // Breakdown of calculation
  breakdown: {
    baseBps: number;
    priceImpactBps: number;
    routeComplexityBps: number;
    liquidityImpactBps: number;
    totalBeforeCap: number;
    appliedCap: boolean;
  };
  
  // Validation results
  validation: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
  
  // Computed values
  minReceived: string; // In smallest unit (bigint as string)
  maxPriceImpactBps: number;
  estimatedExecutionTime: number; // seconds
}

export interface SlippageValidationResult {
  isValid: boolean;
  slippageBps: number;
  errors: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE CALCULATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate dynamic slippage based on quote characteristics
 * 
 * Formula:
 * slippage = BASE + priceImpact + routeComplexity + liquidityImpact
 * 
 * Where:
 * - BASE: 50 BPS (0.5%)
 * - priceImpact: 0-200 BPS based on estimated price impact
 * - routeComplexity: 0-50 BPS based on number of hops
 * - liquidityImpact: 0-100 BPS based on trade size vs pool
 * 
 * Final slippage is capped at MAX_BPS (500 BPS = 5%)
 */
export function calculateDynamicSlippage(quote: LiFiQuote): SlippageCalculation {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Start with base slippage
  let slippageBps = SLIPPAGE_CONFIG.BASE_BPS;
  const breakdown = {
    baseBps: SLIPPAGE_CONFIG.BASE_BPS,
    priceImpactBps: 0,
    routeComplexityBps: 0,
    liquidityImpactBps: 0,
    totalBeforeCap: 0,
    appliedCap: false,
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // 1. PRICE IMPACT ADJUSTMENT
  // ─────────────────────────────────────────────────────────────────────────
  
  const priceImpactBps = calculatePriceImpactAdjustment(quote, warnings, errors);
  slippageBps += priceImpactBps;
  breakdown.priceImpactBps = priceImpactBps;
  
  // ─────────────────────────────────────────────────────────────────────────
  // 2. ROUTE COMPLEXITY ADJUSTMENT
  // ─────────────────────────────────────────────────────────────────────────
  
  const routeComplexityBps = calculateRouteComplexityAdjustment(quote, warnings);
  slippageBps += routeComplexityBps;
  breakdown.routeComplexityBps = routeComplexityBps;
  
  // ─────────────────────────────────────────────────────────────────────────
  // 3. LIQUIDITY IMPACT ADJUSTMENT
  // ─────────────────────────────────────────────────────────────────────────
  
  const liquidityImpactBps = calculateLiquidityImpactAdjustment(quote, warnings);
  slippageBps += liquidityImpactBps;
  breakdown.liquidityImpactBps = liquidityImpactBps;
  
  // ─────────────────────────────────────────────────────────────────────────
  // 4. APPLY CAPS AND FLOORS
  // ─────────────────────────────────────────────────────────────────────────
  
  breakdown.totalBeforeCap = slippageBps;
  
  // Enforce minimum
  if (slippageBps < SLIPPAGE_CONFIG.MIN_BPS) {
    slippageBps = SLIPPAGE_CONFIG.MIN_BPS;
    warnings.push(`Slippage increased to minimum ${SLIPPAGE_CONFIG.MIN_BPS} BPS`);
  }
  
  // Enforce maximum
  if (slippageBps > SLIPPAGE_CONFIG.MAX_BPS) {
    slippageBps = SLIPPAGE_CONFIG.MAX_BPS;
    breakdown.appliedCap = true;
    warnings.push(`Slippage capped at maximum ${SLIPPAGE_CONFIG.MAX_BPS} BPS`);
  }
  
  // Emergency ceiling check
  if (slippageBps > SLIPPAGE_CONFIG.ABSOLUTE_MAX_BPS) {
    errors.push(`Slippage exceeds absolute maximum ${SLIPPAGE_CONFIG.ABSOLUTE_MAX_BPS} BPS`);
    slippageBps = SLIPPAGE_CONFIG.ABSOLUTE_MAX_BPS;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // 5. CALCULATE MIN RECEIVED
  // ─────────────────────────────────────────────────────────────────────────
  
  const minReceived = calculateMinReceived(
    quote.estimate.toAmount,
    slippageBps
  );
  
  // ─────────────────────────────────────────────────────────────────────────
  // 6. EXTRACT ADDITIONAL METADATA
  // ─────────────────────────────────────────────────────────────────────────
  
  const maxPriceImpactBps = extractPriceImpact(quote);
  const estimatedExecutionTime = quote.estimate.executionDuration || 30;
  
  return {
    slippageBps,
    breakdown,
    validation: {
      isValid: errors.length === 0,
      warnings,
      errors,
    },
    minReceived,
    maxPriceImpactBps,
    estimatedExecutionTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADJUSTMENT CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate price impact adjustment
 * Higher price impact = higher slippage needed
 */
function calculatePriceImpactAdjustment(
  quote: LiFiQuote,
  warnings: string[],
  errors: string[]
): number {
  const priceImpactBps = extractPriceImpact(quote);
  
  // Reject extreme price impact
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.EXTREME) {
    errors.push(
      `Price impact ${(priceImpactBps / 100).toFixed(2)}% exceeds maximum ${(SLIPPAGE_CONFIG.PRICE_IMPACT.EXTREME / 100).toFixed(2)}%`
    );
    return 200; // Max adjustment
  }
  
  // High price impact warning
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.HIGH) {
    warnings.push(
      `High price impact detected: ${(priceImpactBps / 100).toFixed(2)}%`
    );
    return 150; // Significant adjustment
  }
  
  // Medium price impact
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.MEDIUM) {
    warnings.push(
      `Moderate price impact: ${(priceImpactBps / 100).toFixed(2)}%`
    );
    return 75; // Moderate adjustment
  }
  
  // Low price impact
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.LOW) {
    return 25; // Small adjustment
  }
  
  // Minimal price impact
  return 0;
}

/**
 * Calculate route complexity adjustment
 * More hops = higher slippage needed
 */
function calculateRouteComplexityAdjustment(
  quote: LiFiQuote,
  warnings: string[]
): number {
  const isCrossChain = quote.action.fromChainId !== quote.action.toChainId;
  const hopCount = quote.includedSteps?.length || 1;
  
  let adjustment = 0;
  
  // Cross-chain adds significant complexity
  if (isCrossChain) {
    adjustment += SLIPPAGE_CONFIG.ROUTE_COMPLEXITY.CROSS_CHAIN;
    warnings.push('Cross-chain swap detected - increased slippage tolerance');
  }
  
  // Multi-hop routes
  if (hopCount >= 3) {
    adjustment += SLIPPAGE_CONFIG.ROUTE_COMPLEXITY.THREE_PLUS_HOPS;
    warnings.push(`Complex route with ${hopCount} steps`);
  } else if (hopCount === 2) {
    adjustment += SLIPPAGE_CONFIG.ROUTE_COMPLEXITY.TWO_HOPS;
  }
  
  return adjustment;
}

/**
 * Calculate liquidity impact adjustment
 * Larger trades relative to pool = higher slippage needed
 * 
 * Note: LI.FI doesn't always provide pool liquidity data,
 * so we use heuristics based on token prices and amounts
 */
function calculateLiquidityImpactAdjustment(
  quote: LiFiQuote,
  warnings: string[]
): number {
  // Estimate trade size in USD
  const fromAmountUSD = estimateUSDValue(
    quote.action.fromAmount,
    quote.action.fromToken.decimals,
    quote.action.fromToken.priceUSD
  );
  
  // Large trades (>$100k) likely have higher impact
  if (fromAmountUSD > 100000) {
    warnings.push(`Large trade size: $${(fromAmountUSD / 1000).toFixed(0)}k`);
    return 100;
  }
  
  // Medium trades ($10k-$100k)
  if (fromAmountUSD > 10000) {
    warnings.push(`Medium trade size: $${(fromAmountUSD / 1000).toFixed(0)}k`);
    return 50;
  }
  
  // Small trades (<$10k)
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract price impact from quote
 * Returns value in basis points
 */
function extractPriceImpact(quote: LiFiQuote): number {
  // Try to get from estimate data
  if (quote.estimate.data?.priceImpact) {
    const impact = typeof quote.estimate.data.priceImpact === 'string'
      ? parseFloat(quote.estimate.data.priceImpact)
      : quote.estimate.data.priceImpact;
    
    // Convert to BPS (assuming impact is in percentage)
    return Math.round(impact * 100);
  }
  
  // Fallback: Calculate from amounts
  return calculateImplicitPriceImpact(quote);
}

/**
 * Calculate implicit price impact from quote amounts
 */
function calculateImplicitPriceImpact(quote: LiFiQuote): number {
  const fromPriceUSD = quote.action.fromToken.priceUSD;
  const toPriceUSD = quote.action.toToken.priceUSD;
  
  if (!fromPriceUSD || !toPriceUSD) {
    return 0; // Can't calculate without prices
  }
  
  // Calculate expected vs actual output
  const fromAmountUSD = estimateUSDValue(
    quote.action.fromAmount,
    quote.action.fromToken.decimals,
    fromPriceUSD
  );
  
  const toAmountUSD = estimateUSDValue(
    quote.estimate.toAmount,
    quote.action.toToken.decimals,
    toPriceUSD
  );
  
  // Price impact = (expected - actual) / expected
  const impactPercent = ((fromAmountUSD - toAmountUSD) / fromAmountUSD) * 100;
  
  return Math.max(0, Math.round(impactPercent * 100)); // Convert to BPS
}

/**
 * Estimate USD value of token amount
 */
function estimateUSDValue(
  amount: string,
  decimals: number,
  priceUSD: string | undefined
): number {
  if (!priceUSD) return 0;
  
  const amountFloat = parseFloat(formatUnits(BigInt(amount), decimals));
  const price = parseFloat(priceUSD);
  
  return amountFloat * price;
}

/**
 * Calculate minimum received amount with slippage
 * Uses bigint math to avoid precision loss
 * 
 * Formula: minReceived = expectedAmount * (10000 - slippageBps) / 10000
 */
export function calculateMinReceived(
  expectedAmount: string,
  slippageBps: number
): string {
  const expected = BigInt(expectedAmount);
  const slippage = BigInt(slippageBps);
  const bpsBase = BigInt(10000);
  
  // minReceived = expected * (10000 - slippage) / 10000
  const minReceived = (expected * (bpsBase - slippage)) / bpsBase;
  
  return minReceived.toString();
}

/**
 * Convert slippage from basis points to decimal (for LI.FI API)
 * Example: 50 BPS → 0.005
 */
export function bpsToDecimal(bps: number): number {
  return bps / 10000;
}

/**
 * Convert slippage from decimal to basis points
 * Example: 0.005 → 50 BPS
 */
export function decimalToBps(decimal: number): number {
  return Math.round(decimal * 10000);
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate quote freshness
 */
export function validateQuoteFreshness(
  quoteTimestamp: number,
  now: number = Date.now()
): { isValid: boolean; ageMs: number; error?: string } {
  const ageMs = now - quoteTimestamp;
  
  if (ageMs > SLIPPAGE_CONFIG.QUOTE_TTL_MS) {
    return {
      isValid: false,
      ageMs,
      error: `Quote expired (${(ageMs / 1000).toFixed(0)}s old, max ${(SLIPPAGE_CONFIG.QUOTE_TTL_MS / 1000).toFixed(0)}s)`,
    };
  }
  
  return { isValid: true, ageMs };
}

/**
 * Validate slippage is within acceptable bounds
 */
export function validateSlippage(slippageBps: number): SlippageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (slippageBps < SLIPPAGE_CONFIG.MIN_BPS) {
    errors.push(`Slippage ${slippageBps} BPS below minimum ${SLIPPAGE_CONFIG.MIN_BPS} BPS`);
  }
  
  if (slippageBps > SLIPPAGE_CONFIG.ABSOLUTE_MAX_BPS) {
    errors.push(`Slippage ${slippageBps} BPS exceeds absolute maximum ${SLIPPAGE_CONFIG.ABSOLUTE_MAX_BPS} BPS`);
  }
  
  if (slippageBps > SLIPPAGE_CONFIG.MAX_BPS) {
    warnings.push(`Slippage ${slippageBps} BPS exceeds recommended maximum ${SLIPPAGE_CONFIG.MAX_BPS} BPS`);
  }
  
  return {
    isValid: errors.length === 0,
    slippageBps,
    errors,
    warnings,
  };
}

/**
 * Validate price impact is acceptable
 */
export function validatePriceImpact(priceImpactBps: number): {
  isValid: boolean;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  error?: string;
} {
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.EXTREME) {
    return {
      isValid: false,
      severity: 'extreme',
      error: `Price impact ${(priceImpactBps / 100).toFixed(2)}% exceeds maximum ${(SLIPPAGE_CONFIG.PRICE_IMPACT.EXTREME / 100).toFixed(2)}%`,
    };
  }
  
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.HIGH) {
    return { isValid: true, severity: 'high' };
  }
  
  if (priceImpactBps >= SLIPPAGE_CONFIG.PRICE_IMPACT.MEDIUM) {
    return { isValid: true, severity: 'medium' };
  }
  
  return { isValid: true, severity: 'low' };
}
