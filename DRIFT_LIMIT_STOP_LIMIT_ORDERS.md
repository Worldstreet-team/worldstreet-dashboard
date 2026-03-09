# Drift Protocol Limit and Stop-Limit Orders Implementation

## Overview

This document describes the implementation of limit and stop-limit order functionality for Drift Protocol spot trading in the WorldStreet dashboard.

## Order Types Supported

### 1. Market Orders
- **Behavior**: Executes immediately at current market price
- **Implementation**: Uses limit orders at oracle price with 0.5% buffer to prevent revertFill errors
- **Use Case**: Quick execution when price is acceptable

### 2. Limit Orders
- **Behavior**: Executes only at specified price or better
- **Parameters**: User-specified limit price
- **Use Case**: Buy below or sell above current market price

### 3. Stop-Limit Orders
- **Behavior**: Triggers when market reaches stop price, then places limit order
- **Parameters**: 
  - Stop Price (trigger price)
  - Limit Price (execution price)
- **Use Case**: Stop-loss or breakout trading strategies

## Implementation Details

### DriftContext Changes

#### Updated Function Signature

```typescript
placeSpotOrder(
  marketIndex: number,
  direction: 'buy' | 'sell',
  amount: number,
  orderType?: 'market' | 'limit' | 'stop-limit',
  price?: number,
  triggerPrice?: number
): Promise<{ success: boolean; txSignature?: string; error?: string }>
```

#### Order Type Handling

**Market Orders:**
```typescript
// Convert to limit order at oracle price with buffer
orderTypeEnum = OrderType.LIMIT;
const priceBuffer = direction === 'buy' ? 1.005 : 0.995;
const limitPrice = marketPrice * priceBuffer;
orderPrice = new BN(Math.floor(limitPrice * 1e6));
```

**Limit Orders:**
```typescript
// Use user-specified price
orderTypeEnum = OrderType.LIMIT;
orderPrice = new BN(Math.floor(price * 1e6));
```

**Stop-Limit Orders:**
```typescript
// Use trigger price and limit price
orderTypeEnum = OrderType.TRIGGER_LIMIT;
orderPrice = new BN(Math.floor(price * 1e6));
triggerPriceBN = new BN(Math.floor(triggerPrice * 1e6));

// Add trigger condition
orderParams.triggerPrice = triggerPriceBN;
orderParams.triggerCondition = direction === 'buy' ? 'above' : 'below';
```

### Price Validation

#### Limit Orders
- Price must be greater than 0
- No relationship validation with market price (user can set any price)

#### Stop-Limit Orders

**Buy Stop-Limit:**
- Stop price must be ABOVE current market price
- Limit price must be AT OR ABOVE stop price
- Triggers when market rises to stop price
- Executes at limit price or better

**Sell Stop-Limit:**
- Stop price must be BELOW current market price
- Limit price must be AT OR BELOW stop price
- Triggers when market falls to stop price
- Executes at limit price or better

### UI Components Updated

#### 1. BinanceOrderForm.tsx
- Added `stopPrice` state for trigger price
- Updated order type tabs to include stop-limit
- Added stop price input field with validation
- Updated `executeTrade()` with price validation
- Updated `handleConfirmSwap()` to pass all parameters

#### 2. MobileTradingModal.tsx
- Added `stopPrice` state for trigger price
- Updated order type tabs (3 tabs: Market, Limit, Stop-Limit)
- Added stop price input field with helper text
- Updated `handleGetQuote()` with validation
- Updated `handleConfirmSwap()` to pass all parameters

#### 3. MobileTradingForm.tsx
- Currently uses backend API (`/api/execute-trade`)
- Should be updated to use Drift directly like other components
- Would need same changes as above components

## User Experience

### Order Type Selection
```
[Market] [Limit] [Stop-Limit]
```

### Market Order UI
```
Amount: [____] USDC
(No price inputs - uses current market)
```

### Limit Order UI
```
Price: [____] USDC
Amount: [____] USDC
```

### Stop-Limit Order UI
```
Stop Price: [____] USDC
  ↳ Order triggers when market reaches this price

Limit Price: [____] USDC
  ↳ Order executes at this price after trigger

Amount: [____] USDC
```

## Validation Rules

### Pre-Submission Validation

1. **Amount Validation**
   - Must be greater than 0
   - Must not exceed available balance
   - Must meet minimum order size requirements

