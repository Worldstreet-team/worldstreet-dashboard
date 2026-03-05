# Dynamic Slippage Architecture - Complete Guide

## 🎯 Overview

This document explains the production-grade dynamic slippage system implemented for multi-chain spot swaps using LI.FI.

### Key Principles

1. **No Manual Slippage Input** - Users never see or set slippage
2. **Automatic Calculation** - Slippage computed from quote characteristics
3. **Backend Enforcement** - All protections enforced server-side
4. **Multi-Chain Support** - Works identically on Solana and EVM chains
5. **Production Safety** - Comprehensive validation and error handling

## 📐 Slippage Calculation Formula

### Base Formula

```
slippage = BASE + priceImpact + routeComplexity + liquidityImpact
```

Where all values are in **basis points (BPS)**:
- 1 BPS = 0.01% = 0.0001
- 100 BPS = 1%
- 10000 BPS = 100%

### Component Breakdown

#### 1. Base Slippage
```
BASE = 50 BPS (0.5%)
```
- Minimum slippage for all swaps
- Accounts for normal market volatility
- Never goes below this value

#### 2. Price Impact Adjustment
```
if priceImpact >= 5%:    add 200 BPS (reject trade)
elif priceImpact >= 3%:  add 150 BPS
elif priceImpact >= 1%:  add 75 BPS
elif priceImpact >= 0.5%: add 25 BPS
else:                     add 0 BPS
```

**Calculation:**
- Extracted from LI.FI quote data
- Fallback: Calculate from input/output USD values
- Rejects trades with >5% price impact

#### 3. Route Complexity Adjustment
```
Cross-chain swap:  add 50 BPS
3+ hops:           add 25 BPS
2 hops:            add 10 BPS
Single hop:        add 0 BPS
```

**Detection:**
- Cross-chain: `fromChainId !== toChainId`
- Hops: Count of `includedSteps` in quote

#### 4. Liquidity Impact Adjustment
```
Trade > $100k:  add 100 BPS
Trade $10k-$100k: add 50 BPS
Trade < $10k:   add 0 BPS
```

**Estimation:**
- Calculate USD value from token amounts and prices
- Larger trades = higher slippage tolerance

### Caps and Floors

```typescript
MIN_BPS = 10    // 0.1% - absolute minimum
MAX_BPS = 500   // 5% - recommended maximum
ABSOLUTE_MAX_BPS = 1000  // 10% - emergency ceiling
```

**Application:**
1. Calculate total slippage
2. Apply floor: `max(slippage, MIN_BPS)`
3. Apply cap: `min(slippage, MAX_BPS)`
4. Emergency check: Never exceed `ABSOLUTE_MAX_BPS`

## 🔄 Execution Flow

### Complete Swap Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                               │
│    - Enter amount (string)                                  │
│    - Select tokens                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SANITIZATION                                             │
│    - Convert string → bigint                                │
│    - Validate format                                        │
│    - Check balance                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. INITIAL QUOTE FETCH                                      │
│    - Fetch from LI.FI with base slippage (0.5%)            │
│    - Cache with 30s TTL                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DYNAMIC SLIPPAGE CALCULATION                             │
│    - Analyze quote characteristics                          │
│    - Calculate: base + impact + complexity + liquidity      │
│    - Apply caps and floors                                  │
│    - Validate result                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FINAL QUOTE FETCH (if slippage changed)                 │
│    - Re-fetch with calculated slippage                      │
│    - Recalculate to ensure accuracy                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. PRE-EXECUTION VALIDATION                                 │
│    - Check quote freshness (<30s old)                       │
│    - Validate price impact (<5%)                            │
│    - Validate slippage bounds                               │
│    - Check transaction data exists                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. TRANSACTION BUILD                                        │
│    Solana:                    EVM:                          │
│    - Deserialize TX           - Build TX object             │
│    - Sign with keypair        - Estimate gas                │
│    - Get fresh blockhash      - Sign with wallet            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SIMULATION (optional)                                    │
│    Solana:                    EVM:                          │
│    - simulateTransaction()    - estimateGas()               │
│    - Check for errors         - Validate execution          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. EXECUTION                                                │
│    - Send transaction                                       │
│    - Wait for confirmation                                  │
│    - Handle errors                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. RETRY LOGIC (if slippage error)                        │
│     - Detect slippage error                                 │
│     - Retry ONCE with fresh quote                           │
│     - Never retry other errors                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. RESULT                                                  │
│     Success: Return TX hash                                 │
│     Failure: Return error details                           │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Security Protections

### 1. Quote Freshness
```typescript
MAX_AGE = 30 seconds
```
- Quotes expire after 30s
- Revalidated before execution
- Prevents stale price execution

### 2. Price Impact Limits
```typescript
MAX_PRICE_IMPACT = 500 BPS (5%)
```
- Rejects trades with >5% impact
- Warns on >3% impact
- Protects against illiquid pools

