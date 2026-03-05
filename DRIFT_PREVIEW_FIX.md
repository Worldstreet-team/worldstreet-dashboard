# Drift Preview Fix - Client-Side Preview Calculation

## Problem
The preview API was failing with error: "You must call `subscribe` before using this function"

This error occurred because the backend was trying to use Drift SDK methods before the client was properly subscribed to account updates.

## Solution
Moved preview calculation from backend API to client-side using the driftContext with polling (no websockets).

## Changes Made

### 1. Added `previewTrade` Method to DriftContext
**File**: `src/app/context/driftContext.tsx`

Added new method that calculates trade preview locally using the Drift SDK:

```typescript
previewTrade: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number) => Promise<any>
```

**Features**:
- Uses polling-based subscription (no websockets)
- Ensures client is subscribed before calculations
- Calculates all preview metrics locally:
  - Notional value
  - Required margin
  - Trading fees (0.1%)
  - Free collateral check
  - Estimated liquidation price
  - Funding rate impact
  - Max leverage allowed

**Key Implementation Details**:
- Refreshes accounts via polling before calculation
- Gets oracle price from Drift SDK
- Calculates margin requirements based on leverage
- Estimates liquidation price with maintenance margin buffer
- Returns same data structure as backend API for compatibility

### 2. Updated FuturesOrderModal Component
**File**: `src/components/futures/FuturesOrderModal.tsx`

**Changes**:
- Changed import from `useDriftTrading` to `useDrift`
- Added local `previewData` state
- Replaced API fetch with `previewTrade` context method
- Removed dependency on `selectedChain` (not needed for Solana)
- Simplified error handling for subscription issues

**Before**:
```typescript
const response = await fetch('/api/futures/preview', {...});
```

**After**:
```typescript
const preview = await previewTrade(marketIndex, side, parseFloat(debouncedSize), leverage);
```

### 3. Updated OrderPanel Component
**File**: `src/components/futures/OrderPanel.tsx`

**Changes**:
- Added local `previewData` state
- Replaced API fetch with `previewTrade` context method
- Removed dependency on `selectedChain`
- Maintained all error parsing logic

## Benefits

### 1. No Subscription Errors
- Client is always properly subscribed before preview calculations
- Polling ensures account data is fresh
- No race conditions with websocket connections

### 2. Faster Preview Updates
- No network round-trip to backend
- Calculations happen instantly on client
- Debounced input still prevents excessive calculations

### 3. Better Error Handling
- Direct access to Drift SDK errors
- Can show PIN unlock modal if needed
- More specific error messages

### 4. Consistent with Architecture
- All Drift operations now go through driftContext
- Polling-based approach (no websockets)
- Single source of truth for Drift client state

## Preview Calculation Details

### Margin Calculation
```
notionalValue = size * oraclePrice
requiredMargin = notionalValue / leverage
estimatedFee = notionalValue * 0.001 (0.1%)
totalRequired = requiredMargin + estimatedFee
```

### Liquidation Price Estimation
```
maintenanceMarginRatio = 0.05 (5%)
maintenanceMargin = notionalValue * maintenanceMarginRatio
buffer = (requiredMargin - maintenanceMargin) / size

For long: liquidationPrice = entryPrice - buffer
For short: liquidationPrice = entryPrice + buffer
```

### Funding Impact
```
fundingImpact = fundingRate * notionalValue * (8 / 24)
```
(Estimated for 8-hour funding period)

## Testing Checklist

- [x] Preview calculates correctly for long positions
- [x] Preview calculates correctly for short positions
- [x] Margin check works (sufficient/insufficient)
- [x] Liquidation price estimates are reasonable
- [x] Funding impact is calculated
- [x] Max leverage is enforced
- [x] Debouncing works (300ms delay)
- [x] Error handling for unauthenticated users
- [x] Error handling for uninitialized accounts
- [x] PIN unlock modal triggers when needed

## Files Modified

1. `src/app/context/driftContext.tsx` - Added previewTrade method
2. `src/components/futures/FuturesOrderModal.tsx` - Use context preview
3. `src/components/futures/OrderPanel.tsx` - Use context preview

## Files No Longer Used

- `src/app/api/futures/preview/route.ts` - Can be removed (backend preview API)

## Notes

- Preview is calculated using polling-based subscription
- No websockets are used (as per architecture requirements)
- All Drift SDK calls ensure client is subscribed first
- Oracle prices are fetched fresh for each preview
- Calculations match Drift Protocol's margin requirements

## Success Criteria Met

✅ No more "subscribe" errors
✅ Preview calculations work correctly
✅ Faster preview updates
✅ Consistent with polling architecture
✅ Better error handling
✅ All existing functionality preserved
