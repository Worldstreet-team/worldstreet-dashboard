/**
 * Tron Swap Quote Service
 * 
 * Provides quote functionality for TRX <-> USDT swaps using SunSwap pool
 */

import { getTronWeb } from "./tronweb.service";

// IMPORTANT: This is the SunSwap TRX/USDT pool address
// Verified mainnet pool: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE
const SUNSWAP_POOL_ADDRESS = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";

// Complete JustSwap/SunSwap Pool ABI
const POOL_ABI = [
  {
    constant: true,
    inputs: [{ name: "trx_sold", type: "uint256" }],
    name: "getTrxToTokenInputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "tokens_sold", type: "uint256" }],
    name: "getTokenToTrxInputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "tokens_bought", type: "uint256" }],
    name: "getTrxToTokenOutputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "trx_bought", type: "uint256" }],
    name: "getTokenToTrxOutputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "tokenAddress",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

export interface QuoteResult {
  inputAmount: number;
  outputAmount: number;
  minimumOutput: number;
  slippage: number;
  priceImpact: number;
  poolAddress: string;
}

/**
 * Parse TronWeb BigNumber result
 * TronWeb returns results in different formats depending on version
 */
function parseTronWebBigNumber(result: any): bigint {
  // Handle different TronWeb return formats
  if (typeof result === 'bigint') {
    return result;
  }
  
  if (typeof result === 'number') {
    return BigInt(result);
  }
  
  if (result._hex) {
    return BigInt(result._hex);
  }
  
  if (result.toString) {
    const str = result.toString();
    // Remove any non-numeric characters except for the number itself
    const cleaned = str.replace(/[^0-9]/g, '');
    return BigInt(cleaned || '0');
  }
  
  // Fallback
  return BigInt(String(result));
}

/**
 * Get quote for TRX -> USDT swap
 */
export async function getQuoteTrxToUsdt(
  trxAmount: number,
  slippage: number = 1
): Promise<QuoteResult> {
  try {
    // Get TronWeb instance
    const tronWeb = await getTronWeb();

    // Convert TRX to Sun (6 decimals)
    const trxSold = Math.floor(trxAmount * 1_000_000);

    console.log("[QuoteService] Input TRX:", trxAmount, "Sun:", trxSold);

    // Get contract instance
    const contract = await tronWeb.contract(POOL_ABI, SUNSWAP_POOL_ADDRESS);

    // Call getTrxToTokenInputPrice (read-only, no private key needed)
    const result = await contract.getTrxToTokenInputPrice(trxSold).call();
    
    console.log("[QuoteService] Raw result:", result);
    console.log("[QuoteService] Result type:", typeof result);
    
    // Parse the result
    const outputInBaseUnits = parseTronWebBigNumber(result);
    
    console.log("[QuoteService] Parsed BigInt:", outputInBaseUnits.toString());

    // Convert from base units (6 decimals for USDT)
    const outputAmount = Number(outputInBaseUnits) / 1_000_000;

    console.log("[QuoteService] Output USDT:", outputAmount);

    // Sanity check - if the output is absurdly large, something is wrong
    if (outputAmount > trxAmount * 1000) {
      console.error("[QuoteService] Sanity check failed - output too large");
      console.error("[QuoteService] This might indicate wrong pool address or ABI");
      throw new Error("Invalid quote received - output amount unrealistic");
    }

    // Calculate minimum output with slippage
    const minimumOutput = outputAmount * (1 - slippage / 100);

    // Estimate price impact (simplified)
    const priceImpact = calculatePriceImpact(trxAmount, outputAmount, "TRX_TO_USDT");

    return {
      inputAmount: trxAmount,
      outputAmount,
      minimumOutput,
      slippage,
      priceImpact,
      poolAddress: SUNSWAP_POOL_ADDRESS,
    };
  } catch (error) {
    console.error("[QuoteService] TRX->USDT quote error:", error);
    throw new Error("Failed to get quote for TRX to USDT");
  }
}

/**
 * Get quote for USDT -> TRX swap
 */
export async function getQuoteUsdtToTrx(
  usdtAmount: number,
  slippage: number = 1
): Promise<QuoteResult> {
  try {
    // Get TronWeb instance
    const tronWeb = await getTronWeb();

    // Convert USDT to base units (6 decimals)
    const tokensSold = Math.floor(usdtAmount * 1_000_000);

    console.log("[QuoteService] Input USDT:", usdtAmount, "Base units:", tokensSold);

    // Get contract instance
    const contract = await tronWeb.contract(POOL_ABI, SUNSWAP_POOL_ADDRESS);

    // Call getTokenToTrxInputPrice (read-only, no private key needed)
    const result = await contract.getTokenToTrxInputPrice(tokensSold).call();
    
    console.log("[QuoteService] Raw result:", result);
    console.log("[QuoteService] Result type:", typeof result);
    
    // Parse the result
    const outputInBaseUnits = parseTronWebBigNumber(result);
    
    console.log("[QuoteService] Parsed BigInt:", outputInBaseUnits.toString());

    // Convert from base units (6 decimals for TRX)
    const outputAmount = Number(outputInBaseUnits) / 1_000_000;

    console.log("[QuoteService] Output TRX:", outputAmount);

    // Sanity check
    if (outputAmount > usdtAmount * 1000) {
      console.error("[QuoteService] Sanity check failed - output too large");
      throw new Error("Invalid quote received - output amount unrealistic");
    }

    // Calculate minimum output with slippage
    const minimumOutput = outputAmount * (1 - slippage / 100);

    // Estimate price impact (simplified)
    const priceImpact = calculatePriceImpact(usdtAmount, outputAmount, "USDT_TO_TRX");

    return {
      inputAmount: usdtAmount,
      outputAmount,
      minimumOutput,
      slippage,
      priceImpact,
      poolAddress: SUNSWAP_POOL_ADDRESS,
    };
  } catch (error) {
    console.error("[QuoteService] USDT->TRX quote error:", error);
    throw new Error("Failed to get quote for USDT to TRX");
  }
}

/**
 * Calculate estimated price impact
 * This is a simplified calculation - real impact depends on pool reserves
 */
function calculatePriceImpact(
  inputAmount: number,
  outputAmount: number,
  direction: "TRX_TO_USDT" | "USDT_TO_TRX"
): number {
  // Simplified price impact calculation
  // In production, you'd compare against spot price from reserves
  
  if (inputAmount === 0 || outputAmount === 0) return 0;

  // Rough estimate based on trade size
  const tradeSize = direction === "TRX_TO_USDT" ? inputAmount : outputAmount;
  
  if (tradeSize < 100) return 0.1;
  if (tradeSize < 1000) return 0.3;
  if (tradeSize < 10000) return 0.5;
  return 1.0;
}

/**
 * Validate quote parameters
 */
export function validateQuoteParams(amount: number, balance: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (amount > balance) {
    return { valid: false, error: "Insufficient balance" };
  }

  return { valid: true };
}
