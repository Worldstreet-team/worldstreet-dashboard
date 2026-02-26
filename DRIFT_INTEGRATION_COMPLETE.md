# Drift Trading API Integration - Complete

## Overview
Complete integration of Drift Protocol trading API for futures trading with per-user subaccounts.

## Backend API Base URL
```
https://trading.watchup.site
```

## Frontend API Routes Created

### Position Management
1. **POST** `/api/drift/position/open` - Open new perpetual position
2. **POST** `/api/drift/position/close` - Close existing position (full or partial)

### Order Management
3. **POST** `/api/drift/order/place` - Place limit order
4. **POST** `/api/drift/order/cancel` - Cancel specific order
5. **POST** `/api/drift/order/cancel-all` - Cancel all orders (optionally for specific market)

### Collateral Management
6. **POST** `/api/drift/collateral/deposit` - Deposit USDC collateral
7. **POST** `/api/drift/collateral/withdraw` - Withdraw USDC collateral

### Data Fetching
8. **GET** `/api/drift/positions` - Get user's active positions
9. **GET** `/api/drift/orders` - Get user's open orders
10. **GET** `/api/drift/account/summary` - Get account summary (collateral, PnL, leverage, etc.)

## Custom Hook: useDriftTrading

Located at: `src/hooks/useDriftTrading.ts`

### Functions Available:
- `openPosition(marketIndex, direction, baseAmount, leverage, orderType, price)`
- `closePosition(marketIndex, baseAmount?)`
- `placeLimitOrder(marketIndex, direction, baseAmount, price, postOnly, reduceOnly)`
- `cancelOrder(orderId)`
- `cancelAllOrders(marketIndex?)`
- `depositCollateral(amount)`
- `withdrawCollateral(amount)`
- `fetchPositions()` - Returns DriftPosition[]
- `fetchOrders()` - Returns DriftOrder[]
- `fetchAccountSummary()` - Returns DriftAccountSummary

### State:
- `loading` - Boolean indicating operation in progress
- `error` - Error message string or null

## Updated Components

### 1. OrderPanel (`src/components/futures/OrderPanel.tsx`)
- Now uses `/api/drift/position/open` for opening positions
- Supports both market and limit orders
- Displays transaction signature on success
- Properly handles marketIndex from markets array

### 2. PositionPanel (`src/components/futures/PositionPanel.tsx`)
- Fetches positions from `/api/drift/positions`
- Auto-refreshes every 10 seconds
- Uses `/api/drift/position/close` for closing positions
- Displays position data: market, side, size, entry price, value, PnL, leverage
- Shows transaction signature on close

### 3. CollateralPanel (`src/components/futures/CollateralPanel.tsx`)
- Fetches collateral data from `/api/drift/account/summary`
- Uses `/api/drift/collateral/deposit` for deposits
- Uses `/api/drift/collateral/withdraw` for withdrawals
- Displays: total collateral, available collateral, used collateral
- Shows transaction signatures on deposit/withdraw

## Market Indexes

Common Drift market indexes (as per documentation):
- `0` - SOL-PERP
- `1` - BTC-PERP
- `2` - ETH-PERP
- `3` - APT-PERP
- ... (85 total perp markets)

## Data Flow

### Opening a Position:
1. User fills OrderPanel form (market, side, size, leverage)
2. Preview fetched from `/api/futures/preview` (existing)
3. User clicks "Open Long/Short"
4. Frontend calls `/api/drift/position/open`
5. Frontend API proxies to `https://trading.watchup.site/api/drift/position/open`
6. Backend executes Drift transaction
7. Returns transaction signature and position details
8. PositionPanel auto-refreshes to show new position

### Closing a Position:
1. User clicks "Close" button in PositionPanel
2. Frontend calls `/api/drift/position/close` with marketIndex
3. Backend closes position on Drift
4. Returns transaction signature
5. PositionPanel refreshes to remove closed position

### Managing Collateral:
1. CollateralPanel fetches account summary on mount
2. Shows total, available, and used collateral
3. User can deposit/withdraw USDC
4. Transactions executed via Drift API
5. Collateral updates automatically after transaction

## Key Features

### Authentication
- All routes use `getAuthUser()` from `@/lib/auth`
- User ID automatically passed to backend
- No manual userId management needed in components

### Error Handling
- All API routes return structured error responses
- Components display user-friendly error messages
- Transaction signatures shown on success

### Auto-Refresh
- Positions refresh every 10 seconds
- Collateral can be manually refreshed
- Real-time PnL updates

### Leverage Support
- Configurable leverage (1x to 20x)
- Max leverage enforced by backend
- Leverage displayed in position table

## Example Usage

### Opening a Long Position
```typescript
import { useDriftTrading } from '@/hooks/useDriftTrading';

const { openPosition, loading, error } = useDriftTrading();

// Open 1.5 SOL long with 5x leverage at market price
const result = await openPosition(
  0,        // marketIndex (SOL-PERP)
  'long',   // direction
  1.5,      // baseAmount
  5,        // leverage
  'market'  // orderType
);

console.log('TX:', result.txSignature);
```

### Placing a Limit Order
```typescript
const { placeLimitOrder } = useDriftTrading();

// Place limit order to buy 1 SOL at $95.50
const result = await placeLimitOrder(
  0,       // marketIndex
  'long',  // direction
  1.0,     // baseAmount
  95.50,   // price
  true,    // postOnly
  false    // reduceOnly
);
```

### Depositing Collateral
```typescript
const { depositCollateral } = useDriftTrading();

// Deposit 1000 USDC
const result = await depositCollateral(1000);
console.log('Deposited! TX:', result.txSignature);
```

## Testing Checklist

- [ ] Open long position (market order)
- [ ] Open short position (market order)
- [ ] Open position with limit order
- [ ] Close full position
- [ ] Close partial position
- [ ] Place limit order
- [ ] Cancel single order
- [ ] Cancel all orders
- [ ] Deposit collateral
- [ ] Withdraw collateral
- [ ] View positions list
- [ ] View orders list
- [ ] View account summary
- [ ] Auto-refresh positions
- [ ] Error handling for insufficient collateral
- [ ] Error handling for invalid amounts
- [ ] Transaction signature display

## Notes

- Each user trades from their own Drift subaccount
- Subaccount ID is automatically determined by backend from database
- All amounts are in human-readable format (not lamports)
- Prices are in USDC
- Leverage is applied automatically based on collateral
- Rate limiting: 10 requests per minute per endpoint
- Additional per-user rate limiting: 5 req/sec

## Backend Service

The backend service (`services/driftTradingService.js`) handles:
- Drift SDK initialization
- Subaccount management
- Transaction signing and submission
- Position and order tracking
- Collateral management
- Real-time price feeds

## Security

- All routes require authentication
- User ID validated on every request
- Private keys never exposed to frontend
- Transactions signed on backend
- Rate limiting prevents abuse

## Future Enhancements

Potential additions:
- Stop loss / take profit orders
- Trailing stops
- Advanced order types (OCO, etc.)
- Position history
- PnL charts
- Funding rate history
- Liquidation alerts
- Multi-market orders

---

**Status**: ✅ Complete and Ready for Testing
**Last Updated**: 2024
