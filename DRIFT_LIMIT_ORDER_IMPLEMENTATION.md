# Drift Limit Order Implementation Guide

## Current Status: ❌ NOT IMPLEMENTED

The `FuturesOrderModal.tsx` has the UI for limit orders but **does not actually place limit orders**. It only places market orders regardless of the selected order type.

## What's Missing

### 1. Drift Context - No Limit Order Support
The `openPosition()` method in `driftContext.tsx` hardcodes `OrderType.MARKET`:

```typescript
// Current implementation (line ~1685)
const orderParams = {
  orderType: OrderType.MARKET,  // ❌ Always market
  marketType: MarketType.PERP,
  marketIndex,
  direction: positionDirection,
  baseAssetAmount,
  price: new BN(0),  // ❌ Always 0
};
```

### 2. FuturesOrderModal - Limit Price Not Used
The modal collects `limitPrice` but never passes it to the order placement:

```typescript
// Current implementation
const handleSubmit = async () => {
  // ...
  const result = await openPosition(
    marketIndex,
    side,
    parseFloat(size),
    leverage  // ❌ No orderType or price parameter
  );
}
```

## Implementation Plan

### Step 1: Update Drift Context Interface

Add a new method `placePerpOrder` that supports both market and limit orders:

```typescript
// In DriftContextValue interface
placePerpOrder: (
  marketIndex: number,
  direction: 'long' | 'short',
  size: number,
  leverage: number,
  orderType?: 'market' | 'limit',
  limitPrice?: number
) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
```

### Step 2: Implement Limit Order Logic in Drift Context

```typescript
const placePerpOrder = useCallback(async (
  marketIndex: number,
  direction: 'long' | 'short',
  size: number,
  leverage: number,
  orderType: 'market' | 'limit' = 'market',
  limitPrice?: number
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  if (!user?.userId) {
    return { success: false, error: 'User not authenticated' };
  }

  // Validate limit price for limit orders
  if (orderType === 'limit' && (!limitPrice || limitPrice <= 0)) {
    return { success: false, error: 'Limit price is required for limit orders' };
  }

  try {
    setIsLoading(true);
    const pin = await requestPin();

    let client = driftClientRef.current;
    if (!client) {
      client = await initializeDriftClient(pin);
    }

    const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

    const positionDirection = direction === 'long'
      ? PositionDirection.LONG
      : PositionDirection.SHORT;

    const baseAssetAmount = client.convertToPerpPrecision(size);

    // Determine order type and price
    const driftOrderType = orderType === 'limit' ? OrderType.LIMIT : OrderType.MARKET;
    
    // For limit orders, convert price to Drift precision (6 decimals for USDC-quoted)
    // For market orders, use 0
    const orderPrice = orderType === 'limit' && limitPrice
      ? new BN(Math.floor(limitPrice * 1e6))
      : new BN(0);

    console.log(`[DriftContext] Placing ${orderType} order:`, {
      marketIndex,
      direction,
      size,
      orderType: driftOrderType,
      price: orderPrice.toString(),
      humanReadablePrice: limitPrice || 'market'
    });

    const orderParams = {
      orderType: driftOrderType,
      marketType: MarketType.PERP,
      marketIndex,
      direction: positionDirection,
      baseAssetAmount,
      price: orderPrice,
    };

    const txOptions = {
      computeUnits: 300_000,
      computeUnitsPrice: 50_000,
    };

    const txSignature = await client.placePerpOrder(orderParams, txOptions);

    console.log(`[DriftContext] ${orderType} order transaction sent:`, txSignature);

    await pollTransactionStatus(client.connection, txSignature, 30, 2000);
    console.log(`[DriftContext] ${orderType} order confirmed:`, txSignature);

    await refreshSummary();
    await refreshPositions();
    
    return { success: true, txSignature };
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[DriftContext] ${orderType} order error:`, err);

    let friendlyError = `Failed to place ${orderType} order`;

    // Error handling (same as before)
    if (errorMessage.includes('MarketPlaceOrderPaused')) {
      friendlyError = 'Market is currently in settlement mode. Please try again in a few moments.';
    } else if (errorMessage.includes('insufficient') || errorMessage.includes('Insufficient')) {
      friendlyError = 'Insufficient collateral to open this position';
    } else if (errorMessage.includes('InvalidOracle')) {
      friendlyError = 'Market oracle is temporarily unavailable. Please try again.';
    } else if (errorMessage.includes('0x17a8') || errorMessage.includes('InvalidOrderMinOrderSize')) {
      friendlyError = 'Order size is too small for this market. Please increase your position size.';
    }

    return { success: false, error: friendlyError };
  } finally {
    setIsLoading(false);
  }
}, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);
```

### Step 3: Update FuturesOrderModal

```typescript
const handleSubmit = async () => {
  if (!marketIndex || !size || !previewData || !previewData.marginCheckPassed) return;

  // Validate limit price for limit orders
  if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
    setError('Please enter a valid limit price');
    return;
  }

  setError(null);

  try {
    console.log(`[FuturesOrderModal] Placing ${orderType} order for ${marketName} (marketIndex: ${marketIndex})`);

    // Use the new placePerpOrder method
    const result = await placePerpOrder(
      marketIndex,
      side,
      parseFloat(size),
      leverage,
      orderType,
      orderType === 'limit' ? parseFloat(limitPrice) : undefined
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to place order');
    }

    setSuccessMessage(`${orderType === 'limit' ? 'Limit' : 'Market'} order placed! TX: ${result.txSignature?.slice(0, 8)}...`);

    // Close modal after success
    setTimeout(() => {
      onSuccess?.();
      onClose();
      setSize('');
      setLimitPrice('');
      setSuccessMessage('');
      setError(null);
    }, 2000);
  } catch (error) {
    console.error('Submit error:', error);
    setError(error instanceof Error ? error.message : 'Failed to place order');
  }
};
```

### Step 4: Update Drift Context Exports

```typescript
// In DriftContextValue interface
export interface DriftContextValue {
  // ... existing methods
  openPosition: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  
  // ✅ Add new method
  placePerpOrder: (
    marketIndex: number,
    direction: 'long' | 'short',
    size: number,
    leverage: number,
    orderType?: 'market' | 'limit',
    limitPrice?: number
  ) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
}

