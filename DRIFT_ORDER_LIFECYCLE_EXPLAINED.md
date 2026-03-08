# Drift Protocol Order Lifecycle - Complete Guide

## 🚨 CRITICAL UNDERSTANDING: Why Your WIF Order Hasn't Filled

### The Problem
You placed a market order to buy WIF on Drift Protocol. The transaction shows on Solscan, but:
- Your USDC balance wasn't deducted
- You didn't receive WIF tokens
- The order appears "stuck"

### The Root Cause
**Drift Protocol market orders are NOT instant like centralized exchanges!**

## 📋 Order Lifecycle in Drift Protocol V2

### Phase 1: Order Placement (What You Did)
```typescript
// Your transaction: placeSpotOrder
const txSignature = await client.placeSpotOrder({
  orderType: OrderType.MARKET,
  marketType: MarketType.SPOT,
  marketIndex: wifMarketIndex,
  direction: PositionDirection.LONG,
  baseAssetAmount: amountBN,
  price: new BN(0), // Market orders use price 0 (execute at oracle price)
});
```

**What happened:**
1. ✅ Transaction confirmed on Solana blockchain
2. ✅ Order created in your Drift user account with status `Open`
3. ❌ **NO tokens exchanged yet!**
4. ❌ **NO balance changes yet!**

### Phase 2: Order Filling (What Needs to Happen)
```typescript
// External keeper must call fillSpotOrder
// This is NOT done by your transaction!
await keeper.fillSpotOrder(
  userPublicKey,
  userAccountPublicKey,
  orderIndex
);
```

**What needs to happen:**
1. ⏳ External keeper bot detects your open order
2. ⏳ Keeper matches your order with counterparties
3. ⏳ Keeper calls `fillSpotOrder` transaction
4. ✅ Order status changes from `Open` to `Filled`
5. ✅ USDC deducted from your account
6. ✅ WIF tokens credited to your account

## ⏱️ Timeline: How Long Does It Take?

### Normal Conditions
- **Liquid markets (SOL, BTC, ETH):** 5-30 seconds
- **Less liquid markets (WIF, BONK):** 30 seconds - 2 minutes
- **Low liquidity markets:** 2-5 minutes or longer

### Factors Affecting Fill Time
1. **Market Liquidity:** More counterparties = faster fills
2. **Keeper Network Activity:** More active keepers = faster fills
3. **Oracle Price Stability:** Volatile prices may delay fills
4. **Order Size:** Larger orders take longer to match
5. **Network Congestion:** Solana congestion delays keeper transactions

## 🔍 How to Check Your Order Status

### Method 1: Query User Account Orders
```typescript
const driftUser = client.getUser();
const userAccount = driftUser.getUserAccount();

// Get all orders for this user
const orders = userAccount.orders;

// Find your WIF order
const wifOrder = orders.find(order => 
  order.marketIndex === wifMarketIndex &&
  order.marketType === MarketType.SPOT &&
  order.status === OrderStatus.Open // Still waiting to fill
);

if (wifOrder) {
  console.log('Order Status:', wifOrder.status);
  console.log('Order Type:', wifOrder.orderType);
  console.log('Base Amount:', wifOrder.baseAssetAmount.toString());
  console.log('Price:', wifOrder.price.toString());
}
```

### Method 2: Check Spot Position
```typescript
// If order filled, you'll have a WIF position
const wifPosition = driftUser.getSpotPosition(wifMarketIndex);

if (wifPosition && wifPosition.scaledBalance && !wifPosition.scaledBalance.isZero()) {
  const tokenAmount = client.getTokenAmount(
    wifPosition.scaledBalance,
    client.getSpotMarketAccount(wifMarketIndex),
    wifPosition.balanceType
  );
  console.log('WIF Balance:', tokenAmount.toString());
  console.log('Order has been filled!');
} else {
  console.log('No WIF position yet - order still pending');
}
```

### Method 3: Monitor Balance Changes
```typescript
// Check USDC balance before and after
const usdcPosition = driftUser.getSpotPosition(0); // USDC is market index 0
const usdcMarket = client.getSpotMarketAccount(0);

if (usdcPosition && usdcPosition.scaledBalance && !usdcPosition.scaledBalance.isZero()) {
  const usdcBalance = client.getTokenAmount(
    usdcPosition.scaledBalance,
    usdcMarket,
    usdcPosition.balanceType
  );
  console.log('Current USDC Balance:', usdcBalance.toString());
}
```

## 🛠️ Troubleshooting Unfilled Orders

