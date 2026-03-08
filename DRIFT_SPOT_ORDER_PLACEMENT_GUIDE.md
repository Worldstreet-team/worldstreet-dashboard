# Drift Spot Order Placement - Complete Implementation Guide

## Overview
This guide explains how spot orders work on Drift Protocol and how they're implemented in your driftContext.

## How Drift Orders Work

### Order Lifecycle
1. **Order Placement**: Order is submitted to Drift Protocol
2. **JIT Auction**: Market makers compete to fill at better prices (controlled by `auctionStartPrice`, `auctionEndPrice`, `auctionDuration`)
3. **DLOB Matching**: If no JIT fill, order matches against Decentralized Limit Order Book
4. **AMM Fallback**: If no DLOB match, AMM provides liquidity
5. **Order Fill**: Position updates automatically, fill events are queryable

### Order Storage
- Orders are stored in your user account on-chain
- Each order has an `orderId` (onchain ID) and optional `userOrderId` (custom tracking)
- Orders can be queried via `getOpenOrders()` or `getAllOrders()`

## Your Current Implementation

### ✅ Correct Implementation in driftContext.tsx

Your `placeSpotOrder` function already follows Drift best practices:

```typescript
const placeSpotOrder = useCallback(async (
  marketIndex: number,
  direction: 'buy' | 'sell',
  amount: number,
  orderType: 'market' | 'limit' = 'market',
  price?: number
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  // 1. Import Drift SDK enums
  const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

  // 2. Convert amount to proper precision
  const baseAssetAmount = client.convertToSpotPrecision(marketIndex, baseAmount);

  // 3. Build order params
  const orderParams = {
    orderType: orderType === 'market' ? OrderType.MARKET : OrderType.LIMIT,
    marketType: MarketType.SPOT,
    marketIndex,
    direction: positionDirection,
    baseAssetAmount,
    price: price ? client.convertToPricePrecision(price) : new BN(0),
  };

  // 4. Add compute budget for priority fees
  const txOptions = {
    computeUnits: 300_000,
    computeUnitsPrice: 50_000, // 0.00005 SOL per CU
  };

  // 5. Place order
  const txSignature = await client.placeSpotOrder(orderParams, txOptions);

  // 6. Wait for confirmation
  await pollTransactionStatus(client.connection, txSignature, 30, 2000);

  // 7. Refresh account data
  await refreshAccounts();
  await Promise.all([refreshSummary(), refreshPositions()]);

  return { success: true, txSignature };
});
```

### Key Features Already Implemented

✅ **Proper Precision Conversion**
- Uses `client.convertToSpotPrecision(marketIndex, amount)` for base asset
- Uses `client.convertToPricePrecision(price)` for limit orders

✅ **Correct Enum Usage**
- `OrderType.MARKET` / `OrderType.LIMIT`
- `MarketType.SPOT`
- `PositionDirection.LONG` (buy) / `PositionDirection.SHORT` (sell)

✅ **Collateral Validation**
- Checks free collateral before placing order
- Validates minimum order size
- Shows detailed error modals

✅ **Transaction Optimization**
- Adds compute budget with priority fees
- Uses `WhileValidTxSender` with retry logic
- Implements blockhash caching

✅ **Account Refresh**
- Calls `refreshAccounts()` after transaction
- Updates summary and positions
- Ensures UI shows latest data

## Order Types Supported

### 1. Market Orders (Current Implementation)
```typescript
await placeSpotOrder(
  marketIndex,    // e.g., 1 for SOL
  'buy',          // or 'sell'
  1.0,            // amount in USDC value
  'market'        // order type
);
```

**How it works:**
- Executes immediately through JIT auction → DLOB → AMM
- No price parameter needed
- Goes through auction with default duration

### 2. Limit Orders (Supported)
```typescript
await placeSpotOrder(
  marketIndex,
  'buy',
  1.0,
  'limit',
  150.00  // limit price
);
```

