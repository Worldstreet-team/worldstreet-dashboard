# Drift Deposit/Withdrawal Fix - Stale Market Data Issue

## Problem

Older accounts were experiencing deposit failures with the error:
```
TypeError: Cannot read properties of undefined (reading 'dataAndSlot')
  at h.getSpotMarketAccountAndSlot
```

This occurred because the Drift client was trying to access spot market data (specifically USDC market index 0) before it was fully loaded from the blockchain.

## Root Cause

1. **Stale Account Subscriber Cache**: The Drift SDK's internal `spotMarketAccountAndSlots[marketIndex].dataAndSlot` structure becomes undefined between market data verification and transaction building.

2. **Cache Inconsistency**: While `client.getSpotMarketAccount()` returns market data successfully, the internal `getSpotMarketAccountAndSlot()` method (used by `deposit()`) fails because the `dataAndSlot` property is missing.

3. **Incomplete Fetch**: `client.fetchAccounts()` only refreshes user account data, not the market account cache structure that `deposit()` requires internally.

## Solution

### 1. Enhanced Market Data Verification with Re-subscription

Added comprehensive checks and automatic re-subscription if the internal cache structure is incomplete:

```typescript
// Fetch both user accounts AND market accounts
await Promise.all([
  client.fetchAccounts(), // User account data
  client.accountSubscriber.fetch(), // Market account data
]);

// CRITICAL: Verify the internal dataAndSlot structure exists
const accountSubscriber = client.accountSubscriber as any;
const spotMarketAccountAndSlots = accountSubscriber.spotMarketAccountAndSlots;

// If the internal structure is missing or incomplete, force a re-subscription
if (!spotMarketAccountAndSlots || !spotMarketAccountAndSlots[marketIndex]?.dataAndSlot) {
  console.warn('[DriftContext] ⚠️ Internal market data structure incomplete, forcing re-subscription...');
  
  // Unsubscribe and re-subscribe to force fresh data
  if (client.isSubscribed) {
    await client.unsubscribe();
  }
  
  await client.subscribe();
  
  // Wait for subscription to populate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Fetch again after re-subscription
  await Promise.all([
    client.fetchAccounts(),
    client.accountSubscriber.fetch(),
  ]);
  
  // Verify the structure is now populated
  const reCheckSlots = (client.accountSubscriber as any).spotMarketAccountAndSlots;
  if (!reCheckSlots?.[marketIndex]?.dataAndSlot) {
    throw new Error('Unable to load market data structure. Please refresh the page and try again.');
  }
}

// Test getSpotMarketAccountAndSlot directly before deposit
const marketAccountAndSlot = client.getSpotMarketAccountAndSlot(marketIndex);
if (!marketAccountAndSlot?.data || typeof marketAccountAndSlot?.slot === 'undefined') {
  throw new Error('Market data structure incomplete. Please refresh the page and try again.');
}
```

This ensures the internal cache structure is properly populated before calling `deposit()`.

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

1. **Fixes Cache Staleness**: Automatically detects and repairs stale account subscriber cache by forcing re-subscription
2. **Validates Internal Structure**: Checks the exact `dataAndSlot` structure that the SDK requires internally
3. **Prevents Deposit Failures**: Tests `getSpotMarketAccountAndSlot()` directly before calling `deposit()` to ensure it will succeed
4. **Better Error Messages**: Provides clear feedback when market data structure is incomplete
5. **Consistent Behavior**: Same protection for both deposits and withdrawals
6. **Security**: Clears sensitive PIN data on logout

## Testing Recommendations

1. Test with older accounts that previously failed
2. Test with slow network connections
3. Test rapid deposit/withdrawal sequences
4. Verify error messages are user-friendly
5. Confirm PIN is cleared after logout

## Files Modified

- `src/app/context/driftContext.tsx` - Enhanced market data verification for deposits and withdrawals
- `src/app/context/authContext.tsx` - Clear cached PIN on logout
