# USDC Balance Fix - Summary

## The Problem

USDC balances were showing as 0 in spot trading forms (BinanceOrderForm, MobileTradingForm) even when users had USDC deposited in Drift.

## Root Cause

**USDC (spot market index 0) is the collateral token in Drift Protocol.**

It's NOT stored in `spotPositions` like other tokens (SOL, BTC, ETH). Instead, it's stored as:
- `summary.totalCollateral` - Total USDC deposited
- `summary.freeCollateral` - USDC available for trading (not locked as margin)

The `useSpotBalances` hook was trying to read USDC from `spotPositions`, which is why it always returned 0.

## The Fix

Updated `useSpotBalances` hook to handle USDC specially:

```typescript
// SPECIAL CASE: USDC (market index 0) is collateral
if (quoteMarketIndex === 0) {
  quoteAmount = summary?.freeCollateral ?? 0;
  quoteBorrowed = false; // Collateral is never borrowed
  console.log(`[useSpotBalances] Quote (USDC - Collateral):`, quoteAmount, '(free collateral)');
} else {
  // Regular spot token - use spotPositions
  const quotePosition = spotPositions.find(p => p.marketIndex === quoteMarketIndex);
  if (quotePosition) {
    quoteAmount = quotePosition.amount;
    quoteBorrowed = quotePosition.balanceType === 'borrow';
  }
}
```

Also handles the case where USDC is the base token (less common but possible).

## Files Modified

1. **src/hooks/useSpotBalances.ts**
   - Added `summary` from `useDrift()` context
   - Added special case for market index 0 (USDC)
   - Added `summary` to dependency array
   - Updated documentation

## What Changed

### Before (WRONG)
```typescript
// Tried to find USDC in spotPositions
const quotePosition = spotPositions.find(p => p.marketIndex === 0);
// Result: undefined → balance = 0
```

### After (CORRECT)
```typescript
// Check if quote is USDC (index 0)
if (quoteMarketIndex === 0) {
  quoteAmount = summary?.freeCollateral ?? 0;
  // Result: Actual USDC balance from collateral
}
```

## Why freeCollateral?

- `totalCollateral` = All USDC deposited (including margin for futures)
- `freeCollateral` = USDC available for spot trading

For spot trading UI, we want `freeCollateral` because that's what the user can actually use to buy tokens.

## Example Scenario

```
User has:
- 1000 USDC deposited to Drift
- 300 USDC locked as margin for futures position

Result:
- totalCollateral = 1000 USDC
- freeCollateral = 700 USDC ← This is what shows in spot trading form
```

## Testing

### Expected Console Logs

```
✅ Correct (after fix):
[useSpotBalances] Quote (USDC - Collateral): 700 (free collateral)
[useSpotBalances] Base (SOL): 10.5 (deposited)

❌ Wrong (before fix):
[useSpotBalances] No quote position found for market index 0
[useSpotBalances] Quote (USDC): 0 (deposited)
```

### UI Verification

1. Open spot trading page (e.g., SOL/USDC)
2. Check "Available" balance
3. Should show actual USDC balance, not 0
4. Try percentage buttons (25%, 50%, 75%, 100%)
5. Should calculate correct amounts

## Affected Trading Pairs

All pairs with USDC as quote token:
- ✅ SOL/USDC
- ✅ BTC/USDC
- ✅ ETH/USDC
- ✅ Any token/USDC

## Components Using This Fix

1. `src/components/spot/BinanceOrderForm.tsx`
2. `src/components/spot/MobileTradingForm.tsx`
3. `src/components/spot/MobileTradingModal.tsx`

All automatically benefit from the fix since they use `useSpotBalances` hook.

## No Breaking Changes

This fix is backward compatible:
- Other tokens (SOL, BTC, ETH) still work the same way
- Only USDC handling changed
- No API changes to the hook

## Documentation

- `USDC_COLLATERAL_EXPLANATION.md` - Detailed explanation of USDC as collateral
- `IMPLEMENTATION_COMPLETE.md` - Updated with Bug #4
- `src/hooks/useSpotBalances.ts` - Updated inline documentation

## Summary

USDC is special in Drift - it's the collateral token, not a regular spot balance. The fix ensures we read USDC from `summary.freeCollateral` instead of `spotPositions`, which correctly displays the available USDC balance in all spot trading forms.

---

**Status:** ✅ FIXED
**Impact:** HIGH - Affects all USDC trading pairs
**Testing:** Required - Verify USDC balance displays correctly
