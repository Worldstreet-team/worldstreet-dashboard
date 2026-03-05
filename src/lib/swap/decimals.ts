/**
 * Decimal Handling Utilities
 * CRITICAL: Always use bigint for token amounts, never floating point
 */

import { parseUnits, formatUnits } from 'viem';

/**
 * Convert human-readable amount to smallest unit (wei-like)
 * @param amount - Human readable amount (e.g., "1.5")
 * @param decimals - Token decimals (e.g., 18 for ETH, 6 for USDT)
 * @returns bigint in smallest unit
 */
export function toSmallestUnit(amount: string, decimals: number): bigint {
  try {
    // Validate input
    if (!amount || amount === '0' || parseFloat(amount) <= 0) {
      throw new Error('Amount must be positive');
    }
    
    // Check decimal places don't exceed token decimals
    const decimalPlaces = (amount.split('.')[1] || '').length;
    if (decimalPlaces > decimals) {
      throw new Error(`Precision exceeds token decimals (${decimals})`);
    }
    
    return parseUnits(amount, decimals);
  } catch (error) {
    throw new Error(`Invalid amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert smallest unit to human-readable
 * @param amount - Amount in smallest unit (bigint)
 * @param decimals - Token decimals
 * @returns Human readable string
 */
export function fromSmallestUnit(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

/**
 * Validate amount string format
 */
export function validateAmountString(amount: string): boolean {
  // Must be numeric
  if (!/^\d*\.?\d+$/.test(amount)) return false;
  
  // Must be positive
  if (parseFloat(amount) <= 0) return false;
  
  // Must not be scientific notation
  if (amount.includes('e') || amount.includes('E')) return false;
  
  return true;
}

/**
 * Calculate execution price from swap amounts
 * @param fromAmount - Amount sent (in smallest unit)
 * @param toAmount - Amount received (in smallest unit)
 * @param fromDecimals - From token decimals
 * @param toDecimals - To token decimals
 * @returns Price as string (quote per base)
 */
export function calculateExecutionPrice(
  fromAmount: bigint,
  toAmount: bigint,
  fromDecimals: number,
  toDecimals: number
): string {
  // Convert to human readable
  const fromHuman = parseFloat(fromSmallestUnit(fromAmount, fromDecimals));
  const toHuman = parseFloat(fromSmallestUnit(toAmount, toDecimals));
  
  // Calculate price
  const price = fromHuman / toHuman;
  
  return price.toString();
}

/**
 * Calculate average entry price for position
 * @param existingCost - Existing total cost (bigint)
 * @param existingAmount - Existing amount (bigint)
 * @param newCost - New cost to add (bigint)
 * @param newAmount - New amount to add (bigint)
 * @param decimals - Token decimals
 * @returns New average price as string
 */
export function calculateAveragePrice(
  existingCost: bigint,
  existingAmount: bigint,
  newCost: bigint,
  newAmount: bigint,
  decimals: number
): string {
  const totalCost = existingCost + newCost;
  const totalAmount = existingAmount + newAmount;
  
  if (totalAmount === BigInt(0)) {
    return '0';
  }
  
  // Convert to human readable for division
  const costHuman = parseFloat(fromSmallestUnit(totalCost, decimals));
  const amountHuman = parseFloat(fromSmallestUnit(totalAmount, decimals));
  
  const avgPrice = costHuman / amountHuman;
  
  return avgPrice.toString();
}

/**
 * Calculate realized PnL
 * @param sellAmount - Amount being sold (bigint)
 * @param sellPrice - Current sell price (string)
 * @param avgEntryPrice - Average entry price (string)
 * @param decimals - Token decimals
 * @returns Realized PnL as bigint (in quote token smallest unit)
 */
export function calculateRealizedPnL(
  sellAmount: bigint,
  sellPrice: string,
  avgEntryPrice: string,
  decimals: number
): bigint {
  const sellPriceNum = parseFloat(sellPrice);
  const entryPriceNum = parseFloat(avgEntryPrice);
  
  const priceDiff = sellPriceNum - entryPriceNum;
  const amountHuman = parseFloat(fromSmallestUnit(sellAmount, decimals));
  
  const pnlHuman = priceDiff * amountHuman;
  
  // Convert back to smallest unit
  return parseUnits(pnlHuman.toFixed(decimals), decimals);
}
