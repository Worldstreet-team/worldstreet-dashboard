# Drift Order Monitoring Implementation

## 🎯 Problem Solved

Users placing market orders on Drift Protocol were confused because:
- Orders appeared to succeed (transaction confirmed)
- But balances didn't change immediately
- No feedback about order status
- No way to check if order was filled

## 🔧 Solution Implemented

### 1. Order Status Tracking in DriftContext

Added order management functions to `driftContext.tsx`:

```typescript
interface DriftOrder {
  marketIndex: number;
  marketType: 'perp' | 'spot';
  orderType: 'market' | 'limit';
  direction: 'long' | 'short' | 'buy' | 'sell';
  baseAssetAmount: string;
  price: string;
  status: 'init' | 'open' | 'filled' | 'canceled';
  orderIndex: number;
}

// New context methods
getOpenOrders: () => Promise<DriftOrder[]>;
cancelOrder: (orderIndex: number) => Promise<{ success: boolean; error?: string }>;
openOrders: DriftOrder[]; // State array
```

**Implementation:**
- `getOpenOrders()` - Queries user account for orders with status `Open`
- `cancelOrder(orderIndex)` - Cancels a pending order
- Automatically updates `openOrders` state

### 2. Order Monitoring Hook

Created `hooks/useOrderMonitor.ts`:

```typescript
export function useOrderMonitor(options: {
  marketIndex?: number;
  autoRefresh?: boolean;
  pollInterval?: number;
})
```

**Features:**
- Polls for open orders every 2 seconds (configurable)
- Filters by market if specified
- Detects when orders fill (count decreases)
- Auto-refreshes positions when orders fill
- Provides cancel function

**Usage:**
```typescript
const { 
  pendingOrders, 
  hasPendingOrders, 
  orderCount,
  cancelOrder 
} = useOrderMonitor({ 
  marketIndex: wifMarketIndex,
  autoRefresh: true 
});
```

### 3. UI Components

Created `components/spot/PendingOrdersIndicator.tsx`:

**PendingOrdersIndicator:**
- Shows pending order count
- Displays order details (market, direction, type)
- Cancel button for each order
- Animated spinner while monitoring
- Helpful message about fill time

**PendingOrdersBadge:**
- Compact version for headers/status bars
- Shows order count with spinner
- Minimal space usage

### 4. Enhanced Balance Hook

Updated `hooks/useSpotBalances.ts`:

**New features:**
- Checks for pending orders affecting the market
- Returns `hasPendingOrders` and `pendingOrderCount`
- Helps UI show "pending" states

```typescript
const { 
  baseBalance, 
  quoteBalance,
  hasPendingOrders,
  pendingOrderCount 
} = useSpotBalances(baseMarketIndex, quoteMarketIndex);
```

## 📋 How It Works

### Order Lifecycle

1. **User places order** → `placeSpotOrder()`
   - Transaction confirms
   - Order created with status `Open`
   - NO balance changes yet

2. **Order monitoring starts** → `useOrderMonitor()`
   - Polls every 2 seconds
   - Checks for open orders
   - Displays pending indicator

3. **Keeper fills order** (external)
   - Keeper bot detects order
   - Calls `fillSpotOrder` transaction
   - Order status changes to `Filled`

4. **Hook detects fill** → `useOrderMonitor()`
   - Order count decreases
   - Triggers `refreshPositions()`
   - Balances update in UI

### Data Flow

```
User Action
    ↓
placeSpotOrder() → Transaction confirmed
    ↓
getOpenOrders() → Returns [order]
    ↓
useOrderMonitor() → Polls every 2s
    ↓
PendingOrdersIndicator → Shows "1 Order Pending"
    ↓
[Keeper fills order externally]
    ↓
getOpenOrders() → Returns []
    ↓
useOrderMonitor() → Detects count change
    ↓
refreshPositions() → Updates balances
    ↓
UI updates → Shows new balance
```

## 🎨 UI Integration Examples

### Example 1: Spot Trading Page

```typescript
import { PendingOrdersIndicator } from '@/components/spot/PendingOrdersIndicator';

export default function SpotTradingPage() {
  const { getSpotMarketIndexBySymbol } = useDrift();
  const marketIndex = getSpotMarketIndexBySymbol('WIF');

  return (
    <div>
      {/* Show pending orders for this market */}
      <PendingOrdersIndicator 
        marketIndex={marketIndex}
        showDetails={true}
      />
      
      {/* Rest of trading UI */}
    </div>
  );
}
```

### Example 2: Global Status Bar

