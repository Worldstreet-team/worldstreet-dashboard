# LI.FI Decentralized Spot Trading Architecture

## 1. ARCHITECTURAL OVERVIEW

### System Design Philosophy
This is a **decentralized spot trading system** that simulates traditional exchange behavior using on-chain swaps via LI.FI. Unlike centralized exchanges with internal order books, every trade is an actual blockchain transaction.

### Core Concepts

#### BUY Operation
```
User Action: Buy BTC with USDT
Flow:
1. User has USDT in wallet
2. Swap USDT → BTC via LI.FI
3. BTC received in wallet
4. Create/update position record in database
5. Track entry price, amount, cost basis
```

#### SELL Operation
```
User Action: Sell BTC for USDT
Flow:
1. User has BTC in wallet
2. Swap BTC → USDT via LI.FI
3. USDT received in wallet
4. Reduce/close position in database
5. Calculate realized PnL
```

### Token Direction Logic

#### For BUY (Spend Quote, Get Base)
```typescript
Pair: BTC-USDT
Side: BUY

fromToken: USDT (quote asset)
toToken: BTC (base asset)
fromAmount: User's USDT amount (in smallest unit)
Result: Receive BTC, create/increase position
```

#### For SELL (Spend Base, Get Quote)
```typescript
Pair: BTC-USDT
Side: SELL

fromToken: BTC (base asset)
toToken: USDT (quote asset)
fromAmount: User's BTC amount (in smallest unit)
Result: Receive USDT, reduce/close position
```

### Chain & Token Resolution

```typescript
interface TokenMetadata {
  symbol: string;
  chainId: number;
  address: string; // Contract address (EVM) or mint address (Solana)
  decimals: number;
  name: string;
}

// Example: BTC-USDT on Ethereum
{
  base: {
    symbol: 'WBTC',
    chainId: 1,
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8
  },
  quote: {
    symbol: 'USDT',
    chainId: 1,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6
  }
}
```

## 2. DECIMAL HANDLING & AMOUNT CONVERSION

### Critical Rules
1. **NEVER use floating point math for token amounts**
2. **ALWAYS use bigint for calculations**
3. **Convert to smallest unit before API calls**
4. **Validate precision doesn't exceed token decimals**

### Conversion Functions

```typescript
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
    throw new Error(`Invalid amount: ${error.message}`);
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
```

## 3. SLIPPAGE HANDLING

### Slippage Configuration

```typescript
export const SLIPPAGE_CONFIG = {
  MIN: 0.1, // 0.1%
  MAX: 5.0, // 5%
  DEFAULT: 0.5, // 0.5%
  RECOMMENDED: {
    STABLE: 0.1, // Stablecoin swaps
    MAJOR: 0.5, // BTC, ETH
    VOLATILE: 1.0, // Altcoins
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
```

## 4. VALIDATION PIPELINE

### Pre-Swap Validation Checklist

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
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
    return { valid: false, error: error.message, code: 'CONVERSION_ERROR' };
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
```

## 5. ERROR HANDLING & SANITIZATION

### Error Code Mapping

```typescript
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
    
    // Return sanitized version of error message
    return error.message.slice(0, 100);
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
```

## 6. RACE CONDITION PREVENTION

### Execution Lock Pattern

```typescript
/**
 * Prevent double-click and concurrent execution
 */
class SwapExecutionLock {
  private locks: Map<string, boolean> = new Map();
  
  /**
   * Acquire lock for a specific user+pair
   */
  acquire(userId: string, pair: string): boolean {
    const key = `${userId}:${pair}`;
    
    if (this.locks.get(key)) {
      return false; // Already locked
    }
    
    this.locks.set(key, true);
    return true;
  }
  
  /**
   * Release lock
   */
  release(userId: string, pair: string): void {
    const key = `${userId}:${pair}`;
    this.locks.delete(key);
  }
  
  /**
   * Execute with automatic lock/unlock
   */
  async execute<T>(
    userId: string,
    pair: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.acquire(userId, pair)) {
      throw new Error('DOUBLE_EXECUTION');
    }
    
    try {
      return await fn();
    } finally {
      this.release(userId, pair);
    }
  }
}

export const swapLock = new SwapExecutionLock();
```

### AbortController Usage

```typescript
/**
 * Abort controller for cancellable operations
 */
export class SwapAbortController {
  private controller: AbortController;
  
  constructor() {
    this.controller = new AbortController();
  }
  
  get signal() {
    return this.controller.signal;
  }
  
  abort(reason?: string) {
    this.controller.abort(reason);
  }
  
  /**
   * Create fetch with timeout
   */
  async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const timeout = setTimeout(() => {
      this.abort('Request timeout');
    }, timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: this.signal,
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}
```

---

**This is Part 1 of the architecture document. Continue to next file for implementation details.**
