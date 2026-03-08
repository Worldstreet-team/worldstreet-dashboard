# Drift Order Monitoring Guide

## Overview

This guide explains how to monitor Drift Protocol orders and understand when they will be filled. Drift uses a keeper-based system where external bots fill orders, which means orders are NOT instant.

## Order Lifecycle

```
1. Order Placed → Transaction sent to blockchain
2. Order Open → Waiting in DLOB (Decentralized Limit Order Book)
3. Auction Phase → Price discovery period (0-3 slots for market orders)
4. Keeper Fills → External keeper calls fillSpotOrder/fillPerpOrder
5. Order Filled → Position updated, balances change
```

## Typical Fill Times

- **Market Orders**: 30 seconds - 2 minutes
- **Limit Orders**: When price reaches limit (can be instant or never)
- **Network Congestion**: Can add 1-5 minutes during high traffic

## Monitoring Your Orders

### Using the OrderStatusMonitor Component

```tsx
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';

function MyPortfolio() {
  return (
    <div>
      <OrderStatusMonitor 
        autoRefresh={true}
        refreshInterval={5000} // Refresh every 5 seconds
      />
    </div>
  );
}
```

### Using the useDrift Hook

```tsx
import { useDrift } from '@/app/context/driftContext';

function MyComponent() {
  const { openOrders, getOpenOrders, spotPositions } = useDrift();

  useEffect(() => {
    // Fetch orders on mount
    getOpenOrders();

    // Poll every 5 seconds
    const interval = setInterval(getOpenOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Open Orders: {openOrders.length}</h3>
      {openOrders.map(order => (
        <div key={order.orderIndex}>
          <p>Market: {order.marketIndex}</p>
          <p>Direction: {order.direction}</p>
          <p>Amount: {order.baseAssetAmount}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  );
}
```

## Checking Order Details Programmatically

### Get Detailed Order Information

```typescript
const client = driftClientRef.current;
const driftUser = client.getUser();
const userAccount = driftUser.getUserAccount();

// Get current slot for auction timing
const currentSlot = await client.connection.getSlot();

// Iterate through orders
for (let i = 0; i < userAccount.orders.length; i++) {
  const order = userAccount.orders[i];
  
  // Skip non-open orders
  if (order.status !== OrderStatus.Open) continue;
  
  // Get fill progress
  const totalAmount = order.baseAssetAmount.toNumber();
  const filledAmount = order.baseAssetAmountFilled?.toNumber() || 0;
  const remainingAmount = totalAmount - filledAmount;
  const fillPercentage = (filledAmount / totalAmount) * 100;
  
  // Check auction status
  const orderSlot = order.slot.toNumber();
  const auctionDuration = order.auctionDuration || 0;
  const auctionEndSlot = orderSlot + auctionDuration;
  const isInAuction = currentSlot < auctionEndSlot;
  const slotsUntilAuctionEnd = Math.max(0, auctionEndSlot - currentSlot);
  
  console.log({
    orderIndex: i,
    marketIndex: order.marketIndex,
    totalAmount,
    filledAmount,
    remainingAmount,
    fillPercentage: fillPercentage.toFixed(2) + '%',
    isInAuction,
    slotsUntilAuctionEnd,
    canBeFilled: !isInAuction, // Can be filled after auction
  });
}
```

## Checking Spot Positions After Fill

Once an order is filled, your spot position will update:

```typescript
const { spotPositions, refreshPositions } = useDrift();

// Refresh positions to get latest data
await refreshPositions();

// Find your position
const wifPosition = spotPositions.find(p => p.marketName === 'WIF');

if (wifPosition && wifPosition.amount > 0) {
  console.log('WIF Balance:', wifPosition.amount);
  console.log('WIF Value:', wifPosition.value, 'USDC');
  console.log('WIF Price:', wifPosition.price);
}
```

## Understanding Order Status

### Order Status Values

- **`init`**: Order is being created (very brief)
- **`open`**: Order is active and waiting to be filled
- **`filled`**: Order has been completely executed
- **`canceled`**: Order was cancelled before filling

### Auction Phase

Market orders go through an auction phase to prevent front-running:

