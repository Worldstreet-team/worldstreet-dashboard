# Limit & Stop-Limit Orders Implementation Guide

## Overview

The futures trading system now supports three order types:
1. **Market Orders** - Execute immediately at current market price
2. **Limit Orders** - Execute when price reaches specified limit price
3. **Stop-Limit Orders** - Trigger at stop price, then execute as limit order

## Implementation Details

### DriftContext Integration

Both `FuturesOrderModal` and `FuturesTradingModal` now use the `openPosition` function from `DriftContext`:

```typescript
const result = await openPosition(
  marketIndex,
  side,              // 'long' | 'short'
  parseFloat(size),
  leverage,
  orderType,         // 'market' | 'limit' | 'stop-limit'
  orderType !== 'market' ? parseFloat(limitPrice) : undefined,
  orderType === 'stop-limit' ? parseFloat(triggerPrice) : undefined
);
```

### Stop-Limit Order Logic

#### For Long Positions:
- **Trigger Price**: Must be ABOVE current market price
- **Limit Price**: Must be AT OR ABOVE trigger price
- **Behavior**: Order triggers when price rises above trigger, then executes as limit order

#### For Short Positions:
- **Trigger Price**: Must be BELOW current market price
- **Limit Price**: Must be AT OR BELOW trigger price
- **Behavior**: Order triggers when price falls below trigger, then executes as limit order

### Validation Rules

Both modals implement the following validation:

```typescript
if (orderType === 'stop-limit') {
  if (!triggerPrice || parseFloat(triggerPrice) <= 0) {
    setError('Please enter a valid trigger price');
    return;
  }

  const triggerPriceNum = parseFloat(triggerPrice);
  const limitPriceNum = parseFloat(limitPrice);

  if (side === 'long') {
    if (triggerPriceNum < currentMarketPrice) {
      setError('Long stop-limit trigger price must be above current market price');
      return;
    }
    if (limitPriceNum < triggerPriceNum) {
      setError('Long stop-limit limit price must be at or above trigger price');
      return;
    }
  } else {
    if (triggerPriceNum > currentMarketPrice) {
      setError('Short stop-limit trigger price must be below current market price');
      return;
    }
    if (limitPriceNum > triggerPriceNum) {
      setError('Short stop-limit limit price must be at or below trigger price');
      return;
    }
  }
}
```

## UI Components

### FuturesOrderModal
- Located: `src/components/futures/FuturesOrderModal.tsx`
- Features:
  - Three-tab order type selector (Market, Limit, Stop-Limit)
  - Conditional price inputs based on order type
  - Real-time preview with DriftContext
  - PIN confirmation before execution

### FuturesTradingModal
- Located: `src/components/futures/FuturesTradingModal.tsx`
- Features:
  - Three-tab order type selector (Market, Limit, Stop-Limit)
  - Conditional price inputs based on order type
  - Real-time preview with DriftContext
  - Leverage slider
  - Percentage quick-select buttons

## Data Flow

```
User Input → Modal Validation → DriftContext.openPosition() → Drift SDK → Solana Blockchain
                                                ↓
                                    Background Transaction Monitor
                                                ↓
                                    Auto-refresh positions & summary
```

## Removed Dependencies

The following API endpoints are NO LONGER USED (replaced by DriftContext):
- ❌ `GET /api/futures/collateral?chain=solana`
- ❌ `POST /api/futures/collateral/deposit`
- ❌ `POST /api/futures/collateral/withdraw`

All collateral and position management now goes through DriftContext, which directly interacts with the Drift Protocol SDK.

## Benefits

1. **Direct Blockchain Integration**: No backend API calls for trading operations
2. **Real-time Updates**: WebSocket subscriptions for instant position updates
3. **Better Error Handling**: Drift SDK provides detailed error messages
4. **Reduced Latency**: Direct connection to Solana RPC eliminates API middleware
5. **Advanced Order Types**: Native support for limit and stop-limit orders

## Testing Checklist

- [ ] Market orders execute immediately
- [ ] Limit orders validate price requirements
- [ ] Stop-limit orders validate trigger and limit prices
- [ ] Long stop-limit: trigger > market, limit >= trigger
- [ ] Short stop-limit: trigger < market, limit <= trigger
- [ ] Preview shows correct margin requirements
- [ ] Insufficient collateral errors display properly
- [ ] Order size validation works (min order size)
- [ ] Leverage slider updates preview correctly
- [ ] PIN confirmation required before execution
- [ ] Success/error messages display correctly
- [ ] Positions refresh after order execution

## Future Enhancements

1. **Take Profit / Stop Loss**: Add TP/SL to existing positions
2. **Trailing Stop**: Dynamic stop price that follows market
3. **OCO Orders**: One-Cancels-Other order pairs
4. **Order History**: View all historical orders (filled, cancelled)
5. **Order Modification**: Edit pending limit/stop-limit orders
