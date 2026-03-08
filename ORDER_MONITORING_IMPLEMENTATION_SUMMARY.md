# Order Monitoring Implementation Summary

## What Was Implemented

Enhanced the Drift order monitoring system to provide detailed order status tracking, including auction phase detection, fill progress, and timing information.

## Files Created

### 1. `src/hooks/useOrderStatus.ts`
A React hook for monitoring order status with detailed information:
- Fill progress tracking (partial fills)
- Auction status and timing
- Auto-refresh every 5 seconds
- Error handling

### 2. `src/components/spot/OrderStatusMonitor.tsx`
A complete UI component for displaying open orders:
- Real-time order list with auto-refresh
- Cancel order functionality
- Visual status indicators
- Helpful info messages about keeper network
- Responsive design matching your app's theme

### 3. `DRIFT_ORDER_MONITORING_GUIDE.md`
Comprehensive documentation covering:
- Order lifecycle explanation
- Typical fill times
- How to monitor orders programmatically
- Integration examples
- Troubleshooting guide
- Best practices

## Files Modified

### `src/app/context/driftContext.tsx`
Enhanced the `getOpenOrders()` function to include:
- Current slot fetching for auction timing
- Fill progress calculation (filled vs total amount)
- Auction status detection (isInAuction, slotsUntilAuctionEnd)
- Detailed logging for debugging
- Fixed OrderStatus enum usage (OPEN instead of Open)

## Key Features

### 1. Enhanced Order Tracking
```typescript
// Now includes detailed information
const orders = await getOpenOrders();
// Each order includes:
// - Fill percentage
// - Auction status
// - Slots until auction end
// - Remaining amount
```

### 2. Auto-Refresh System
```tsx
<OrderStatusMonitor 
  autoRefresh={true}
  refreshInterval={5000} // 5 seconds
/>
```

### 3. Visual Feedback
- Loading states during refresh
- Order count badges
- Direction color coding (green for buy, red for sell)
- Cancel button with loading state
- Info banners explaining keeper network

## Where It's Used

The `OrderStatusMonitor` component is currently integrated in:

### 1. Portfolio Page (`src/app/(DashboardLayout)/portfolio/page.tsx`)
- Displays between Account Metrics and Futures Positions sections
- Only shows when there are open orders (`openOrders.length > 0`)
- Auto-refreshes every 5 seconds
- Allows users to cancel pending orders

```tsx
{/* Open Orders Monitor - Only show if there are open orders */}
{openOrders.length > 0 && (
  <OrderStatusMonitor 
    autoRefresh={true}
    refreshInterval={5000}
  />
)}
```

### Potential Additional Locations

You can also add it to:
- **Spot Trading Page** - Show pending orders while trading
- **Futures Trading Page** - Monitor perp orders
- **Dashboard** - Quick overview of all pending orders
- **Mobile Trading Modal** - Show orders in mobile view

## How to Use

### In Your Portfolio Page

```tsx
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';

function PortfolioPage() {
  return (
    <div>
      {/* Other portfolio content */}
      
      <OrderStatusMonitor />
      
      {/* Rest of portfolio */}
    </div>
  );
}
```

### Programmatic Access

```tsx
import { useDrift } from '@/app/context/driftContext';

function MyComponent() {
  const { openOrders, getOpenOrders } = useDrift();
  
  useEffect(() => {
    // Fetch orders
    getOpenOrders();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(getOpenOrders, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <p>Open Orders: {openOrders.length}</p>
    </div>
  );
}
```

## Understanding Order Fill Times

### Typical Timeline
1. **Order Placed** (0s) - Transaction sent to blockchain
2. **Auction Phase** (0-2s) - Price discovery period
3. **Keeper Detection** (5-30s) - Keepers detect your order
4. **Order Filled** (30s-2min) - Keeper executes fill transaction
5. **Balance Updated** (immediately after fill)

### Why It Takes Time
- **Keeper Network**: External bots must detect and fill orders
- **Auction Mechanism**: Prevents front-running
- **Network Congestion**: Solana can be busy
- **Gas Economics**: Keepers prioritize profitable orders

## Monitoring Best Practices

1. **Poll Regularly**: Check orders every 5-10 seconds
2. **Check Positions**: Use `refreshPositions()` to see filled orders
3. **Set Expectations**: Tell users orders take 30s-2min
4. **Show Feedback**: Display loading states and progress
5. **Handle Errors**: Check for insufficient collateral

## Order Status Flow

```
┌─────────────┐
│ Order Placed│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Status: OPEN│ ◄── You are here when monitoring
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ In Auction  │ (0-3 slots, ~1-2 seconds)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Waiting for │ (Keepers detect and fill)
│   Keeper    │ (30s-2min typically)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Status: FILLED│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Balance Update│ (Automatic via WebSocket)
└─────────────┘
```

## Checking If Order Filled

### Method 1: Check Open Orders
```typescript
const orders = await getOpenOrders();
if (orders.length === 0) {
  console.log('All orders filled!');
}
```

### Method 2: Check Spot Positions
```typescript
await refreshPositions();
const wifPosition = spotPositions.find(p => p.marketName === 'WIF');
if (wifPosition && wifPosition.amount > 0) {
  console.log('WIF order filled! Balance:', wifPosition.amount);
}
```

### Method 3: Monitor Balance Changes
```typescript
const beforeBalance = spotPositions.find(p => p.marketName === 'WIF')?.amount || 0;

// Place order
await placeSpotOrder(28, 'buy', 10, 'market');

// Poll for balance change
const checkFilled = setInterval(async () => {
  await refreshPositions();
  const afterBalance = spotPositions.find(p => p.marketName === 'WIF')?.amount || 0;
  
  if (afterBalance > beforeBalance) {
    console.log('Order filled! New balance:', afterBalance);
    clearInterval(checkFilled);
  }
}, 5000);
```

## Troubleshooting

### Order Not Showing Up
- Check `isClientReady` is true
- Verify order was placed successfully (check txSignature)
- Call `getOpenOrders()` to refresh

### Order Stuck for >5 Minutes
1. Cancel the order: `await cancelOrder(orderIndex)`
2. Check your USDC balance wasn't deducted
3. Place a new order with adjusted parameters

### Balance Not Updating
1. Call `refreshPositions()` manually
2. Check if order is still in `openOrders` array
3. Verify WebSocket connection is active

## Next Steps

1. **Add to Portfolio Page**: Import and use `OrderStatusMonitor` component
2. **Test Order Flow**: Place a small test order and watch it fill
3. **Customize UI**: Adjust colors/styling to match your design
4. **Add Notifications**: Show toast when orders fill
5. **Track History**: Store filled orders for history view

## Related Files

- `src/hooks/useOrderMonitor.ts` - Existing order monitor hook
- `src/components/spot/PendingOrdersIndicator.tsx` - Existing pending orders UI
- `DRIFT_ORDER_LIFECYCLE_EXPLAINED.md` - Order lifecycle documentation
- `DRIFT_ORDER_MONITORING_IMPLEMENTATION.md` - Original monitoring docs

## Technical Notes

- Orders use the DLOB (Decentralized Limit Order Book)
- Keepers are incentivized by trading fees
- Auction mechanism prevents front-running
- WebSocket subscription provides real-time updates
- Order indices are stable within a user account