```typescript
import { PendingOrdersBadge } from '@/components/spot/PendingOrdersIndicator';

export default function Header() {
  return (
    <header>
      <PendingOrdersBadge /> {/* Shows all pending orders */}
    </header>
  );
}
```

### Example 3: Balance Display with Pending State

```typescript
export function BalanceDisplay() {
  const { 
    baseBalance, 
    hasPendingOrders 
  } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  return (
    <div>
      <span>Balance: {baseBalance}</span>
      {hasPendingOrders && (
        <span className="text-yellow-600">
          (Order pending)
        </span>
      )}
    </div>
  );
}
```

## 🔍 Debugging Orders

### Check Order Status

```typescript
const { getOpenOrders } = useDrift();

// Get all open orders
const orders = await getOpenOrders();
console.log('Open orders:', orders);

// Check specific market
const wifOrders = orders.filter(o => o.marketIndex === wifMarketIndex);
console.log('WIF orders:', wifOrders);
```

### Monitor Order Lifecycle

```typescript
// Enable detailed logging
const { pendingOrders, isMonitoring } = useOrderMonitor({
  marketIndex: wifMarketIndex,
  pollInterval: 1000, // Check every second
});

useEffect(() => {
  console.log('Pending orders:', pendingOrders);
  console.log('Is monitoring:', isMonitoring);
}, [pendingOrders, isMonitoring]);
```

### Check User Account Orders Directly

```typescript
const client = driftClientRef.current;
const driftUser = client.getUser();
const userAccount = driftUser.getUserAccount();

console.log('All orders:', userAccount.orders);
console.log('Open orders:', userAccount.orders.filter(o => o.status === 1));
```

## ⚡ Performance Considerations

### Polling Frequency
- Default: 2000ms (2 seconds)
- Recommended: 1000-3000ms
- Too fast: Unnecessary RPC calls
- Too slow: Delayed UI updates

### Auto-refresh Control
```typescript
// Disable auto-refresh if not needed
const { pendingOrders } = useOrderMonitor({
  autoRefresh: false, // Don't refresh positions automatically
});
```

### Market-specific Monitoring
```typescript
// Only monitor specific market (more efficient)
const { pendingOrders } = useOrderMonitor({
  marketIndex: wifMarketIndex, // Only WIF orders
});
```

## 🚀 Future Enhancements

### 1. WebSocket Order Updates
Instead of polling, subscribe to order events:
```typescript
// Future implementation
client.eventEmitter.on('orderFilled', (order) => {
  console.log('Order filled:', order);
  refreshPositions();
});
```

### 2. Order Fill Notifications
Show toast when order fills:
```typescript
useEffect(() => {
  if (previousOrderCount > orderCount) {
    toast.success('Order filled!');
  }
}, [orderCount]);
```

### 3. Estimated Fill Time
Calculate based on market liquidity:
```typescript
const estimatedFillTime = calculateFillTime(
  marketIndex,
  orderSize,
  marketLiquidity
);
```

### 4. Order History
Track filled/cancelled orders:
```typescript
interface OrderHistory {
  order: DriftOrder;
  filledAt?: Date;
  cancelledAt?: Date;
  fillPrice?: number;
}
```

## 📚 Related Files

- `src/app/context/driftContext.tsx` - Order management functions
- `src/hooks/useOrderMonitor.ts` - Order monitoring hook
- `src/hooks/useSpotBalances.ts` - Enhanced with order status
- `src/components/spot/PendingOrdersIndicator.tsx` - UI components
- `DRIFT_ORDER_LIFECYCLE_EXPLAINED.md` - Detailed explanation

## ✅ Testing Checklist

- [ ] Place market order
- [ ] Verify order appears in pending list
- [ ] Wait for order to fill (30s-2min)
- [ ] Verify order disappears from pending list
- [ ] Verify balances update automatically
- [ ] Test cancel order functionality
- [ ] Test with multiple pending orders
- [ ] Test market-specific filtering
- [ ] Test auto-refresh behavior
- [ ] Test UI components render correctly

## 🎓 Key Learnings

1. **Drift orders are asynchronous** - Placement ≠ Execution
2. **Keeper network fills orders** - External bots, not your transaction
3. **Polling is necessary** - No WebSocket events for order fills (yet)
4. **User feedback is critical** - Show pending states clearly
5. **Auto-refresh improves UX** - Update balances when orders fill

## 📞 Support

If orders are stuck for >5 minutes:
1. Check order status with `getOpenOrders()`
2. Verify sufficient collateral
3. Check market is active (not paused)
4. Try cancelling and placing limit order instead
5. Check Drift Discord for keeper network status
