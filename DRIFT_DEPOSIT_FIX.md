# Drift Deposit/Withdrawal Fix - Stale Market Data Issue

## Problem

Older accounts were experiencing deposit failures with the error:
```
TypeError: Cannot read properties of undefined (reading 'dataAndSlot')
  at h.getSpotMarketAccountAndSlot
```

This occurred because the Drift client was trying to access spot market data (specifically USDC market index 0) before it was fully loaded from the blockchain.

## Root Cause

1. **Insufficient Market Data Verification**: The original code only checked if `spotMarkets.length > 0` but didn't verify that individual market accounts were actually loaded and accessible.

2. **Race Condition**: For older accounts with cached/stale data, the WebSocket subscription might complete before market account data is fully populated.

3. **Missing Null Checks**: The code accessed `usdcMarket.marketIndex` without first checking if `usdcMarket` was null/undefined.

## Solution

### 1. Enhanced Market Data Verification (Deposit Function)

Added robust retry logic with explicit null checking:

```typescript
const MAX_MARKET_WAIT_ATTEMPTS = 10;
const MARKET_WAIT_DELAY = 500;
let marketDataReady = false;

for (let i = 0; i < MAX_MARKET_WAIT_ATTEMPTS; i++) {
  try {
    const spotMarkets = client.getSpotMarketAccounts();
    
    if (spotMarkets && spotMarkets.length > 0) {
      // CRITICAL: Explicit null check before accessing properties
      const usdcMarket = client.getSpotMarketAccount(0);
      
      if (!usdcMarket) {
        throw new Error('USDC market account not loaded');
      }
      
      // Verify market has required properties
      if (typeof usdcMarket.marketIndex === 'undefined') {
        throw new Error('USDC market account incomplete');
      }
      
      if (usdcMarket.marketIndex === 0) {
        console.log('[DriftContext] ✅ USDC market fully accessible');
        marketDataReady = true;
        break;
      }
    }
  } catch (checkErr) {
    console.warn(`Market check attempt ${i + 1} failed:`, checkErr);
  }

  if (i < MAX_MARKET_WAIT_ATTEMPTS - 1) {
    await new Promise(resolve => setTimeout(resolve, MARKET_WAIT_DELAY));
  }
}

if (!marketDataReady) {
  throw new Error('Market data not available. Please refresh the page and try again.');
}
```

### 2. Final Verification Before Deposit

Added a final null check right before using the USDC market:

```typescript
// CRITICAL: Double-check USDC market is accessible before using it
const usdcMarket = client.getSpotMarketAccount(0);
if (!usdcMarket) {
  console.error('[DriftContext] ❌ CRITICAL: USDC market is null after verification passed!');
  throw new Error('USDC market account not available. Please refresh the page and try again.');
}
```

### 3. Same Protection for Withdrawals

Applied identical market data verification logic to the `withdrawCollateral` function to prevent the same issue during withdrawals.

### 4. Clear Cached PIN on Logout

Updated `authContext.tsx` to clear the temporary PIN from localStorage when users log out:

```typescript
const logout = useCallback(async () => {
  // Clear cached PIN from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('worldstreet_temp_pin');
  }
  await signOut({ redirectUrl: "https://www.worldstreetgold.com/login" });
}, [signOut]);
```

## Benefits

1. **Prevents Race Conditions**: Waits up to 5 seconds (10 attempts × 500ms) for market data to load
2. **Explicit Null Checking**: Verifies market account exists before accessing properties
3. **Better Error Messages**: Provides clear feedback when market data isn't available
4. **Consistent Behavior**: Same protection for both deposits and withdrawals
5. **Security**: Clears sensitive PIN data on logout

## Testing Recommendations

1. Test with older accounts that previously failed
2. Test with slow network connections
3. Test rapid deposit/withdrawal sequences
4. Verify error messages are user-friendly
5. Confirm PIN is cleared after logout

## Files Modified

- `src/app/context/driftContext.tsx` - Enhanced market data verification for deposits and withdrawals
- `src/app/context/authContext.tsx` - Clear cached PIN on logout