**How it works:**
- Rests on DLOB at specified price
- Only fills at limit price or better
- Can add `postOnly` params to guarantee maker status

## Advanced Order Features (Not Yet Implemented)

### Oracle Orders
Orders with prices that track oracle feed with an offset:

```typescript
const orderParams = {
  orderType: OrderType.ORACLE,
  marketType: MarketType.SPOT,
  marketIndex: 1,
  direction: PositionDirection.LONG,
  baseAssetAmount: client.convertToSpotPrecision(1, 1),
  auctionStartPrice: PRICE_PRECISION.muln(-5).divn(10), // -$0.50 from oracle
  auctionEndPrice: PRICE_PRECISION.muln(5).divn(10),    // +$0.50 from oracle
  oraclePriceOffset: client.convertToPricePrecision(0.30).toNumber(), // +$0.30
  auctionDuration: 30, // slots
};
```

### Trigger Orders (Stop-Loss / Take-Profit)
```typescript
const orderParams = {
  orderType: OrderType.TRIGGER_MARKET,
  marketType: MarketType.SPOT,
  marketIndex: 1,
  direction: PositionDirection.SHORT,
  baseAssetAmount: client.convertToSpotPrecision(1, 1),
  triggerPrice: client.convertToPricePrecision(95),
  triggerCondition: OrderTriggerCondition.BELOW,
};
```

### Post-Only Parameters
```typescript
import { PostOnlyParams } from '@drift-labs/sdk';

const orderParams = {
  // ... other params
  postOnly: PostOnlyParams.MUST_POST_ONLY, // Tx fails if crosses spread
  // or
  postOnly: PostOnlyParams.TRY_POST_ONLY,  // Silently skips if crosses
  // or
  postOnly: PostOnlyParams.SLIDE,          // Adjusts price to guarantee maker
};
```

## Critical Implementation Details

### 1. Amount Interpretation
Your implementation correctly interprets `amount` as USDC value:

```typescript
// User wants to buy $1 worth of SOL at $81/SOL
const quoteAmount = 1.0;  // USDC
const marketPrice = 81.0; // SOL price
const baseAmount = quoteAmount / marketPrice; // 0.0123 SOL
const baseAssetAmount = client.convertToSpotPrecision(marketIndex, baseAmount);
```

### 2. Minimum Order Size Validation
```typescript
if (targetMarket.minOrderSize) {
  const minOrderSizeBN = targetMarket.minOrderSize;
  const minOrderSizeHuman = minOrderSizeBN.toNumber() / Math.pow(10, targetMarket.decimals);
  
  if (baseAssetAmount.lt(minOrderSizeBN)) {
    // Show error modal with minimum required
    return { success: false, error: 'Order too small' };
  }
}
```

### 3. Collateral Check
```typescript
const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;
const estimatedMarginRequired = direction === 'buy' ? notionalValue : 0;

if (direction === 'buy' && estimatedMarginRequired > freeCollateral) {
  // Show insufficient collateral error
  return { success: false, error: 'Insufficient collateral' };
}
```

### 4. Account Refresh After Order
```typescript
// CRITICAL: Wait for state propagation
await new Promise(resolve => setTimeout(resolve, 1500));

// Fetch latest data from blockchain
await refreshAccounts();

// Update UI
await Promise.all([refreshSummary(), refreshPositions()]);
```

## Order Monitoring

### Get Open Orders
```typescript
const { getOpenOrders } = useDrift();

const orders = await getOpenOrders();
// Returns orders with status 'open' waiting for fill
```

### Get All Orders (Open, Filled, Cancelled)
```typescript
const { getAllOrders } = useDrift();

const orders = await getAllOrders();
// Returns complete order history
```

### Cancel Order
```typescript
const { cancelOrder } = useDrift();

await cancelOrder(orderId);
```

## Error Handling

Your implementation includes comprehensive error handling:

