/**
 * Symbiosis API Response Validator & Cleaner
 * 
 * Validates and prepares cross-chain swap data from Symbiosis API
 * for safe execution in wallet transactions.
 */

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name?: string;
}

interface Fee {
  symbol: string;
  address: string;
  amount: string;
  decimals: number;
  chainId: number;
  description?: string;
}

interface Route {
  provider: string;
  tokens: Token[];
}

interface TransactionData {
  to: string;
  from: string;
  data: string;
  value: string;
  feeLimit?: string;
  functionSelector?: string;
  chainId?: number;
}

interface SymbiosisQuote {
  fee?: Fee;
  fees?: Fee[];
  routes?: Route[];
  tokenAmountOut?: {
    amount: string;
    decimals: number;
    symbol: string;
    address: string;
    chainId: number;
  };
  tokenAmountOutMin?: {
    amount: string;
    decimals: number;
  };
  amountInUsd?: {
    amount: string;
  };
  priceImpact?: string;
  tx?: TransactionData;
  estimatedTime?: number;
}

interface ValidatedSwapData {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  
  // Validated data
  fromToken?: Token;
  toToken?: Token;
  amountIn?: string;
  amountOut?: string;
  amountOutMin?: string;
  
  // Transaction details
  tx?: {
    to: string;
    from: string;
    data: string;
    value: string;
    feeLimit: string;
    chainId: number;
  };
  
  // Fees
  aggregatedFees: {
    symbol: string;
    amount: string;
    amountHuman: string;
    usdValue?: string;
  }[];
  totalFeeUsd?: string;
  
  // Routes
  routes: Route[];
  
  // Price info
  priceImpact?: number;
  estimatedTime?: number;
}

/**
 * Validate and prepare Symbiosis quote for execution
 */
