# Drift Trading Hook - userId Parameter Fix

## Problem
The `useDriftTrading` hook was not sending the `userId` parameter in API requests, causing backend errors. The Drift API endpoints require `userId` to identify which user's account to operate on.

## Solution
Updated all methods in `src/hooks/useDriftTrading.ts` to include `userId` in their API requests.

## Changes Made

### 1. Updated Hook Methods (src/hooks/useDriftTrading.ts)

All methods now include `userId` in their requests:

#### POST Methods (Body Parameter)
- ✅ `openPosition` - Added `userId` to request body
- ✅ `closePosition` - Added `userId` to request body
- ✅ `placeLimitOrder` - Added `userId` to request body
- ✅ `cancelOrder` - Added `userId` to request body
- ✅ `cancelAllOrders` - Added `userId` to request body
- ✅ `depositCollateral` - Added `userId` to request body
- ✅ `withdrawCollateral` - Added `userId` to request body

#### GET Methods (Query Parameter)
- ✅ `fetchPositions` - Added `userId` to query string
- ✅ `fetchOrders` - Added `userId` to query string
- ✅ `fetchAccountSummary` - Added `userId` to query string

### 2. Refactored OrderPanel (src/components/futures/OrderPanel.tsx)

Changed from direct API calls to using the hook:

**Before:**
```typescript
const response = await fetch('/api/drift/position/open', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    marketIndex,
    direction: side,
    baseAmount: parseFloat(size),
    // ... other params
  }),
});
```

**After:**
```typescript
const result = await openPosition(
  marketIndex >= 0 ? marketIndex : 0,
  side,
  parseFloat(size),
  leverage,
  orderType,
  limitPrice ? parseFloat(limitPrice) : undefined
);
```

### 3. Already Using Hook Correctly
- ✅ `FuturesOrderModal.tsx` - Already refactored in previous task

## API Endpoints Verified

All Drift API endpoints correctly receive and forward `userId` to the backend:

- `/api/drift/position/open` - POST with userId in body
- `/api/drift/position/close` - POST with userId in body
- `/api/drift/order/place` - POST with userId in body
- `/api/drift/order/cancel` - POST with userId in body
- `/api/drift/order/cancel-all` - POST with userId in body
- `/api/drift/collateral/deposit` - POST with userId in body
- `/api/drift/collateral/withdraw` - POST with userId in body
- `/api/drift/positions` - GET with userId in query
- `/api/drift/orders` - GET with userId in query
- `/api/drift/account/summary` - GET with userId in query
- `/api/drift/account/status` - GET with userId in query
- `/api/drift/account/initialize` - POST with userId in body

## Testing Checklist

To verify the fix works:

1. ✅ Open a position using FuturesOrderModal
2. ✅ Open a position using OrderPanel
3. ✅ Close a position
4. ✅ Place a limit order
5. ✅ Cancel an order
6. ✅ Deposit collateral
7. ✅ Withdraw collateral
8. ✅ Fetch positions list
9. ✅ Fetch orders list
10. ✅ Fetch account summary

## Benefits

1. **Consistency** - All components now use the centralized hook
2. **Type Safety** - Hook provides TypeScript interfaces
3. **Error Handling** - Centralized error handling in the hook
4. **Loading States** - Hook provides loading state for UI feedback
5. **Maintainability** - Single source of truth for Drift API calls
6. **No More Missing userId** - All requests now include userId automatically

## Files Modified

1. `src/hooks/useDriftTrading.ts` - Added userId to all methods
2. `src/components/futures/OrderPanel.tsx` - Refactored to use hook instead of direct API calls

## Status: ✅ COMPLETE

All Drift trading operations now correctly include `userId` in their API requests.