// In provider value
const value: DriftContextValue = {
  // ... existing values
  openPosition,
  placePerpOrder, // ✅ Add to exports
};
```

### Step 5: Update FuturesOrderModal Imports

```typescript
const { 
  placePerpOrder,  // ✅ Import new method
  isLoading: driftLoading, 
  previewTrade, 
  getMarketName, 
  perpMarkets 
} = useDrift();
```

## Important Notes

### Limit Order Behavior
- **Limit orders are NOT filled immediately** - they sit in the order book until the market price reaches the limit price
- **Keepers must fill the order** - Drift uses a keeper network to match and fill orders
- **Orders can be cancelled** - Use `cancelOrder()` method to cancel unfilled limit orders
- **Partial fills are possible** - Large orders may be filled in multiple transactions

### Price Precision
- Drift uses 6 decimal precision for USDC-quoted prices
- Always convert limit price: `new BN(Math.floor(limitPrice * 1e6))`
- Display prices should divide by 1e6: `price.toNumber() / 1e6`

### Order Validation
- Limit buy price should be <= current market price (otherwise use market order)
- Limit sell price should be >= current market price (otherwise use market order)
- Consider adding price validation in the UI to prevent user errors

## Testing Checklist

- [ ] Place a limit buy order below market price
- [ ] Place a limit sell order above market price
- [ ] Verify order appears in open orders list
- [ ] Verify order can be cancelled
- [ ] Verify order fills when market price reaches limit price
- [ ] Test with different markets and sizes
- [ ] Test error handling (insufficient collateral, invalid price, etc.)

## Related Files
- `src/app/context/driftContext.tsx` - Add `placePerpOrder` method
- `src/components/futures/FuturesOrderModal.tsx` - Update to use new method
- `DRIFT_LIMIT_STOP_LIMIT_ORDERS.md` - Reference for stop-limit orders

## Current Answer to Your Question

**No, limit perp orders do NOT work** in the current implementation. The modal has the UI but the backend logic only places market orders. You need to implement the changes outlined above to make limit orders functional.
