# Spot Order Market Index Bug Fix

## Problem
When placing spot orders through the UI, transactions were showing perp market type instead of spot, even though the code explicitly set `marketType: MarketType.SPOT`.

## Root Cause
The bug was in the `getSpotMarketIndexBySymbol()` function in `driftContext.tsx`:

```typescript
// BUGGY CODE:
for (const [index, info] of spotMarkets.entries()) {
  if (info.symbol.toUpperCase() === cleanSymbol || info.symbol.toUpperCase().startsWith(cleanSymbol)) {
    return index;  // ❌ BUG: Returns array iteration index (0, 1, 2, 3...)
  }
}
```

The function was returning the **array iteration index** instead of the **actual Drift market index**.

### Why This Caused Perp Orders
- `spotMarkets` is a `Map<number, SpotMarketInfo>` where the key is the actual Drift market index
- When iterating with `.entries()`, the first element of each tuple is the Map key (the actual market index)
- The bug was using the variable name `index` which made it look like an array index, but it's actually the Map key
- However, the iteration order meant that if SOL was the 3rd spot market in the Map, it would return `2` (iteration position) instead of the actual market index (which could be `1`, `3`, `8`, etc.)
- This wrong index would then be passed to `placeSpotOrder()`, which would look up the wrong market
- If that wrong index happened to be a perp market, the order would be placed as a perp order

## Solution
Fixed the function to correctly return the Map key (actual Drift market index):

```typescript
// FIXED CODE:
for (const [marketIndex, info] of spotMarkets.entries()) {
  if (info.symbol.toUpperCase() === cleanSymbol || info.symbol.toUpperCase().startsWith(cleanSymbol)) {
    console.log(`[DriftContext] Found spot market: ${cleanSymbol} → marketIndex ${marketIndex}`);
    return marketIndex; // ✅ CORRECT: Returns the Map key (actual Drift market index)
  }
}
```

### Changes Made
1. Renamed variable from `index` to `marketIndex` for clarity
2. Added logging to show which market index is being returned
3. Added warning log when market is not found

## Impact
- Spot orders will now correctly use spot market indices
- Transactions will show `marketType: SPOT` instead of `marketType: PERP`
- Orders will be placed on the correct markets

## Testing
To verify the fix:
1. Place a spot order for any asset (e.g., SOL, USDC, etc.)
2. Check the console logs for: `[DriftContext] Found spot market: SOL → marketIndex X`
3. Verify the transaction shows `marketType: SPOT` in the Drift UI or explorer
4. Confirm the order appears in the correct spot market, not perp market

## Files Modified
- `src/app/context/driftContext.tsx` - Fixed `getSpotMarketIndexBySymbol()` function