```typescript
// Minimum order size error
if (baseAssetAmount.lt(minOrderSizeBN)) {
  setErrorModalData({
    title: 'Order Below Minimum Size',
    message: `Your order is below the minimum size required for ${marketName}.`,
    details: {
      orderSize: `${humanReadableAmount.toFixed(6)} ${marketName}`,
      minRequired: `${minOrderSizeHuman.toFixed(6)} ${marketName}`,
      minValue: `~$${minOrderValueUSDC.toFixed(2)} USDC`,
    }
  });
}

// Insufficient collateral error
if (estimatedMarginRequired > freeCollateral) {
  setErrorModalData({
    title: 'Insufficient Collateral',
    message: 'You don\'t have enough free collateral to place this order.',
    details: {
      required: `${estimatedMarginRequired.toFixed(2)} USDC`,
      available: `${freeCollateral.toFixed(2)} USDC`,
    }
  });
}
```

## Usage in UI Components

### Example: Place Market Order
```typescript
import { useDrift } from '@/app/context/driftContext';

function TradingForm() {
  const { placeSpotOrder, getSpotMarketIndexBySymbol } = useDrift();
  
  const handleBuy = async () => {
    const marketIndex = getSpotMarketIndexBySymbol('SOL'); // Returns 1
    
    const result = await placeSpotOrder(
      marketIndex,
      'buy',
      10.0,  // $10 USDC worth
      'market'
    );
    
    if (result.success) {
      console.log('Order placed:', result.txSignature);
    } else {
      console.error('Order failed:', result.error);
    }
  };
  
  return <button onClick={handleBuy}>Buy SOL</button>;
}
```

### Example: Place Limit Order
```typescript
const handleLimitOrder = async () => {
  const marketIndex = getSpotMarketIndexBySymbol('SOL');
  
  const result = await placeSpotOrder(
    marketIndex,
    'buy',
    10.0,      // $10 USDC worth
    'limit',
    80.00      // Limit price: $80/SOL
  );
};
```

## Transaction Optimization

### Compute Budget (Already Implemented)
```typescript
const txOptions = {
  computeUnits: 300_000,        // Max compute units
  computeUnitsPrice: 50_000,    // Priority fee (micro-lamports per CU)
};

await client.placeSpotOrder(orderParams, txOptions);
```

### Blockhash Caching (Already Configured)
```typescript
txHandlerConfig: {
  blockhashCachingEnabled: true,
  blockhashCachingConfig: {
    retryCount: 5,
    retrySleepTimeMs: 100,
    staleCacheTimeMs: 1000,
  },
}
```

### Transaction Retry Logic (Already Implemented)
```typescript
const txSender = new WhileValidTxSender({
  connection,
  wallet,
  opts: { 
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
    skipPreflight: false,
  },
  retrySleep: 2000,  // Retry every 2 seconds
  timeout: 60000,    // Total timeout of 60 seconds
});
```

## Best Practices

### ✅ DO
- Always use `convertToSpotPrecision()` for amounts
- Always use `convertToPricePrecision()` for prices
- Check free collateral before placing orders
- Validate minimum order size
- Add compute budget for faster confirmation
- Refresh accounts after transactions
- Use proper Drift SDK enums

### ❌ DON'T
- Don't hardcode precision (use SDK helpers)
- Don't skip collateral validation
- Don't forget to refresh accounts after orders
- Don't use numeric values instead of enums
- Don't skip minimum order size checks

## Summary

Your current implementation in `driftContext.tsx` is already production-ready and follows Drift Protocol best practices. The `placeSpotOrder` function:

1. ✅ Uses correct SDK methods and enums
2. ✅ Handles precision conversion properly
3. ✅ Validates collateral and order size
4. ✅ Includes transaction optimization
5. ✅ Refreshes account data after orders
6. ✅ Provides detailed error handling

To use it in your UI, simply call:
```typescript
const { placeSpotOrder, getSpotMarketIndexBySymbol } = useDrift();

const marketIndex = getSpotMarketIndexBySymbol('SOL');
await placeSpotOrder(marketIndex, 'buy', 10.0, 'market');
```

The system is ready for production use!
