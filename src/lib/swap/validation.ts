/**
 * Swap Validation Pipeline
 * Complete validation before executing swaps
 */

import { isAddress } from 'viem';
import { validateAmountString, toSmallestUnit } from './decimals';
import { TokenMetadata } from '@/types/spot-trading';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

export const SLIPPAGE_CONFIG = {
  MIN: 0.1, // 0.1%
  MAX: 5.0, // 5%
  DEFAULT: 1.0, // 1.0% - realistic for DEX swaps
  RECOMMENDED: {
    STABLE: 0.5, // Stablecoin swaps (increased from 0.1%)
    MAJOR: 1.0, // BTC, ETH (increased from 0.5%)
    VOLATILE: 2.0, // Altcoins (increased from 1.0%)
  }
} as const;

/**
 * Validate slippage percentage
 */
export function validateSlippage(slippage: number): boolean {
  return slippage >= SLIPPAGE_CONFIG.MIN && slippage <= SLIPPAGE_CONFIG.MAX;
}

/**
 * Convert slippage percentage to basis points for LI.FI
 * @param slippage - Percentage (e.g., 0.5 for 0.5%)
 * @returns Basis points (e.g., 50 for 0.5%)
 */
export function slippageToBasisPoints(slippage: number): number {
  return Math.floor(slippage * 100);
}

/**
 * Calculate minimum received amount with slippage
 */
export function calculateMinReceived(
  expectedAmount: bigint,
  slippagePercent: number
): bigint {
  const slippageBps = BigInt(slippageToBasisPoints(slippagePercent));
  const bpsBase = BigInt(10000);
  
  return (expectedAmount * (bpsBase - slippageBps)) / bpsBase;
}

/**
 * Complete validation pipeline before swap execution
 */
export async function validateSwapRequest(params: {
  userAddress: string;
  chainId: number;
  fromToken: TokenMetadata;
  toToken: TokenMetadata;
  amount: string;
  slippage: number;
  balance: bigint;
}): Promise<ValidationResult> {
  
  // 1. Validate wallet connection
  if (!params.userAddress || !isAddress(params.userAddress)) {
    return { valid: false, error: 'Invalid wallet address', code: 'INVALID_WALLET' };
  }
  
  // 2. Validate amount format
  if (!validateAmountString(params.amount)) {
    return { valid: false, error: 'Invalid amount format', code: 'INVALID_AMOUNT' };
  }
  
  // 3. Validate amount is positive
  if (parseFloat(params.amount) <= 0) {
    return { valid: false, error: 'Amount must be positive', code: 'ZERO_AMOUNT' };
  }
  
  // 4. Validate decimal precision
  const decimalPlaces = (params.amount.split('.')[1] || '').length;
  if (decimalPlaces > params.fromToken.decimals) {
    return { 
      valid: false, 
      error: `Maximum ${params.fromToken.decimals} decimal places`, 
      code: 'PRECISION_OVERFLOW' 
    };
  }
  
  // 5. Convert to smallest unit
  let amountInSmallestUnit: bigint;
  try {
    amountInSmallestUnit = toSmallestUnit(params.amount, params.fromToken.decimals);
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Conversion error', 
      code: 'CONVERSION_ERROR' 
    };
  }
  
  // 6. Validate sufficient balance
  if (amountInSmallestUnit > params.balance) {
    return { 
      valid: false, 
      error: 'Insufficient balance', 
      code: 'INSUFFICIENT_BALANCE' 
    };
  }
  
  // 7. Validate slippage
  if (!validateSlippage(params.slippage)) {
    return { 
      valid: false, 
      error: `Slippage must be between ${SLIPPAGE_CONFIG.MIN}% and ${SLIPPAGE_CONFIG.MAX}%`, 
      code: 'INVALID_SLIPPAGE' 
    };
  }
  
  // 8. Validate chain match
  if (params.fromToken.chainId !== params.toToken.chainId) {
    return { 
      valid: false, 
      error: 'Cross-chain swaps not supported', 
      code: 'CHAIN_MISMATCH' 
    };
  }
  
  // 9. Validate token addresses
  if (!isAddress(params.fromToken.address) || !isAddress(params.toToken.address)) {
    return { 
      valid: false, 
      error: 'Invalid token address', 
      code: 'INVALID_TOKEN_ADDRESS' 
    };
  }
  
  // 10. Validate tokens are different
  if (params.fromToken.address.toLowerCase() === params.toToken.address.toLowerCase()) {
    return { 
      valid: false, 
      error: 'Cannot swap token to itself', 
      code: 'SAME_TOKEN' 
    };
  }
  
  return { valid: true };
}
