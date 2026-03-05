# Backend API Integration Documentation

## Overview

This document explains the complete integration between the Next.js frontend and the backend trading API at `https://trading.watchup.site`. The system uses **Next.js API routes as proxies** to the backend, NOT MongoDB/Mongoose for wallet and trading data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  (React Components: BinanceOrderForm, PositionsList, etc.)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes Layer                     │
│         (Proxy routes with Clerk authentication)                │
│  /api/trade/open, /api/positions, /api/wallets/*, etc.        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ HTTPS Requests
┌─────────────────────────────────────────────────────────────────┐
│                  Backend Trading API Server                     │
│              https://trading.watchup.site                       │
│  (MySQL Database, Wallet Management, Trade Execution)          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. **No MongoDB for Trading Data**
- The spot trading system does NOT use MongoDB/Mongoose for:
  - Wallet addresses and private keys
  - Trade execution and history
  - Position management
  - TP/SL orders
  
### 2. **Backend as Source of Truth**
- All wallet data is stored in the backend's MySQL database
- The backend manages encrypted private keys
- Trade execution happens on the backend
- Position tracking and PnL calculations are backend-managed

### 3. **Next.js Routes as Secure Proxies**
- Next.js API routes authenticate users via Clerk
- Routes validate requests and forward to backend
- No sensitive data (private keys) exposed to frontend
- Error handling and sanitization at proxy layer

## Wallet Management

### How Wallets Are Retrieved

The spot trading system gets wallet information through this flow:

```typescript
// 1. Frontend requests wallet data
const response = await fetch(`/api/users/${userId}/wallets`);

// 2. Next.js API route authenticates and proxies
// File: src/app/api/users/[userId]/wallets/route.ts
export async function GET(request, { params }) {
  const { userId: clerkUserId } = await auth(); // Clerk authentication
  
  // Verify user authorization
  if (clerkUserId !== params.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Forward to backend
  const response = await fetch(
    `${BACKEND_URL}/api/users/${params.userId}/wallets`
  );
  
  return NextResponse.json(await response.json());
}

// 3. Backend returns wallet data from MySQL
// Response: [
//   { asset: 'SOL', chain: 'sol', public_address: '...' },
//   { asset: 'ETH', chain: 'evm', public_address: '...' }
// ]
```

### Wallet Data Flow

```
User Action (Trade) 
    ↓
Frontend Component (BinanceOrderForm)
    ↓
Next.js API Route (/api/trade/open)
    ↓
Backend API (POST /api/trade/open)
    ↓
Backend fetches wallet from MySQL:
  - SELECT public_address, encrypted_private_key 
    FROM user_wallets 
    WHERE user_id = ? AND asset = ?
    ↓
Backend executes trade with private key
    ↓
Backend stores trade in MySQL
    ↓
Response flows back to frontend
```

## API Routes Created

### Trade Management

#### 1. **POST /api/trade/open**
Opens a new spot trade position.

```typescript
// Request
{
  "chain": "ETH" | "SOL",
  "tokenIn": "USDT",
  "tokenOut": "ETH",
  "amountIn": "1000000000000000000", // smallest unit
  "side": "BUY" | "SELL",
  "slippage": 0.005 // optional
}

// Backend Flow:
// 1. Authenticates user via Clerk
// 2. Fetches user's wallet address from backend MySQL
// 3. Gets quote from LiFi/Jupiter
// 4. Executes trade using encrypted private key
// 5. Records trade in spot_trades table
// 6. Updates position in positions table
```

**File:** `src/app/api/trade/open/route.ts`

#### 2. **POST /api/trade/close**
Closes an existing open trade.

```typescript
// Request
{
  "tradeId": "uuid-here",
  "slippage": 0.005
}

// Backend Flow:
// 1. Fetches trade details from MySQL
// 2. Executes reverse swap
// 3. Updates trade status to CLOSED
// 4. Calculates and records PnL
```

**File:** `src/app/api/trade/close/route.ts`

#### 3. **GET /api/trades/[userId]**
Returns trade history for a user.

```typescript
// Query params: status, limit
// Response: Array of trades with execution details
```

**File:** `src/app/api/trades/[userId]/route.ts`

#### 4. **GET /api/trades/[userId]/open**
Get all open trades.

**File:** `src/app/api/trades/[userId]/open/route.ts`

#### 5. **GET /api/trades/[userId]/closed**
Get closed trades with optional limit.

**File:** `src/app/api/trades/[userId]/closed/route.ts`

#### 6. **GET /api/trade/[tradeId]/users/[userId]**
Get specific trade details by ID.

**File:** `src/app/api/trade/[tradeId]/users/[userId]/route.ts`

### Position Management

#### 7. **GET /api/positions**
Get user positions (open or closed).

```typescript
// Query params: userId, status (OPEN/CLOSED), limit
// Response: Array of positions with current prices and unrealized PnL
```

**File:** `src/app/api/positions/route.ts`

#### 8. **GET /api/positions/[positionId]**
Get specific position by ID with current market price.

**File:** `src/app/api/positions/[positionId]/route.ts`

#### 9. **POST /api/positions/[positionId]/close**
Close entire position at current market price.

```typescript
// Request
{
  "userId": "user123",
  "slippage": 0.005
}

// Backend Flow:
// 1. Fetches position from MySQL
// 2. Gets current market price
// 3. Executes sell order for full position
// 4. Calculates realized PnL
// 5. Updates position status to CLOSED
```

**File:** `src/app/api/positions/[positionId]/close/route.ts`

### Take Profit / Stop Loss System

#### 10. **POST /api/positions/[positionId]/tpsl**
Set or update TP/SL for a position.

```typescript
// Request
{
  "userId": "user123",
  "takeProfitPrice": "150.50", // optional
  "stopLossPrice": "90.00"     // optional
}

// Backend Flow:
// 1. Validates prices against entry price
// 2. Creates/updates tpsl_orders table
// 3. Background worker monitors prices
// 4. Auto-executes when price hits TP/SL
```

**File:** `src/app/api/positions/[positionId]/tpsl/route.ts`

#### 11. **GET /api/positions/[positionId]/tpsl**
Get TP/SL order for a position.

#### 12. **DELETE /api/positions/[positionId]/tpsl**
Cancel TP/SL order.

#### 13. **GET /api/users/[userId]/tpsl-orders**
Get all TP/SL orders for a user.

```typescript
// Query params: status (ACTIVE, TRIGGERED, CANCELLED, FAILED)
```

**File:** `src/app/api/users/[userId]/tpsl-orders/route.ts`

#### 14. **GET /api/tpsl/worker/status**
Monitor TP/SL worker status (public endpoint).

**File:** `src/app/api/tpsl/worker/status/route.ts`

### Wallet Management

#### 15. **GET /api/users/[userId]/wallets**
Returns public addresses for all user wallets.

```typescript
// Response
[
  { asset: 'SOL', chain: 'sol', public_address: '...' },
  { asset: 'ETH', chain: 'evm', public_address: '...' }
]
```

**File:** `src/app/api/users/[userId]/wallets/route.ts`

#### 16. **GET /api/wallets/[asset]/users/[userId]/address**
Get wallet address for specific asset.

```typescript
// Query params: chain (optional, defaults to 'evm')
// Response: { public_address: '...', chain: 'evm' }
```

**File:** `src/app/api/wallets/[asset]/users/[userId]/address/route.ts`

### Analytics

#### 17. **GET /api/users/[userId]/pnl-analytics**
Get user PnL analytics.

```typescript
// Response
{
  totalRealizedPnl: "1250.50",
  totalTrades: 45,
  winningTrades: 30,
  losingTrades: 15,
  winRate: 66.67,
  averageWin: "75.25",
  averageLoss: "-45.50",
  largestWin: "250.00",
  largestLoss: "-120.00"
}
```

**File:** `src/app/api/users/[userId]/pnl-analytics/route.ts`

### Health Checks

#### 18. **GET /api/health/positions**
Health check for position system.

```typescript
// Response
{
  status: 'healthy',
  database: 'connected',
  positionsTable: 'exists',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

**File:** `src/app/api/health/positions/route.ts`

## Security Features

### 1. **Authentication Layer**
```typescript
// Every route authenticates via Clerk
const { userId } = await auth();

if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 2. **Authorization Checks**
```typescript
// Verify requesting user matches resource owner
if (clerkUserId !== params.userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 3. **Input Validation**
```typescript
// Validate slippage
if (slippage < 0 || slippage > 0.5) {
  return NextResponse.json(
    { error: 'Slippage must be between 0 and 0.5 (0-50%)' },
    { status: 400 }
  );
}
```

### 4. **Error Sanitization**
```typescript
// Remove sensitive data from error messages
let sanitizedMessage = err.message
  .replace(/private key/gi, '[REDACTED]')
  .replace(/secret/gi, '[REDACTED]')
  .replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, '[ADDRESS_REDACTED]');
```

### 5. **Private Key Protection**
- Private keys NEVER sent to frontend
- Backend decrypts keys only during trade execution
- Keys encrypted at rest in MySQL database

## Frontend Integration

### Example: Opening a Trade

```typescript
// Component: BinanceOrderForm.tsx
const handleTrade = async () => {
  try {
    // 1. Call Next.js API route
    const response = await fetch('/api/trade/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: selectedChain, // 'sol' or 'evm'
        tokenIn: 'USDT',
        tokenOut: 'ETH',
        amountIn: '1000000000000000000',
        side: 'BUY',
        slippage: 0.005
      })
    });

    // 2. Handle response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error);
    }

    // 3. Update UI
    console.log('Trade opened:', data.trade);
    console.log('Position updated:', data.position);
    
  } catch (error) {
    console.error('Trade failed:', error);
  }
};
```

### Example: Fetching Positions

```typescript
// Hook: useSpotPositions.ts
const fetchPositions = async () => {
  const response = await fetch(
    `/api/positions?userId=${userId}&status=OPEN&limit=50`
  );
  
  const positions = await response.json();
  
  // Positions include:
  // - symbol (e.g., "SOL/USDT")
  // - quantity
  // - averageEntryPrice
  // - currentPrice (from backend price service)
  // - unrealizedPnl
  // - pnlPercent
  
  return positions;
};
```

## Backend Database Schema

### Tables Used (MySQL)

#### user_wallets
```sql
CREATE TABLE user_wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  asset VARCHAR(10) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  public_address VARCHAR(255) NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_asset (user_id, asset, chain)
);
```

#### spot_trades
```sql
CREATE TABLE spot_trades (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chain_from VARCHAR(20),
  chain_to VARCHAR(20),
  route_provider VARCHAR(50),
  token_in VARCHAR(50),
  token_out VARCHAR(50),
  amount_in DECIMAL(36, 18),
  amount_out DECIMAL(36, 18),
  tx_hash VARCHAR(255),
  price DECIMAL(36, 18),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status)
);
```

#### positions
```sql
CREATE TABLE positions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  chain_id INT,
  quantity DECIMAL(36, 18),
  entry_price DECIMAL(36, 18),
  total_cost DECIMAL(36, 18),
  realized_pnl DECIMAL(36, 18) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'OPEN',
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  INDEX idx_user_status (user_id, status)
);
```

#### tpsl_orders
```sql
CREATE TABLE tpsl_orders (
  id VARCHAR(36) PRIMARY KEY,
  position_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  take_profit_price DECIMAL(36, 18),
  stop_loss_price DECIMAL(36, 18),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES positions(id)
);
```

## Trade Execution Flow

### Complete Flow for Opening a Position

```
1. User clicks "Buy ETH" in BinanceOrderForm
   ↓
2. Frontend calls POST /api/trade/open
   {
     chain: 'evm',
     tokenIn: 'USDT',
     tokenOut: 'ETH',
     amountIn: '1000000000000000000',
     side: 'BUY',
     slippage: 0.005
   }
   ↓
3. Next.js route authenticates user (Clerk)
   ↓
4. Next.js route forwards to backend:
   POST https://trading.watchup.site/api/trade/open
   ↓
5. Backend queries MySQL for user's ETH wallet:
   SELECT public_address, encrypted_private_key
   FROM user_wallets
   WHERE user_id = 'user123' AND asset = 'ETH'
   ↓
6. Backend gets quote from LiFi:
   - Input: 1000 USDT
   - Output: ~0.5 ETH (example)
   - Route: USDT → ETH on Ethereum
   ↓
7. Backend decrypts private key
   ↓
8. Backend signs and sends transaction
   ↓
9. Backend waits for confirmation
   ↓
10. Backend records trade in spot_trades table:
    INSERT INTO spot_trades (...)
    VALUES ('uuid', 'user123', 'evm', 'evm', 'lifi', ...)
    ↓
11. Backend updates/creates position in positions table:
    - If no position exists: INSERT new position
    - If position exists: UPDATE quantity and average price
    ↓
12. Backend returns response:
    {
      message: 'Trade opened successfully',
      trade: { id, txHash, executionPrice, ... },
      quote: { fromAmount, toAmount, ... }
    }
    ↓
13. Next.js route returns to frontend
    ↓
14. Frontend updates UI:
    - Shows success message
    - Refreshes positions list
    - Updates balance display
```

## Error Handling

### User-Friendly Error Messages

```typescript
// Backend returns structured errors
{
  error: 'Failed to close position',
  code: 'INSUFFICIENT_BALANCE',
  message: 'Wallet balance is insufficient to cover gas fees',
  details: 'Need at least 0.01 SOL for gas fees',
  timestamp: '2024-01-15T10:30:00.000Z'
}

// Next.js route translates to user-friendly messages
if (data.code === 'INSUFFICIENT_BALANCE') {
  errorMessage = 'Insufficient balance. You need more tokens for gas fees.';
} else if (data.code === 'POSITION_CLOSED') {
  errorMessage = 'This position is already closed.';
}
```

## Monitoring and Health

### TP/SL Worker Status
```typescript
// Check if TP/SL worker is running
const status = await fetch('/api/tpsl/worker/status');

// Response
{
  success: true,
  worker: {
    status: 'running',
    lastCheck: '2024-01-15T10:30:00.000Z',
    activeOrders: 15,
    triggeredToday: 8
  }
}
```

### System Health
```typescript
// Check overall system health
const health = await fetch('/api/health/positions');

// Response
{
  status: 'healthy',
  database: 'connected',
  positionsTable: 'exists',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## Key Differences from MongoDB Approach

| Aspect | Backend API (Current) | MongoDB (NOT Used) |
|--------|----------------------|-------------------|
| Wallet Storage | MySQL on backend | Would be in MongoDB |
| Private Keys | Encrypted in backend MySQL | Would be in MongoDB (less secure) |
| Trade Execution | Backend handles with private keys | Frontend would need keys (insecure) |
| Position Tracking | Backend MySQL with real-time prices | MongoDB with manual updates |
| TP/SL Monitoring | Backend worker with price feeds | Would need frontend polling |
| Security | Keys never leave backend | Keys exposed to frontend |
| Scalability | Backend can handle high volume | Frontend limited |

## Summary

The spot trading system is a **backend-first architecture** where:

1. **Wallets are managed by the backend** - stored in MySQL with encrypted private keys
2. **Next.js API routes are proxies** - they authenticate and forward requests
3. **No MongoDB for trading data** - all trading data lives in backend MySQL
4. **Private keys never reach frontend** - maximum security
5. **Backend executes all trades** - using LiFi/Jupiter for routing
6. **Position tracking is backend-managed** - with real-time price updates
7. **TP/SL system runs on backend** - automated monitoring and execution

This architecture ensures security, scalability, and proper separation of concerns.