1. **Slot 0-3**: Auction period where price gradually improves
2. **After Slot 3**: Order can be filled at any time by keepers
3. **Typical Duration**: ~1-2 seconds (400ms per slot)

### Fill Progress

Orders can be partially filled:

```typescript
const fillPercentage = (filledAmount / totalAmount) * 100;

if (fillPercentage === 0) {
  console.log('Order not filled yet');
} else if (fillPercentage < 100) {
  console.log(`Order ${fillPercentage.toFixed(2)}% filled`);
} else {
  console.log('Order completely filled');
}
```

## Why Orders Take Time

1. **Keeper Network**: External bots must detect and fill your order
2. **Auction Mechanism**: Prevents front-running with gradual price improvement
3. **Network Congestion**: Solana network can be busy during high traffic
4. **Liquidity**: Large orders may take longer to fill completely
5. **Gas Fees**: Keepers prioritize orders with better economics

## Troubleshooting

### Order Not Filling

1. **Check auction status**: Order may still be in auction phase
2. **Verify collateral**: Ensure you have enough USDC collateral
3. **Check order size**: Very small orders may not be economical for keepers
4. **Network status**: Check if Solana network is congested
5. **Market conditions**: Extreme volatility can delay fills

### Order Stuck

If an order is stuck for >5 minutes:

1. **Cancel the order**: Use `cancelOrder(orderIndex)`
2. **Check your balance**: Verify USDC wasn't deducted
3. **Place new order**: Try again with adjusted parameters
4. **Check network**: Visit status.solana.com

## Best Practices

1. **Monitor regularly**: Poll `getOpenOrders()` every 5-10 seconds
2. **Check positions**: Use `refreshPositions()` to see filled orders
3. **Set expectations**: Market orders typically fill in 30s-2min
4. **Use UI feedback**: Show loading states while orders are pending
5. **Handle errors**: Always check for insufficient collateral errors

## Integration Example

Complete example showing order placement and monitoring:

```tsx
import { useState, useEffect } from 'react';
import { useDrift } from '@/app/context/driftContext';
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';

function SpotTrading() {
  const { 
    placeSpotOrder, 
    openOrders, 
    getOpenOrders,
    spotPositions,
    refreshPositions 
  } = useDrift();
  
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Monitor orders
  useEffect(() => {
    const interval = setInterval(() => {
      getOpenOrders();
      refreshPositions(); // Check if orders filled
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleBuy = async () => {
    setIsPlacingOrder(true);
    
    try {
      const result = await placeSpotOrder(
        28, // WIF market index
        'buy',
        10, // $10 USDC worth
        'market'
      );
      
      if (result.success) {
        console.log('Order placed:', result.txSignature);
        
        // Start monitoring
        await getOpenOrders();
        
        // Show success message
        alert('Order placed! Waiting for keeper to fill...');
      } else {
        alert('Order failed: ' + result.error);
      }
    } catch (err) {
      console.error('Error placing order:', err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div>
      <button onClick={handleBuy} disabled={isPlacingOrder}>
        {isPlacingOrder ? 'Placing Order...' : 'Buy WIF'}
      </button>
      
      {openOrders.length > 0 && (
        <div className="mt-4">
          <OrderStatusMonitor />
        </div>
      )}
      
      <div className="mt-4">
        <h3>Your Positions</h3>
        {spotPositions
          .filter(p => p.amount > 0)
          .map(position => (
            <div key={position.marketIndex}>
              <p>{position.marketName}: {position.amount}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
```

## Related Documentation

- `DRIFT_ORDER_LIFECYCLE_EXPLAINED.md` - Detailed order lifecycle
- `DRIFT_ORDER_MONITORING_IMPLEMENTATION.md` - Technical implementation
- `DRIFT_ORDER_STATUS_QUICK_REFERENCE.md` - Quick status reference
- `src/hooks/useOrderMonitor.ts` - Order monitoring hook
- `src/components/spot/PendingOrdersIndicator.tsx` - UI component

## Resources

- [Drift Protocol Docs](https://docs.drift.trade/)
- [Drift SDK GitHub](https://github.com/drift-labs/protocol-v2)
- [DLOB Explanation](https://docs.drift.trade/trading/decentralized-orderbook)
- [Keeper Network](https://docs.drift.trade/keepers/overview)
