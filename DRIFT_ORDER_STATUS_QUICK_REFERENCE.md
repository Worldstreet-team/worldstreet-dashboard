# Drift Order Status - Quick Reference

## 🚨 TL;DR

**Market orders in Drift Protocol are NOT instant!**

- Order placement = Transaction confirmed ✅
- Order execution = Keeper fills it (30s-2min later) ⏳
- Balance changes = Only after keeper fills ✅

## 🔍 Check Order Status (3 Methods)

### Method 1: Use the Hook (Recommended)
```typescript
import { useOrderMonitor } from '@/hooks/useOrderMonitor';

const { pendingOrders, hasPendingOrders, orderCount } = useOrderMonitor({
  marketIndex: wifMarketIndex, // Optional: filter by market
});

console.log('Pending orders:', pendingOrders);
console.log('Has pending:', hasPendingOrders);
console.log('Count:', orderCount);
```

### Method 2: Direct Context Call
```typescript
import { useDrift } from '@/app/context/driftContext';

const { getOpenOrders } = useDrift();

const orders = await getOpenOrders();
console.log('Open orders:', orders);
```

### Method 3: Raw SDK Access
```typescript
const client = driftClientRef.current;
const driftUser = client.getUser();
const userAccount = driftUser.getUserAccount();

const openOrders = userAccount.orders.filter(order => 
  order.status === 1 // 1 = Open
);
console.log('Open orders:', openOrders);
```

## 🎨 Show Pending Orders in UI

### Full Indicator
```typescript
import { PendingOrdersIndicator } from '@/components/spot/PendingOrdersIndicator';

<PendingOrdersIndicator 
  marketIndex={wifMarketIndex}
  showDetails={true}
/>
```

### Compact Badge
```typescript
import { PendingOrdersBadge } from '@/components/spot/PendingOrdersIndicator';

<PendingOrdersBadge marketIndex={wifMarketIndex} />
```

## ❌ Cancel Order

```typescript
const { cancelOrder } = useDrift();

const result = await cancelOrder(orderIndex);
if (result.success) {
  console.log('Order cancelled:', result.txSignature);
} else {
  console.error('Cancel failed:', result.error);
}
```

## 📊 Order Status Values

```typescript
enum OrderStatus {
  Init = 0,      // Initialized but not placed
  Open = 1,      // Placed, waiting to fill ⏳
  Filled = 2,    // Completely filled ✅
  Canceled = 3,  // Cancelled by user ❌
}
```

## ⏱️ Expected Fill Times

| Market Liquidity | Expected Time |
|-----------------|---------------|
| High (SOL, BTC) | 5-30 seconds |
| Medium (WIF, BONK) | 30s-2 minutes |
| Low | 2-5 minutes |

## 🔄 Auto-Refresh Positions

```typescript
const { pendingOrders } = useOrderMonitor({
  marketIndex: wifMarketIndex,
  autoRefresh: true, // ✅ Auto-refresh when orders fill
  pollInterval: 2000, // Check every 2 seconds
});
```

## 🐛 Debugging

### Enable Detailed Logging
```typescript
// In driftContext.tsx, search for:
console.log('[DriftContext] Spot order sent:', txSignature);

// Add after order placement:
const orders = await getOpenOrders();
console.log('Orders after placement:', orders);
```

### Check Why Order Isn't Filling
```typescript
// 1. Verify order exists
const orders = await getOpenOrders();
console.log('Open orders:', orders);

// 2. Check collateral
const { summary } = useDrift();
console.log('Free collateral:', summary?.freeCollateral);

// 3. Check market status
const market = client.getSpotMarketAccount(marketIndex);
console.log('Market status:', market.status);
console.log('Market paused:', market.pausedOperations);

// 4. Check oracle price
const oracleData = client.getOracleDataForSpotMarket(marketIndex);
console.log('Oracle price:', oracleData.price.toNumber() / 1e6);
```

## 🚀 Common Patterns

### Pattern 1: Show Loading State
```typescript
const { hasPendingOrders } = useOrderMonitor({ marketIndex });

return (
  <button disabled={hasPendingOrders}>
    {hasPendingOrders ? 'Order Pending...' : 'Place Order'}
  </button>
);
```

### Pattern 2: Notify When Filled
```typescript
const { orderCount } = useOrderMonitor({ marketIndex });
const prevCount = useRef(orderCount);

useEffect(() => {
  if (prevCount.current > orderCount) {
    toast.success('Order filled!');
  }
  prevCount.current = orderCount;
}, [orderCount]);
```

### Pattern 3: Disable Trading During Fill
```typescript
const { hasPendingOrders } = useOrderMonitor({ marketIndex });

if (hasPendingOrders) {
  return <div>Please wait for pending order to fill...</div>;
}

return <TradingForm />;
```

## 📝 Integration Checklist

- [ ] Import `useOrderMonitor` hook
- [ ] Add `<PendingOrdersIndicator />` to UI
- [ ] Show pending state in balance display
- [ ] Disable trading during pending orders (optional)
- [ ] Add cancel button for pending orders
- [ ] Test with real order placement
- [ ] Verify auto-refresh works

## 🔗 Related Docs

- `DRIFT_ORDER_LIFECYCLE_EXPLAINED.md` - Detailed explanation
- `DRIFT_ORDER_MONITORING_IMPLEMENTATION.md` - Implementation guide
- `src/hooks/useOrderMonitor.ts` - Hook source code
- `src/components/spot/PendingOrdersIndicator.tsx` - UI components

## 💡 Pro Tips

1. **Always show pending state** - Users need to know order is processing
2. **Use market-specific monitoring** - More efficient than global
3. **Set reasonable poll interval** - 2 seconds is good balance
4. **Auto-refresh positions** - Better UX when orders fill
5. **Provide cancel option** - Let users cancel stuck orders
6. **Show estimated time** - "Usually takes 30s-2min"
7. **Log everything** - Helps debug issues

## ⚠️ Common Mistakes

❌ **Assuming instant execution**
```typescript
await placeSpotOrder(...);
// Balance NOT updated yet!
```

✅ **Wait for order to fill**
```typescript
await placeSpotOrder(...);
// Monitor with useOrderMonitor
// Balance updates when order fills
```

❌ **Not showing pending state**
```typescript
// User confused why balance didn't change
```

✅ **Show pending indicator**
```typescript
<PendingOrdersIndicator marketIndex={marketIndex} />
```

❌ **Polling too frequently**
```typescript
pollInterval: 100 // Too fast! Wastes RPC calls
```

✅ **Reasonable interval**
```typescript
pollInterval: 2000 // Good balance
```

## 🎯 Quick Start

```typescript
// 1. Add to your component
import { useOrderMonitor } from '@/hooks/useOrderMonitor';
import { PendingOrdersIndicator } from '@/components/spot/PendingOrdersIndicator';

// 2. Use the hook
const { hasPendingOrders, pendingOrders } = useOrderMonitor({
  marketIndex: yourMarketIndex,
});

// 3. Show in UI
return (
  <div>
    <PendingOrdersIndicator marketIndex={yourMarketIndex} />
    
    {hasPendingOrders && (
      <div className="text-yellow-600">
        {pendingOrders.length} order(s) pending...
      </div>
    )}
  </div>
);
```

That's it! 🎉