### 3. Slippage Bounds
```typescript
MIN = 10 BPS (0.1%)
MAX = 500 BPS (5%)
ABSOLUTE_MAX = 1000 BPS (10%)
```
- Never below 0.1%
- Capped at 5% (recommended)
- Emergency ceiling at 10%

### 4. Execution Deadline
```typescript
Solana: 150 seconds (blockhash lifetime)
EVM: 120 seconds (2 minutes)
```
- Prevents delayed execution
- Protects against price changes

### 5. Simulation Validation
```typescript
Solana: simulateTransaction()
EVM: estimateGas()
```
- Catches errors before execution
- Validates transaction will succeed
- Optional but recommended

### 6. Retry Protection
```typescript
MAX_RETRIES = 1
RETRY_ONLY_ON_SLIPPAGE_ERROR = true
```
- Only retries slippage errors
- Never retries user rejections
- Never retries network errors
- Prevents infinite loops

### 7. Idempotency
```typescript
requestId = `quote-${timestamp}-${random}`
```
- Each quote has unique ID
- Tracks execution attempts
- Prevents double execution

## 🔐 Why Removing minReceived is Safe

### The Problem with Manual minReceived

**Manual minReceived is UNSAFE because:**
1. Users don't understand basis points
2. Users set it too low (vulnerable to MEV)
3. Users set it too high (transactions fail)
4. Requires complex UI calculations
5. Prone to floating-point errors

### Our Solution: Backend-Enforced Protection

**We remove minReceived from UI but enforce it in backend:**

```typescript
// UI: User never sees this
// Backend: Automatically calculated
minReceived = expectedAmount * (10000 - slippageBps) / 10000
```

**Why this is safe:**
1. ✅ **Slippage is calculated dynamically** - Adapts to market conditions
2. ✅ **Backend enforced** - Users can't bypass protections
3. ✅ **Bigint math** - No precision loss
4. ✅ **Validated before execution** - Multiple safety checks
5. ✅ **Capped at maximum** - Never exceeds 5% (10% emergency)

### Protocol-Level Protection

**LI.FI (and other aggregators) enforce minOut at protocol level:**

```solidity
// Simplified example
require(amountOut >= minOut, "Slippage exceeded");
```

**Our system:**
- Calculates optimal `minOut` automatically
- Passes it to LI.FI in the quote request
- LI.FI builds transaction with this protection
- Transaction reverts if slippage exceeded

**Result:** Users are protected without seeing complex parameters.

## 🌐 Chain-Specific Considerations

### Solana

**Unique Challenges:**
- Blockhash expires after ~150 seconds
- No gas estimation (compute units)
- Simulation can be flaky
- Confirmation can timeout

**Our Handling:**
```typescript
// Get fresh blockhash before execution
const { blockhash, lastValidBlockHeight } = 
  await connection.getLatestBlockhash('confirmed');

// Confirm with blockhash strategy
await connection.confirmTransaction({
  signature,
  blockhash,
  lastValidBlockHeight,
}, 'confirmed');

// Handle timeout gracefully
if (timeout) {
  // TX may still succeed - return with warning
  return { success: true, txHash: signature };
}
```

### EVM Chains

**Unique Challenges:**
- Gas price volatility
- Reorgs possible
- MEV attacks common
- Different chains have different block times

**Our Handling:**
```typescript
// Estimate gas with buffer
const gasEstimate = await provider.estimateGas(tx);
tx.gasLimit = gasEstimate * 120n / 100n; // +20% buffer

// Wait for confirmation
const receipt = await txResponse.wait(1);

// Check status
if (receipt.status === 0) {
  throw new Error('Transaction reverted');
}
```

## 📊 Example Calculations

### Example 1: Simple Swap (Low Impact)

**Input:**
- Swap: 100 USDC → SOL
- Price Impact: 0.3%
- Route: Single hop (direct)
- Trade Size: $100

**Calculation:**
```
BASE = 50 BPS
+ priceImpact (0.3% < 0.5%) = 0 BPS
+ routeComplexity (single hop) = 0 BPS
+ liquidityImpact ($100 < $10k) = 0 BPS
= 50 BPS (0.5%)
```

**Result:** 0.5% slippage

### Example 2: Complex Cross-Chain Swap

**Input:**
- Swap: 10,000 USDC (Ethereum) → SOL (Solana)
- Price Impact: 1.5%
- Route: Cross-chain, 2 hops
- Trade Size: $10,000

**Calculation:**
```
BASE = 50 BPS
+ priceImpact (1.5% > 1%) = 75 BPS
+ routeComplexity (cross-chain + 2 hops) = 50 + 10 = 60 BPS
+ liquidityImpact ($10k) = 50 BPS
= 235 BPS (2.35%)
```

**Result:** 2.35% slippage

### Example 3: Large Trade (High Impact)

**Input:**
- Swap: 500,000 USDC → ETH
- Price Impact: 4%
- Route: Single hop
- Trade Size: $500,000

