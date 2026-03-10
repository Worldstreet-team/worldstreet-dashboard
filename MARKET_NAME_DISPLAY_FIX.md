# Market Name Display Fix

## Problem
Market names in `driftContext.tsx` were showing the full symbol with "-PERP" suffix (e.g., "SUI-PERP", "DOGE-PERP"), but the UI components like `BinanceMarketList.tsx` display only the base asset symbol (e.g., "SUI", "DOGE") for cleaner presentation.

## Solution
Updated `getMarketName()` helper function to optionally return just the base asset symbol without the "-PERP" suffix.

## Changes Made

### 1. Updated `getMarketName` Function Signature
```typescript
// Before
const getMarketName = useCallback((marketIndex: number): string => {
  const marketInfo = perpMarkets.get(marketIndex);
  return marketInfo?.symbol || `Market ${marketIndex}`;
}, [perpMarkets]);

// After
const getMarketName = useCallback((marketIndex: number, includePerp: boolean = true): string => {
  const marketInfo = perpMarkets.get(marketIndex);
  if (!marketInfo) return `Market ${marketIndex}`;
  
  // Return base asset symbol without -PERP suffix for cleaner display
  return includePerp ? marketInfo.symbol : marketInfo.baseAssetSymbol;
}, [perpMarkets]);
```

### 2. Updated Interface
```typescript
interface DriftContextValue {
  // ...
  getMarketName: (marketIndex: number, includePerp?: boolean) => string;
  // ...
}
```

### 3. Updated All Calls to Use Base Asset Symbol

#### In `refreshPositions()` - Perp Positions
```typescript
let marketName = getMarketName(marketIndex, false); // Use base asset symbol without -PERP

// Fallback also strips -PERP suffix
if (parsedName && parsedName !== 'UNKNOWN') {
  // Extract base asset symbol (remove -PERP suffix)
  marketName = parsedName.replace('-PERP', '').replace('-perp', '');
}
```

#### In `getOpenOrders()` - Perp Orders
```typescript
marketName = getMarketName(order.marketIndex, false); // Use base asset symbol without -PERP

// Fallback also strips -PERP suffix
if (parsedName && parsedName !== 'UNKNOWN') {
  // Extract base asset symbol (remove -PERP suffix)
  marketName = parsedName.replace('-PERP', '').replace('-perp', '');
}
```

#### In `getAllOrders()` - Perp Orders
```typescript
marketName = getMarketName(order.marketIndex, false); // Use base asset symbol without -PERP

// Fallback also strips -PERP suffix
if (parsedName && parsedName !== 'UNKNOWN') {
  // Extract base asset symbol (remove -PERP suffix)
  marketName = parsedName.replace('-PERP', '').replace('-perp', '');
}
```

## Result

### Before
- Orders: "SUI-PERP", "DOGE-PERP", "WIF-PERP"
- Positions: "SOL-PERP", "BTC-PERP"
- Market List: "SUI", "DOGE", "WIF" (inconsistent)

### After
- Orders: "SUI", "DOGE", "WIF"
- Positions: "SOL", "BTC"
- Market List: "SUI", "DOGE", "WIF" (consistent)

## Benefits

1. **Consistent Display**: All perp markets now show as base asset symbols (e.g., "SOL" instead of "SOL-PERP")
2. **Cleaner UI**: Shorter names are easier to read and take up less space
3. **Matches Industry Standard**: Most exchanges display perpetual futures as just the base asset name
4. **Backward Compatible**: The `includePerp` parameter defaults to `true`, so existing code that needs the full symbol can still get it

## Files Modified

- `src/app/context/driftContext.tsx`
  - Updated `getMarketName()` function signature
  - Updated `DriftContextValue` interface
  - Updated calls in `refreshPositions()`
  - Updated calls in `getOpenOrders()`
  - Updated calls in `getAllOrders()`

## Testing

- [x] Perp positions display base asset symbol only
- [x] Perp orders display base asset symbol only
- [x] Portfolio page shows consistent naming
- [x] Market list matches order/position display
- [x] No TypeScript errors
- [x] Fallback logic still works for unmapped markets

## Notes

- Spot markets are unaffected (they don't have a "-PERP" suffix)
- The `perpMarkets` Map already contains `baseAssetSymbol` field, so no additional parsing is needed
- The fallback logic (when fetching from on-chain) now also strips the "-PERP" suffix for consistency
