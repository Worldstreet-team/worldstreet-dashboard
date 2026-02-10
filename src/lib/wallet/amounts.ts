/**
 * Amount conversion utilities for blockchain transactions
 * Converts between raw (smallest unit) and display (human readable) amounts
 */

/**
 * Convert display amount to raw (smallest unit)
 * e.g., 1.5 ETH -> 1500000000000000000 wei
 */
export function convertDisplayToRaw(amount: number | string, decimals: number): bigint {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  const [whole, fraction = ""] = amountStr.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Convert raw (smallest unit) to display amount
 * e.g., 1500000000000000000 wei -> "1.5"
 */
export function convertRawToDisplay(
  rawAmount: bigint | number | string,
  decimals: number
): string {
  const raw = BigInt(rawAmount);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = remainder.toString().padStart(decimals, "0");
  // Trim trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, "");
  return `${whole}.${trimmedFraction}`;
}

/**
 * Format amount for display with specified decimal places
 */
export function formatAmount(
  amount: number | string,
  maxDecimals: number = 6
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";

  // For very small amounts, show more decimals
  if (num > 0 && num < 0.000001) {
    return num.toExponential(2);
  }

  // Remove trailing zeros
  return parseFloat(num.toFixed(maxDecimals)).toString();
}

/**
 * Format USD value
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
