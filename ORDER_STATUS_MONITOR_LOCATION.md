# Order Status Monitor - Location Guide

## Current Integration

The `OrderStatusMonitor` component is now integrated into your portfolio page and will automatically appear when you have open orders.

## Portfolio Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Portfolio Overview                        [Refresh]     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  Total   │  │   Free   │  │Unrealized│  │   SOL    ││
│  │Collateral│  │Collateral│  │   PnL    │  │ Balance  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Leverage │  │  Margin  │  │   Open   │               │
│  │          │  │  Ratio   │  │Positions │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🕐 Open Orders                              [↻]     ││ ← ORDER STATUS MONITOR
│  ├─────────────────────────────────────────────────────┤│   (Only shows when you
│  │ WIF                    BUY    MARKET                ││    have open orders)
│  │ Amount: 0.000123      [Cancel]                      ││
│  │ ⏱ Waiting for keeper to fill                       ││
│  │ ℹ Market orders are filled by external keepers...  ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 📈 Futures Positions                                ││
│  ├─────────────────────────────────────────────────────┤│
│  │ [Position table...]                                 ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 💰 Spot Positions                                   ││
│  ├─────────────────────────────────────────────────────┤│
│  │ [Paginated positions...]                            ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## When It Appears

The Order Status Monitor will automatically appear when:

1. **You place a spot market order** - Shows immediately after order placement
2. **You place a spot limit order** - Displays until order is filled or cancelled
3. **You have pending orders from previous session** - Shows on page load

## When It Disappears

The component automatically hides when:

1. **All orders are filled** - Keepers have executed all your orders
2. **All orders are cancelled** - You manually cancelled all pending orders
3. **No orders exist** - Clean slate, no pending orders

## Visual States

### With Open Orders
```
┌─────────────────────────────────────────────────────────┐
│ 🕐 Open Orders                    2                [↻] │
├─────────────────────────────────────────────────────────┤
│ WIF                    BUY    MARKET                    │
│ Amount: 0.000123      [Cancel]                          │
│ ⏱ Waiting for keeper to fill                           │
│ ℹ Market orders are filled by external keepers...      │
├─────────────────────────────────────────────────────────┤
│ SOL                    SELL   LIMIT                     │
│ Amount: 0.5  Price: $81.50    [Cancel]                 │
│ ⏱ Waiting for keeper to fill                           │
│ ℹ Market orders are filled by external keepers...      │
├─────────────────────────────────────────────────────────┤
│ 💡 Orders are filled by Drift Protocol's keeper network│
│ Check your spot positions to see filled orders.        │
└─────────────────────────────────────────────────────────┘
```

### No Open Orders (Component Hidden)
```
[Component does not render - nothing shown]
```

## How to Access

### From Portfolio Page
1. Navigate to `/portfolio` in your app
2. If you have open orders, the monitor appears automatically
3. No action needed - it's always visible when relevant

### From Spot Trading Page
Currently not integrated on spot trading page, but you can add it:

```tsx
// In src/app/(DashboardLayout)/spot/page.tsx
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';

// Add somewhere in your layout:
{openOrders.length > 0 && (
  <OrderStatusMonitor autoRefresh={true} refreshInterval={5000} />
)}
```

## Features Available

### 1. Real-time Updates
- Auto-refreshes every 5 seconds
- Shows latest order status
- Updates when orders are filled

### 2. Manual Refresh
- Click the refresh icon (↻) in the header
- Forces immediate update
- Useful if you want to check status now

### 3. Cancel Orders
- Click "Cancel" button on any order
- Confirms cancellation on blockchain
- Removes order from list after cancellation

### 4. Visual Feedback
- Green badge for BUY/LONG orders
- Red badge for SELL/SHORT orders
- Loading spinner during refresh
- Disabled state while cancelling

## Testing the Component

### Step 1: Place a Test Order
```tsx
// In your spot trading interface
await placeSpotOrder(
  28,      // WIF market index
  'buy',   // Direction
  1,       // $1 USDC worth
  'market' // Order type
);
```

### Step 2: Navigate to Portfolio
```
Go to: /portfolio
```

### Step 3: See the Monitor
You should see the Order Status Monitor appear with your pending order.

### Step 4: Wait for Fill
- Order typically fills in 30s-2min
- Monitor auto-refreshes every 5 seconds
- Component disappears when order is filled

### Step 5: Check Spot Positions
After the order fills:
- Scroll down to "Spot Positions" section
- You'll see your new WIF balance
- The Order Status Monitor will have disappeared

## Troubleshooting

### Component Not Showing
1. **Check if you have open orders**: Call `getOpenOrders()` in console
2. **Verify client is ready**: Check `isClientReady` is true
3. **Refresh the page**: Sometimes state needs to sync

### Orders Not Updating
1. **Check auto-refresh**: Should refresh every 5 seconds
2. **Manual refresh**: Click the refresh icon
3. **Check network**: Ensure Solana RPC is responding

### Can't Cancel Order
1. **Check if order already filled**: Refresh and see if it disappeared
2. **Wait for transaction**: Cancellation takes ~2-5 seconds
3. **Check SOL balance**: Need SOL for transaction fees

## Code Reference

### Component Location
```
src/components/spot/OrderStatusMonitor.tsx
```

### Integration Location
```
src/app/(DashboardLayout)/portfolio/page.tsx
Line: ~280 (after Account Metrics section)
```

### Context Hook
```typescript
const { openOrders, getOpenOrders, cancelOrder } = useDrift();
```

## Related Documentation

- `ORDER_MONITORING_IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `DRIFT_ORDER_MONITORING_GUIDE.md` - How to monitor orders programmatically
- `DRIFT_ORDER_LIFECYCLE_EXPLAINED.md` - Understanding order lifecycle
- `src/hooks/useOrderMonitor.ts` - Order monitoring hook
