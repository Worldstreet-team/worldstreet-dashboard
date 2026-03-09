# Drift All Orders Implementation

## Overview
Implemented `getAllOrders()` function to show ALL orders (open, filled, cancelled) instead of just open orders in the OrderStatusMonitor component.

## Changes Made

### 1. Added `getAllOrders()` Function to DriftContext
**File**: `src/app/context/driftContext.tsx`

Added new function after `getOpenOrders()`:
```typescript
const getAllOrders = useCallback(async (): Promise<DriftOrder[]> => {
  // Get ALL orders from user account (not just open ones)
  const allOrders = userAccount.orders.filter((order: any) =>
    order.status !== OrderStatus.INIT // Skip uninitialized orders
  );

  // Map status to human-readable string
  switch (order.status) {
    case OrderStatus.OPEN: statusText = 'open'; break;
    case OrderStatus.FILLED: statusText = 'filled'; break;
    case OrderStatus.CANCELED: statusText = 'canceled'; break;
  }

  // Only include spot orders (filter out perp orders)
  if (order.marketType !== MarketType.SPOT) continue;
}, []);
```

**Key Features**:
- Fetches ALL orders from `userAccount.orders`
- Filters out only `INIT` status orders (uninitialized slots)
- Maps order status enum to human-readable strings ('open', 'filled', 'canceled')
- Only includes spot orders (filters out perp orders)
- Calculates fill progress for each order
- Uses proper Drift SDK enums (OrderStatus, MarketType, OrderType, PositionDirection)

### 2. Exported `getAllOrders` in Context Value
Added `getAllOrders` to the DriftContextValue interface and context provider value.

### 3. Updated OrderStatusMonitor Component
**File**: `src/components/spot/OrderStatusMonitor.tsx`

**Changes**:
- Changed from `getOpenOrders()` to `getAllOrders()`
- Added local state `allOrders` to store all orders
- Updated header from "Open Orders" to "Order History"
- Changed icon from `ph:clock` to `ph:list`
- Updated empty state message to "No Orders" / "You haven't placed any orders yet"

**Visual Status Indicators**:
```typescript
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'filled':
      return { bg: 'bg-[#0ecb81]/10', text: 'text-[#0ecb81]', icon: 'ph:check-circle' };
    case 'canceled':
      return { bg: 'bg-[#848e9c]/10', text: 'text-[#848e9c]', icon: 'ph:x-circle' };
    case 'open':
      return { bg: 'bg-[#fcd535]/10', text: 'text-[#fcd535]', icon: 'ph:clock' };
  }
};
```

**Status Badge Colors**:
- **Filled**: Green (`#0ecb81`) with check-circle icon
- **Cancelled**: Gray (`#848e9c`) with x-circle icon
- **Open**: Yellow (`#fcd535`) with clock icon

**Conditional UI Elements**:
- Cancel button only shows for orders with status 'open'
- "Waiting for keeper to fill" message only shows for open orders
- Info banner about keeper network only shows for open orders

## Usage

The OrderStatusMonitor component is used in the portfolio page:
```typescript
import OrderStatusMonitor from '@/components/spot/OrderStatusMonitor';

// In portfolio page
{openOrders.length > 0 && (
  <OrderStatusMonitor autoRefresh={true} refreshInterval={5000} />
)}
```

## Order Status Flow

1. **INIT**: Uninitialized order slot (filtered out, not shown)
2. **OPEN**: Order placed, waiting for keeper to fill (yellow badge, shows cancel button)
3. **FILLED**: Order successfully filled by keeper (green badge, no cancel button)
4. **CANCELED**: Order cancelled by user or expired (gray badge, no cancel button)

## Benefits

1. **Complete Order History**: Users can see all their orders, not just open ones
2. **Visual Status Indicators**: Color-coded badges make it easy to identify order status at a glance
3. **Better UX**: Users can track their order history and see which orders were filled vs cancelled
4. **Proper SDK Usage**: Uses Drift SDK's built-in enums and methods for type safety
5. **Conditional Actions**: Cancel button only appears for open orders

## Technical Details

- Uses `userAccount.orders` array from Drift SDK
- Filters by `OrderStatus.INIT` to exclude uninitialized slots
- Only shows spot orders (filters out perp orders with `MarketType.SPOT` check)
- Uses `order.orderId` for proper order identification (not array index)
- Auto-refreshes every 5 seconds by default
- Maintains backward compatibility with existing code

## Testing

To test:
1. Place a spot market order on Drift
2. Navigate to Portfolio page
3. Order should appear with "OPEN" status (yellow badge)
4. Wait for keeper to fill (30s-2min)
5. Order should update to "FILLED" status (green badge)
6. Try cancelling an open order - should update to "CANCELED" status (gray badge)

## Files Modified

1. `src/app/context/driftContext.tsx` - Added `getAllOrders()` function
2. `src/components/spot/OrderStatusMonitor.tsx` - Updated to use `getAllOrders()` with status indicators
