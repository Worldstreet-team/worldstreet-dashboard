# USDC as Collateral in Drift Protocol

## Critical Understanding

In Drift Protocol, **USDC (spot market index 0) is NOT a regular spot balance** - it's the collateral token.

## The Difference

### Regular Spot Tokens (SOL, BTC, ETH, etc.)
- Stored in `spotPositions` array
- Accessed via `driftUser.getSpotPosition(marketIndex)`
- Can be deposited or borrowed
- Used for spot trading

### USDC (Market Index 0)
- Stored as **collateral**, not a spot position
- Accessed via `summary.totalCollateral` or `summary.freeCollateral`
- Cannot be borrowed (it IS the collateral)
- Used for:
  - Spot trading (when free)
  - Margin for futures positions (when locked)
  - Collateral for borrowing other tokens

## Two USDC Values

```typescript
summary.totalCollateral  // Total USDC deposited
summary.freeCollateral   // USDC available for trading (not locked as margin)
```

### Example Scenario

```
User deposits: 1000 USDC
Opens futures position requiring: 300 USDC margin

Result:
- totalCollateral = 1000 USDC (total deposited)
- freeCollateral = 700 USDC (available for spot trading)
- Locked margin = 300 USDC (used for futures)
```

## Implementation in useSpotBalances

```typescript
// SPECIAL CASE: USDC (market index 0)
if (quoteMarketIndex === 0) {
  // Use freeCollateral from summary, NOT spotPositions
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

## Why This Matters

### Before Fix (WRONG)
```typescript
// Trying to read USDC from spotPositions
const usdcPosition = spotPositions.find(p => p.marketIndex === 0);
// Result: undefined or 0, because USDC isn't in spotPositions!
```

### After Fix (CORRECT)
```typescript
// Reading USDC from summary.freeCollateral
const usdcBalance = summary?.freeCollateral ?? 0;
// Result: Actual available USDC balance
```

## Trading Pairs Affected

Any pair with USDC as quote token:
- SOL/USDC ✅ Fixed
- BTC/USDC ✅ Fixed
- ETH/USDC ✅ Fixed
- Any token/USDC ✅ Fixed

## How Drift Stores Data

```
┌─────────────────────────────────────────┐
│  Drift Account Structure                │
├─────────────────────────────────────────┤
│                                         │
│  Collateral (USDC - Market 0)          │
│  ├─ totalCollateral: 1000              │
│  └─ freeCollateral: 700                │
│                                         │
│  Spot Positions (Other Tokens)         │
│  ├─ Market 1 (SOL): 10.5               │
│  ├─ Market 2 (BTC): 0.5                │
│  └─ Market 3 (ETH): 2.0                │
│                                         │
│  Perp Positions                         │
│  └─ SOL-PERP: Long 100 contracts       │
│                                         │
└─────────────────────────────────────────┘
```

## Console Logs to Verify

When the fix is working correctly, you should see:

```
✅ Correct logs:
[useSpotBalances] Quote (USDC - Collateral): 700 (free collateral)
[useSpotBalances] Base (SOL): 10.5 (deposited)

❌ Wrong logs (before fix):
[useSpotBalances] No quote position found for market index 0
[useSpotBalances] Quote (USDC): 0 (deposited)
```

## Summary

- **USDC = Collateral** (not a spot position)
- **Use `summary.freeCollateral`** for available USDC
- **Use `summary.totalCollateral`** for total USDC
- **Use `spotPositions`** for all other tokens (SOL, BTC, ETH, etc.)

This is a fundamental architectural difference in how Drift Protocol handles USDC vs other tokens.

## Related Files

- `src/hooks/useSpotBalances.ts` - Implements the USDC special case
- `src/app/context/driftContext.tsx` - Calculates totalCollateral and freeCollateral
- `src/components/spot/BinanceOrderForm.tsx` - Uses the hook
- `src/components/spot/MobileTradingForm.tsx` - Uses the hook

## Testing

To verify the fix works:

1. Deposit USDC to Drift
2. Check `summary.freeCollateral` in console
3. Open spot trading page (SOL/USDC)
4. Verify "Available" shows correct USDC balance
5. Try trading - should use correct balance

If USDC balance still shows 0, check:
- Is Drift account initialized?
- Is USDC actually deposited?
- Check console for `[useSpotBalances] Quote (USDC - Collateral):` log