**Calculation:**
```
BASE = 50 BPS
+ priceImpact (4% > 3%) = 150 BPS
+ routeComplexity (single hop) = 0 BPS
+ liquidityImpact ($500k > $100k) = 100 BPS
= 300 BPS (3%)
```

**Result:** 3% slippage

### Example 4: Extreme Impact (Rejected)

**Input:**
- Swap: 1,000,000 USDC → Illiquid Token
- Price Impact: 8%
- Route: Multi-hop
- Trade Size: $1,000,000

**Calculation:**
```
BASE = 50 BPS
+ priceImpact (8% > 5%) = 200 BPS (REJECT)
```

**Result:** ❌ Trade rejected - price impact too high

## 🔧 Integration Guide

### Step 1: Import Services

```typescript
import { fetchQuote, validateQuote } from '@/services/spot/quoteService';
import { executeSwap } from '@/services/spot/executionService';
```

### Step 2: Fetch Quote

```typescript
const quoteResponse = await fetchQuote({
  fromChain: 1, // Ethereum
  toChain: 1151111081099710, // Solana
  fromToken: '0x...', // USDC address
  toToken: 'So11...', // SOL address
  fromAmount: '1000000', // 1 USDC (6 decimals)
  fromAddress: userWalletAddress,
});

// Slippage is automatically calculated
console.log('Slippage:', quoteResponse.slippage.slippageBps, 'BPS');
console.log('Min Received:', quoteResponse.slippage.minReceived);
```

### Step 3: Display to User (NO slippage input!)

```typescript
// Show user:
// - From amount
// - To amount (expected)
// - Estimated fees
// - Estimated time

// DO NOT show:
// - Slippage percentage
// - Minimum received
// - Price impact (unless high)
```

### Step 4: Execute Swap

```typescript
const result = await executeSwap({
  quote: quoteResponse,
  userAddress: userWalletAddress,
  privateKey: decryptedPrivateKey,
  chainType: 'solana', // or 'evm'
  rpcUrl: SOLANA_RPC_URL,
});

if (result.success) {
  console.log('Swap successful:', result.txHash);
} else {
  console.error('Swap failed:', result.error);
}
```

## 🚨 Error Handling

### Slippage Errors (Retryable)

```typescript
// Automatically retried once
Error codes:
- 0x1788
- SLIPPAGE_EXCEEDED
- INSUFFICIENT_OUTPUT_AMOUNT
- PRICE_SLIPPAGE_CHECK
```

### Non-Retryable Errors

```typescript
// Never retried:
- User rejection
- Insufficient balance
- Network errors
- Invalid transaction
- Quote expired
```

### Error Response

```typescript
{
  success: false,
  error: "Slippage exceeded - please try again",
  retried: true,
  executionTime: 5234
}
```

## 📈 Monitoring & Logging

### Key Metrics to Track

1. **Slippage Distribution**
   - Average slippage per swap
   - Min/max slippage values
   - Slippage by route type

2. **Execution Success Rate**
   - Overall success rate
   - Success rate by chain
   - Retry success rate

3. **Quote Freshness**
   - Average quote age at execution
   - Expired quote rate
   - Cache hit rate

4. **Price Impact**
   - Average price impact
   - High impact warning rate
   - Rejected trade rate

### Logging Example

```typescript
console.log('[Swap]', {
  requestId: 'quote-123-abc',
  fromChain: 'ethereum',
  toChain: 'solana',
  slippageBps: 235,
  priceImpactBps: 150,
  executionTime: 3456,
  retried: false,
  success: true,
});
```

## ✅ Best Practices

### DO:
- ✅ Always validate quote freshness before execution
- ✅ Use bigint for all token amount calculations
- ✅ Log all slippage calculations for monitoring
- ✅ Show warnings for high price impact (>3%)
- ✅ Implement proper error handling
- ✅ Use AbortController for quote requests
- ✅ Cache quotes with TTL
- ✅ Simulate transactions before execution

### DON'T:
- ❌ Show slippage input to users
- ❌ Allow manual minReceived override
- ❌ Use floating point for token amounts
- ❌ Retry non-slippage errors
- ❌ Execute stale quotes (>30s)
- ❌ Skip validation steps
- ❌ Ignore price impact warnings
- ❌ Execute without simulation

## 🎓 Summary

This dynamic slippage system provides:

1. **Automatic Protection** - No user configuration needed
2. **Adaptive Slippage** - Adjusts to market conditions
3. **Multi-Chain Support** - Works on Solana and EVM
4. **Production Safety** - Comprehensive validation
5. **MEV Protection** - Optimal slippage prevents sandwich attacks
6. **User-Friendly** - Simple UI without complex parameters

**Result:** Professional-grade swap experience with institutional-level protection.

---

**Questions?** Review the code in:
- `src/lib/swap/slippage.ts` - Slippage calculation
- `src/services/spot/quoteService.ts` - Quote management
- `src/services/spot/executionService.ts` - Swap execution
