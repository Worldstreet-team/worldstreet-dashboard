/**
 * Error Handling & Sanitization for Swap Operations
 * Provides user-friendly error messages while logging full errors
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Validation Errors
  INVALID_WALLET: 'Please connect your wallet',
  INVALID_AMOUNT: 'Please enter a valid amount',
  ZERO_AMOUNT: 'Amount must be greater than zero',
  PRECISION_OVERFLOW: 'Too many decimal places',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  INVALID_SLIPPAGE: 'Slippage tolerance out of range',
  CHAIN_MISMATCH: 'Tokens must be on the same chain',
  INVALID_TOKEN_ADDRESS: 'Invalid token configuration',
  SAME_TOKEN: 'Cannot swap a token to itself',
  
  // LI.FI Errors
  NO_ROUTE_FOUND: 'No swap route available for this pair',
  QUOTE_EXPIRED: 'Price quote expired, please try again',
  SLIPPAGE_EXCEEDED: 'Price moved beyond slippage tolerance',
  INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity for this amount',
  
  // Blockchain Errors
  USER_REJECTED: 'Transaction cancelled by user',
  INSUFFICIENT_GAS: 'Insufficient gas for transaction',
  RPC_ERROR: 'Network error, please try again',
  TX_FAILED: 'Transaction failed on blockchain',
  TX_REVERTED: 'Transaction reverted',
  
  // System Errors
  DOUBLE_EXECUTION: 'Transaction already in progress',
  POSITION_ERROR: 'Failed to update position',
  DATABASE_ERROR: 'Database error, please contact support',
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

/**
 * Sanitize error for user display
 */
export function sanitizeError(error: unknown): string {
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  if (error instanceof Error) {
    // Check for known error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected') || message.includes('user denied')) {
      return ERROR_MESSAGES.USER_REJECTED;
    }
    
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return ERROR_MESSAGES.INSUFFICIENT_BALANCE;
    }
    
    if (message.includes('slippage')) {
      return ERROR_MESSAGES.SLIPPAGE_EXCEEDED;
    }
    
    if (message.includes('no route') || message.includes('no path')) {
      return ERROR_MESSAGES.NO_ROUTE_FOUND;
    }
    
    if (message.includes('expired')) {
      return ERROR_MESSAGES.QUOTE_EXPIRED;
    }
    
    if (message.includes('reverted')) {
      return ERROR_MESSAGES.TX_REVERTED;
    }
    
    if (message.includes('gas')) {
      return ERROR_MESSAGES.INSUFFICIENT_GAS;
    }
    
    // Return sanitized version of error message (truncated)
    return error.message.slice(0, 100);
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Get error code from error
 */
export function getErrorCode(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'USER_REJECTED';
    }
    
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'INSUFFICIENT_BALANCE';
    }
    
    if (message.includes('slippage')) {
      return 'SLIPPAGE_EXCEEDED';
    }
    
    if (message.includes('no route') || message.includes('no path')) {
      return 'NO_ROUTE_FOUND';
    }
    
    if (message.includes('expired')) {
      return 'QUOTE_EXPIRED';
    }
    
    if (message.includes('reverted')) {
      return 'TX_REVERTED';
    }
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Log error with context
 */
export function logSwapError(
  context: string,
  error: unknown,
  additionalData?: Record<string, any>
) {
  console.error(`[${context}] Error:`, {
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...additionalData,
  });
}
