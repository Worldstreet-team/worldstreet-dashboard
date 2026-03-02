/**
 * Tron Swap Quote Service
 * 
 * Provides quote functionality for TRX <-> USDT swaps using JustSwap pool
 */

const JUSTSWAP_POOL_ADDRESS = "TPavNqt8xhoBp4NNBSdEx3FBP24NBfVRxU";

// JustSwap Pool ABI - only the methods we need
const POOL_ABI = [
  {
    constant: true,
    inputs: [{ name: "trx_sold", type: "uint256" }],
    name: "getTrxToTokenInputPrice",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "tokens_sold", type: "uint256" }],
    name: "getTokenToTrxInputPrice",
    outputs: [{ name: "", type: "uint256" }],
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
 * Get quote for TRX -> USDT swap
 */
export async function getQuoteTrxToUsdt(
  tronWeb: any,
  trxAmount: number,
  slippage: number = 1
): Promise<QuoteResult> {
  try {
    // Convert TRX to Sun (6 decimals)
    const trxSold = Math.floor(trxAmount * 1_000_000);

    // Get contract instance
    const contract = await tronWeb.contract(POOL_ABI, JUSTSWAP_POOL_ADDRESS);

    // Call getTrxToTokenInputPrice
    const outputRaw = await contract.getTrxToTokenInputPrice(trxSold).call();
    const outputAmount = Number(outputRaw.toString()) / 1_000_000; // USDT has 6 decimals

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
      poolAddress: JUSTSWAP_POOL_ADDRESS,
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
  tronWeb: any,
  usdtAmount: number,
  slippage: number = 1
): Promise<QuoteResult> {
  try {
    // Convert USDT to base units (6 decimals)
    const tokensSold = Math.floor(usdtAmount * 1_000_000);

    // Get contract instance
    const contract = await tronWeb.contract(POOL_ABI, JUSTSWAP_POOL_ADDRESS);

    // Call getTokenToTrxInputPrice
    const outputRaw = await contract.getTokenToTrxInputPrice(tokensSold).call();
    const outputAmount = Number(outputRaw.toString()) / 1_000_000; // TRX has 6 decimals

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
      poolAddress: JUSTSWAP_POOL_ADDRESS,
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
