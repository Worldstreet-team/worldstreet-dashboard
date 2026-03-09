# Spot Balances Critical Fixes

## Issues Fixed

### 1. Missing Dependency in `refreshPositions`

**Problem:** `getSpotMarketName` was called inside `refreshPositions` but not included in the dependency array.

**Impact:** The function used a stale closure with an empty `spotMarkets` map, causing market names to fall back to "Spot ${index}".

**Fix:**
```typescript
// Before
}, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, getMarketName]);

// After
}, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, getMarketName, getSpotMarketName]);
```

### 2. Double Division by Decimals

**Problem:** `client.getTokenAmount()` already returns the amount in human-readable precision, but the code was dividing by `10^decimals` again.

**Impact:** All balances showed as near-zero values (e.g., 0.0000001 instead of 100).

**Fix:**
```typescript
// Before
const tokenAmount = client.getTokenAmount(
  position.scaledBalance,
  marketAccount,
  position.balanceType
);
amount = tokenAmount.toNumber() / Math.pow(10, decimals); // ❌ Double division!

// After
const tokenAmount = client.getTokenAmount(
  position.scaledBalance,
  marketAccount,
  position.balanceType
);
amount = tokenAmount.toNumber(); // ✅ Already in correct precision
```

### 3. Missing Null Guard

**Problem:** Code accessed `position.scaledBalance` without checking if `position` exists first.

**Impact:** If a market has no position, `position` is `undefined`, causing a crash when accessing `.scaledBalance`.

**Fix:**
```typescript
// Before
if (position && !position.scaledBalance.isZero()) {
  // ❌ What if position.scaledBalance is undefined?
}

// After
if (position && position.scaledBalance && !position.scaledBalance.isZero()) {
  // ✅ Safe null check
}
```

## Root Cause Analysis

The balances were showing as 0 because:

1. **Stale closure** → Market names weren't being resolved correctly
2. **Double division** → Balances were divided by 10^6 or 10^9 twice, resulting in microscopic values
3. **Silent failures** → Null access errors were caught and logged but not visible to user

## How Drift SDK Works

### `getTokenAmount()` Return Value

The Drift SDK's `getTokenAmount()` method:
- Takes: `scaledBalance` (BN), `marketAccount`, `balanceType`
- Returns: Token amount in **human-readable precision** (already divided by decimals)
- Example: For 100 USDC, it returns `100`, NOT `100000000`

### Correct Usage Pattern

```typescript
// ✅ Correct
const tokenAmount = client.getTokenAmount(
  position.scaledBalance,
  marketAccount,
  position.balanceType
);
const amount = tokenAmount.toNumber(); // 100.0

// ❌ Wrong
const amount = tokenAmount.toNumber() / Math.pow(10, decimals); // 0.0001
```

## Testing Checklist

After these fixes, verify:

- [ ] Balances show correct values (not 0 or microscopic numbers)
- [ ] Market names display correctly (not "Spot 0", "Spot 1")
- [ ] No console errors about undefined properties
- [ ] Balances update after deposits/withdrawals
- [ ] Both base and quote balances show correctly

## Console Logs to Check

Look for these in browser console:

```
✅ Good:
[DriftContext] Spot position USDC: 100.5 (deposit)
[DriftContext] Spot position SOL: 2.5 (deposit)
[useSpotBalances] Base (SOL): 2.5 (deposited)
[useSpotBalances] Quote (USDC): 100.5 (deposited)

❌ Bad (before fix):
[DriftContext] Spot position USDC: 0.0001005 (deposit)  // Double division!
[DriftContext] Spot position Spot 1: 0.000025 (deposit) // Wrong name!
```

## Related Files Modified

1. `src/app/context/driftContext.tsx`
   - Fixed `refreshPositions` dependency array
   - Removed double division in `getTokenAmount`
   - Added null guard for `position.scaledBalance`

2. `src/hooks/useSpotBalances.ts`
   - No changes needed (already correct)

## Migration Notes

If you have existing code that manually divides by decimals after calling `getTokenAmount()`, remove that division:

```typescript
// Find and fix patterns like this:
const amount = client.getTokenAmount(...).toNumber() / Math.pow(10, decimals);
// Change to:
const amount = client.getTokenAmount(...).toNumber();
```

## Performance Impact

These fixes have no performance impact. They only correct the logic to properly handle Drift SDK return values.

## Backward Compatibility

These fixes are backward compatible. They correct bugs without changing the API or behavior of the hooks.