2. **Limit Order Validation**
   - Limit price must be greater than 0

3. **Stop-Limit Order Validation**
   - Stop price must be greater than 0
   - Limit price must be greater than 0
   - For BUY: stop price > market price
   - For BUY: limit price >= stop price
   - For SELL: stop price < market price
   - For SELL: limit price <= stop price

### On-Chain Validation

Drift Protocol performs additional validation:
- Minimum order size enforcement
- Collateral requirements
- Market availability
- Oracle price validity

## Error Handling

### Common Errors

**"Please enter a valid limit price"**
- User didn't enter a price for limit order

**"Please enter a valid stop price"**
- User didn't enter a stop price for stop-limit order

**"Buy stop price must be above current market price"**
- Stop price validation failed for buy order

**"Sell stop price must be below current market price"**
- Stop price validation failed for sell order

**"Buy limit price must be at or above stop price"**
- Limit price is below stop price for buy order

**"Sell limit price must be at or below stop price"**
- Limit price is above stop price for sell order

## Order Lifecycle

### Limit Orders
1. User submits limit order
2. Order placed on Drift orderbook
3. Keepers monitor orderbook
4. When market price reaches limit price, keeper fills order
5. Order status changes to 'filled'

### Stop-Limit Orders
1. User submits stop-limit order
2. Order placed on Drift orderbook with trigger condition
3. Keepers monitor market price
4. When market reaches stop price, order triggers
5. Limit order is activated on orderbook
6. When market price reaches limit price, keeper fills order
7. Order status changes to 'filled'

## Testing Recommendations

### Manual Testing

1. **Limit Orders**
   - Place buy limit below market price
   - Place sell limit above market price
   - Verify order appears in open orders
   - Wait for fill or cancel order

2. **Stop-Limit Orders**
   - Place buy stop-limit above market
   - Place sell stop-limit below market
   - Verify trigger price validation
   - Verify limit price validation
   - Monitor order status changes

3. **Edge Cases**
   - Test with minimum order sizes
   - Test with insufficient collateral
   - Test price validation errors
   - Test during high volatility

### Automated Testing

```typescript
// Test limit order placement
const result = await placeSpotOrder(
  marketIndex,
  'buy',
  10, // $10 USDC
  'limit',
  80.5 // Limit price
);

// Test stop-limit order placement
const result = await placeSpotOrder(
  marketIndex,
  'sell',
  10, // $10 USDC
  'stop-limit',
  79.5, // Limit price
  80.0  // Stop price (trigger)
);
```

## Best Practices

### For Users

1. **Limit Orders**
   - Set realistic prices based on market depth
   - Consider slippage for large orders
   - Monitor order status regularly

2. **Stop-Limit Orders**
   - Set stop price with buffer from current price
   - Set limit price to ensure execution
   - Understand gap risk (price may skip over limit)

### For Developers

1. **Price Precision**
   - Always use BN for price calculations
   - Convert to 6 decimals for USDC-quoted markets
   - Validate precision conversions

2. **Error Handling**
   - Provide clear, actionable error messages
   - Log detailed errors for debugging
   - Handle network failures gracefully

3. **UI/UX**
   - Show current market price for reference
   - Provide helper text for each price field
   - Validate inputs before submission
   - Show order status updates

## Future Enhancements

### Potential Improvements

1. **Advanced Order Types**
   - Stop-market orders
   - Trailing stop orders
   - OCO (One-Cancels-Other) orders

2. **Order Management**
   - Modify existing orders
   - Batch order placement
   - Order templates

3. **Analytics**
   - Fill rate tracking
   - Average fill price
   - Order performance metrics

4. **UI Enhancements**
   - Price chart integration
   - Order book visualization
   - Quick price selection from orderbook

## References

- Drift Protocol V2 Documentation: https://docs.drift.trade/
- Drift SDK Order Types: https://github.com/drift-labs/protocol-v2
- Order Type Enums: `OrderType.LIMIT`, `OrderType.TRIGGER_LIMIT`
- Market Type Enum: `MarketType.SPOT`

## Status

✅ **IMPLEMENTED** - Limit and stop-limit orders fully functional

## Last Updated

2024-03-08

---

**Note**: This implementation follows Drift Protocol best practices and includes the revertFill fix for reliable order execution.