### Step 1: Verify Order Exists
```typescript
const orders = driftUser.getUserAccount().orders;
const openOrders = orders.filter(o => o.status === OrderStatus.Open);
console.log('Open Orders:', openOrders.length);
```

### Step 2: Check Collateral
```typescript
const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;
console.log('Free Collateral:', freeCollateral, 'USDC');

// If freeCollateral < order value, order cannot fill
```

### Step 3: Verify Market is Active
```typescript
const market = client.getSpotMarketAccount(wifMarketIndex);
console.log('Market Status:', market.status);
console.log('Market Paused:', market.pausedOperations);
```

### Step 4: Check Oracle Price
```typescript
const oracleData = client.getOracleDataForSpotMarket(wifMarketIndex);
const price = oracleData.price.toNumber() / 1e6;
console.log('Current Oracle Price:', price, 'USDC');
console.log('Oracle Confidence:', oracleData.confidence.toString());
```

## 🚀 Solutions for Stuck Orders

### Option 1: Wait Longer
- Most orders fill within 2-5 minutes
- Check back in 5 minutes before taking action

### Option 2: Cancel and Retry
```typescript
// Cancel the unfilled order
await client.cancelOrder(orderIndex);

// Place a new order (maybe with limit price for more control)
await client.placeSpotOrder({
  orderType: OrderType.LIMIT,
  marketType: MarketType.SPOT,
  marketIndex: wifMarketIndex,
  direction: PositionDirection.LONG,
  baseAssetAmount: amountBN,
  price: limitPriceBN, // Set a specific price
});
```

### Option 3: Use Limit Orders Instead
```typescript
// Limit orders give you more control
const currentPrice = getMarketPrice(wifMarketIndex, 'spot');
const limitPrice = currentPrice * 1.01; // 1% slippage tolerance

await placeSpotOrder(
  wifMarketIndex,
  'buy',
  amount,
  'limit',
  limitPrice
);
```

## 📊 Order Status Enum Values

```typescript
enum OrderStatus {
  Init = 0,      // Order initialized but not placed
  Open = 1,      // Order placed, waiting to fill
  Filled = 2,    // Order completely filled
  Canceled = 3,  // Order cancelled by user
}
```

## 🔄 Recommended Implementation Changes

### Add Order Status Tracking to DriftContext
```typescript
// Add to DriftContextValue interface
interface DriftContextValue {
  // ... existing fields
  openOrders: DriftOrder[];
  getOpenOrders: () => Promise<DriftOrder[]>;
  cancelOrder: (orderIndex: number) => Promise<{ success: boolean; error?: string }>;
}

// Add to DriftProvider
const getOpenOrders = useCallback(async () => {
  if (!driftClientRef.current) return [];
  
  const driftUser = driftClientRef.current.getUser();
  const userAccount = driftUser.getUserAccount();
  
  return userAccount.orders.filter(order => 
    order.status === OrderStatus.Open
  );
}, []);
```

### Add Order Monitoring Hook
```typescript
// hooks/useOrderMonitor.ts
export function useOrderMonitor(marketIndex: number) {
  const { getOpenOrders, refreshPositions } = useDrift();
  const [pendingOrders, setPendingOrders] = useState<DriftOrder[]>([]);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const orders = await getOpenOrders();
      const marketOrders = orders.filter(o => o.marketIndex === marketIndex);
      setPendingOrders(marketOrders);
      
      // If orders cleared, refresh positions
      if (marketOrders.length === 0 && pendingOrders.length > 0) {
        await refreshPositions();
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [marketIndex, getOpenOrders, refreshPositions]);
  
  return { pendingOrders };
}
```

## 📝 Key Takeaways

1. **Market orders are NOT instant** - They require keeper network to fill
2. **Order placement ≠ Order execution** - Two separate transactions
3. **Check order status** - Use `getUserAccount().orders` to monitor
4. **Wait 2-5 minutes** - Normal fill time for most markets
5. **Consider limit orders** - More control over execution price
6. **Monitor positions** - Balance changes only happen after fill

## 🔗 Related Documentation

- [Drift Protocol V2 Docs](https://docs.drift.trade/)
- [Keeper Network](https://docs.drift.trade/keepers)
- [Order Types](https://docs.drift.trade/trading/order-types)
- [Market Making](https://docs.drift.trade/market-making)

## 🎯 Next Steps

1. **Check your order status** using the methods above
2. **Wait 5 minutes** for keeper network to fill
3. **If still unfilled**, cancel and retry with limit order
4. **Implement order monitoring** in your UI for better UX
