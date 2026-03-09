# Spot Order Error Handling Fix

## Problem

When placing spot orders through Drift Protocol, errors were only showing in the console log and not being displayed to users in the UI. The specific error encountered was:

```
InsufficientCollateral (Error Code: 0x1773)
```

This error occurred when trying to place a spot order without enough USDC collateral, but the user only saw a generic "Spot order failed" message (or no message at all).

## Root Cause

The `placeSpotOrder` function in `driftContext.tsx` was catching errors but not sanitizing them into user-friendly messages. It was simply returning:

```typescript
return { success: false, error: err instanceof Error ? err.message : 'Spot order failed' };
```

This meant the raw technical error message (with stack traces, error codes, and logs) was being passed to the UI components, which either:
1. Didn't display it properly
2. Showed a confusing technical message
3. Only logged it to console

## Solution

Updated the `placeSpotOrder` function to:

1. **Extract detailed error information** from the error object
2. **Parse transaction logs** if available (for SendTransactionError)
3. **Map error codes to user-friendly messages**
4. **Return sanitized error messages** that users can understand

### Error Code Mapping

| Error Pattern | User-Friendly Message |
|--------------|----------------------|
| `InsufficientCollateral` or `0x1773` | "Insufficient collateral. You need more USDC to place this order." |
| `InvalidOrderMinOrderSize` or `0x17a8` | "Order size is too small for this market. Please increase your order size." |
| `MarketPlaceOrderPaused` | "Market is currently in settlement mode. Please try again in a few moments." |
| `InvalidOracle` | "Market oracle is temporarily unavailable. Please try again." |
| `insufficient` or `Insufficient` | "Insufficient balance to place this order" |
| `slippage` | "Price moved too much. Please try again." |
| `Transaction simulation failed` | "Transaction simulation failed. Please check your balance and try again." |
| `blockhash not found` | "Network congestion. Please try again." |
| `timeout` or `timed out` | "Transaction timed out. Please try again." |
| `User rejected` | "Transaction was cancelled" |

## Implementation

### Updated Code in `driftContext.tsx`

```typescript
const placeSpotOrder = useCallback(async (
  marketIndex: number,
  direction: 'buy' | 'sell',
  amount: number,
  orderType: 'market' | 'limit' = 'market',
  price?: number
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  // ... existing code ...

  try {
    // ... place order logic ...
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[DriftContext] Spot order error:', err);

    // Extract logs if available
    if (err.logs) {
      console.log('[DriftContext] Transaction Logs:', err.logs);
    } else if (typeof err.getLogs === 'function') {
      try {
        console.log('[DriftContext] Transaction Logs:', err.getLogs());
      } catch (logErr) {
        console.warn('[DriftContext] Could not fetch logs:', logErr);
      }
    }

    // Sanitize error messages for user-friendly display
    let friendlyError = 'Failed to place spot order';

    // Check for specific error patterns
    if (errorMessage.includes('InsufficientCollateral') || errorMessage.includes('0x1773')) {
      friendlyError = 'Insufficient collateral. You need more USDC to place this order.';
    } else if (errorMessage.includes('MarketPlaceOrderPaused')) {
      friendlyError = 'Market is currently in settlement mode. Please try again in a few moments.';
    }
    // ... more error patterns ...

    return { success: false, error: friendlyError };
  }
}, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);
```

## How It Works

1. **Error Capture**: When `placeSpotOrder` throws an error, it's caught in the catch block
2. **Log Extraction**: If the error has transaction logs (SendTransactionError), they're extracted and logged
3. **Pattern Matching**: The error message is checked against known error patterns
4. **Message Mapping**: A user-friendly message is selected based on the error pattern
5. **Return**: The sanitized error is returned to the calling component
6. **Display**: Components display the error in their error state UI

## Components That Benefit

All three spot trading components now properly display errors:

1. **BinanceOrderForm.tsx** - Desktop trading form
2. **MobileTradingForm.tsx** - Mobile trading form
3. **MobileTradingModal.tsx** - Mobile trading modal

### Example Error Display

```tsx
{error && (
  <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d] rounded text-xs text-[#f6465d]">
    {error}
  </div>
)}
```

## Testing

### Test Case 1: Insufficient Collateral

**Scenario**: Try to place a spot order with insufficient USDC

**Expected Result**:
- ❌ Before: "Spot order failed" or no message
- ✅ After: "Insufficient collateral. You need more USDC to place this order."

### Test Case 2: Order Too Small

**Scenario**: Try to place an order below minimum size

**Expected Result**:
- ❌ Before: Generic error or no message
- ✅ After: "Order size is too small for this market. Please increase your order size."

### Test Case 3: Network Issues

**Scenario**: Network timeout during order placement

**Expected Result**:
- ❌ Before: Technical timeout error
- ✅ After: "Transaction timed out. Please try again."

## Benefits

1. **Better UX**: Users see clear, actionable error messages
2. **Reduced Support**: Users understand what went wrong without contacting support
3. **Debugging**: Technical errors still logged to console for developers
4. **Consistency**: Same error handling pattern as futures trading
5. **Maintainability**: Easy to add new error patterns in the future

## Related Error Codes

Common Drift Protocol error codes:

- `0x1773` (6003) - InsufficientCollateral
- `0x17a8` (6056) - InvalidOrderMinOrderSize
- `0x1775` (6005) - InsufficientDeposit
- `0x1776` (6006) - InsufficientWithdraw
- `0x177a` (6010) - MarketPlaceOrderPaused

## Future Enhancements

Potential improvements:

1. **Error Recovery Suggestions**: Add actionable suggestions (e.g., "Deposit more USDC")
2. **Error Analytics**: Track error frequency to identify common issues
3. **Retry Logic**: Automatically retry on transient errors (network issues)
4. **Error Details Modal**: Show detailed error info for advanced users
5. **Localization**: Translate error messages to multiple languages

## Files Modified

- `src/app/context/driftContext.tsx` - Updated `placeSpotOrder` function

## Files That Automatically Benefit

- `src/components/spot/BinanceOrderForm.tsx`
- `src/components/spot/MobileTradingForm.tsx`
- `src/components/spot/MobileTradingModal.tsx`

No changes needed to these components - they already display the error from `placeSpotOrder`.

---

**Status**: ✅ Complete
**Impact**: HIGH - Affects all spot trading error handling
**Testing**: Required - Verify error messages display correctly in UI