export function validateSymbiosisQuote(
  quote: SymbiosisQuote,
  fromToken: Token,
  toToken: Token,
  amountIn: string
): ValidatedSwapData {
  const errors: string[] = [];
  const warnings: string[] = [];
  const aggregatedFees: ValidatedSwapData['aggregatedFees'] = [];

  // 1. Validate transaction data
  if (!quote.tx) {
    errors.push("Missing transaction data (tx)");
  } else {
    if (!quote.tx.to || quote.tx.to === "") {
      errors.push("Transaction 'to' address is missing");
    }
    if (!quote.tx.from || quote.tx.from === "") {
      errors.push("Transaction 'from' address is missing");
    }
    if (!quote.tx.data || quote.tx.data === "") {
      errors.push("Transaction 'data' is missing");
    }
    if (quote.tx.value === undefined) {
      warnings.push("Transaction 'value' is missing, defaulting to 0");
    }
  }

  // 2. Validate output amounts
  if (!quote.tokenAmountOut) {
    errors.push("Missing tokenAmountOut");
  } else {
    if (!quote.tokenAmountOut.amount || quote.tokenAmountOut.amount === "0") {
      errors.push("Output amount is zero or missing");
    }
    if (!quote.tokenAmountOut.decimals) {
      errors.push("Output token decimals missing");
    }
  }

  if (!quote.tokenAmountOutMin) {
    warnings.push("Missing tokenAmountOutMin (slippage protection)");
  }

  // 3. Validate and aggregate fees
  const allFees: Fee[] = [];
  
  if (quote.fee) {
    allFees.push(quote.fee);
  }
  
  if (quote.fees && Array.isArray(quote.fees)) {
    allFees.push(...quote.fees);
  }

  for (const fee of allFees) {
    if (!fee.symbol || !fee.amount || fee.decimals === undefined) {
      warnings.push(`Invalid fee entry: ${JSON.stringify(fee)}`);
      continue;
    }

    // Convert to human-readable amount
    const amountHuman = (
      parseFloat(fee.amount) / Math.pow(10, fee.decimals)
    ).toFixed(6);

    aggregatedFees.push({
      symbol: fee.symbol,
      amount: fee.amount,
      amountHuman,
      usdValue: undefined, // Could be calculated if price data available
    });

    // Flag high cross-chain fees
    if (fee.description?.toLowerCase().includes("cross-chain")) {
      const feeValue = parseFloat(amountHuman);
      if (feeValue > 10) {
        warnings.push(`High cross-chain fee: ${amountHuman} ${fee.symbol}`);
      }
    }
  }

  // 4. Validate routes
  const validRoutes: Route[] = [];
  
  if (quote.routes && Array.isArray(quote.routes)) {
    for (const route of quote.routes) {
      if (!route.tokens || !Array.isArray(route.tokens)) {
        warnings.push("Route missing tokens array");
        continue;
      }

      let routeValid = true;
      for (const token of route.tokens) {
        if (!token.address || token.address === "") {
          warnings.push(
            `Token ${token.symbol} on chain ${token.chainId} has empty address`
          );
          routeValid = false;
        }
        if (!token.symbol || !token.chainId) {
          warnings.push(`Token missing symbol or chainId: ${JSON.stringify(token)}`);
          routeValid = false;
        }
      }

      if (routeValid) {
        validRoutes.push(route);
      }
    }
  } else {
    warnings.push("No routes provided in quote");
  }

  // 5. Validate price impact
  let priceImpactNum: number | undefined;
  if (quote.priceImpact) {
    priceImpactNum = parseFloat(quote.priceImpact);
    
    if (priceImpactNum > 5) {
      warnings.push(`High price impact: ${priceImpactNum.toFixed(2)}%`);
    }
    
    if (priceImpactNum > 15) {
      errors.push(`Excessive price impact: ${priceImpactNum.toFixed(2)}% - transaction may fail`);
    }
    
    if (priceImpactNum < 0) {
      warnings.push(`Negative price impact: ${priceImpactNum.toFixed(2)}% - verify quote accuracy`);
    }
  }

  // 6. Calculate amounts
  const amountOut = quote.tokenAmountOut
    ? (parseFloat(quote.tokenAmountOut.amount) / Math.pow(10, quote.tokenAmountOut.decimals)).toString()
    : "0";

  const amountOutMin = quote.tokenAmountOutMin
    ? (parseFloat(quote.tokenAmountOutMin.amount) / Math.pow(10, quote.tokenAmountOutMin.decimals)).toString()
    : "0";

  // 7. Prepare transaction data
  let txData: ValidatedSwapData['tx'] | undefined;
  
  if (quote.tx) {
    txData = {
      to: quote.tx.to || "",
      from: quote.tx.from || "",
      data: quote.tx.data || "0x",
      value: quote.tx.value || "0",
      feeLimit: quote.tx.feeLimit || "100000000", // Default 100 TRX for Tron
      chainId: quote.tx.chainId || fromToken.chainId,
    };
  }

  // 8. Final validation
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    fromToken,
    toToken,
    amountIn,
    amountOut,
    amountOutMin,
    tx: txData,
    aggregatedFees,
    routes: validRoutes,
    priceImpact: priceImpactNum,
    estimatedTime: quote.estimatedTime,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationErrors(result: ValidatedSwapData): string {
  if (result.isValid) {
    return "";
  }

  const messages: string[] = [];
  
  if (result.errors.length > 0) {
    messages.push("Errors:");
    messages.push(...result.errors.map(e => `  • ${e}`));
  }
  
  if (result.warnings.length > 0) {
    messages.push("Warnings:");
    messages.push(...result.warnings.map(w => `  • ${w}`));
  }

  return messages.join("\n");
}

/**
 * Check if quote is executable
 */
export function isQuoteExecutable(result: ValidatedSwapData): boolean {
  return result.isValid && result.tx !== undefined;
}

/**
 * Get human-readable fee summary
 */
export function getFeeSummary(result: ValidatedSwapData): string {
  if (result.aggregatedFees.length === 0) {
    return "No fees";
  }

  return result.aggregatedFees
    .map(fee => `${fee.amountHuman} ${fee.symbol}`)
    .join(" + ");
}
