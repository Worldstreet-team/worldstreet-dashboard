# API Routes Architecture

## Overview
Next.js API routes act as a proxy layer between the frontend components and the backend trading service. This architecture provides better security, error handling, and flexibility.

## Architecture Diagram

```
Frontend Components
       ↓
Next.js API Routes (Proxy Layer)
       ↓
Backend Trading Service
(https://trading.watchup.site)
```

## Benefits

1. **Security**: Backend URL and implementation details hidden from client
2. **Error Handling**: Centralized error handling and logging
3. **Flexibility**: Easy to add middleware, authentication, rate limiting
4. **Caching**: Can implement caching strategies at proxy level
5. **Monitoring**: Single point to monitor all backend calls
6. **CORS**: No CORS issues since calls are server-side

## API Routes

### 1. Quote Endpoint
**File**: `src/app/api/quote/route.ts`

**Client Call**:
```typescript
POST /api/quote
{
  userId: string,
  chain: "EVM",
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number
}
```

**Backend Forward**:
```typescript
POST https://trading.watchup.site/api/quote
```

**Response**:
```typescript
{
  expectedOutput: string,
  priceImpact: number,
  platformFee: string,
  gasEstimate: string,
  route?: string
}
```

**Used By**: `TradingPanel.tsx`

---

### 2. Execute Trade Endpoint
**File**: `src/app/api/execute-trade/route.ts`

**Client Call**:
```typescript
POST /api/execute-trade
{
  userId: string,
  chain: "EVM",
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number
}
```

**Backend Forward**:
```typescript
POST https://trading.watchup.site/api/execute-trade
```

**Response**:
```typescript
{
  success: boolean,
  txHash: string,
  message: string
}
```

**Used By**: `TradingPanel.tsx`

---

### 3. Trade History Endpoint
**File**: `src/app/api/trades/[userId]/route.ts`

**Client Call**:
```typescript
GET /api/trades/:userId
```

**Backend Forward**:
```typescript
GET https://trading.watchup.site/api/trades/:userId
```

**Response**:
```typescript
{
  trades: [
    {
      id: string,
      timestamp: string,
      pair: string,
      side: "buy" | "sell",
      amountIn: string,
      amountOut: string,
      tokenIn: string,
      tokenOut: string,
      status: "completed" | "failed" | "pending",
      txHash?: string,
      platformFee: string,
      gasUsed?: string
    }
  ]
}
```

**Used By**: `OrderHistory.tsx`

---

### 4. User Balances Endpoint
**File**: `src/app/api/users/[userId]/balances/route.ts`

**Client Call**:
```typescript
GET /api/users/:userId/balances
```

**Backend Forward**:
```typescript
GET https://trading.watchup.site/api/users/:userId/balances
```

**Response**:
```typescript
{
  balances: [
    {
      token: string,
      available: string,
      locked: string,
      total: string
    }
  ]
}
```

**Used By**: `BalanceDisplay.tsx`

---

## Error Handling

All API routes implement consistent error handling:

```typescript
try {
  // Validate input
  if (!requiredField) {
    return NextResponse.json(
      { message: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Forward to backend
  const response = await fetch(backendUrl, options);

  // Handle backend errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Default error message' 
    }));
    return NextResponse.json(
      { message: errorData.message },
      { status: response.status }
    );
  }

  // Return success
  const data = await response.json();
  return NextResponse.json(data);
  
} catch (error) {
  // Handle unexpected errors
  console.error('API error:', error);
  return NextResponse.json(
    { message: 'Internal server error', error: error.message },
    { status: 500 }
  );
}
```

## Component Integration

### TradingPanel.tsx
```typescript
// Get Quote
const response = await fetch('/api/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, chain, tokenIn, tokenOut, amountIn, slippage })
});

// Execute Trade
const response = await fetch('/api/execute-trade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, chain, tokenIn, tokenOut, amountIn, slippage })
});
```

### OrderHistory.tsx
```typescript
const response = await fetch(`/api/trades/${userId}`);
```

### BalanceDisplay.tsx
```typescript
const response = await fetch(`/api/users/${userId}/balances`);
```

## Request Flow Example

### Quote Request Flow:
```
1. User clicks "Get Quote" in TradingPanel
   ↓
2. TradingPanel calls POST /api/quote
   ↓
3. Next.js API route validates request
   ↓
4. API route forwards to https://trading.watchup.site/api/quote
   ↓
5. Backend processes quote request
   ↓
6. Backend returns quote data
   ↓
7. API route forwards response to client
   ↓
8. TradingPanel displays quote to user
```

### Trade Execution Flow:
```
1. User clicks "Buy/Sell" in TradingPanel
   ↓
2. TradingPanel calls POST /api/execute-trade
   ↓
3. Next.js API route validates request
   ↓
4. API route forwards to https://trading.watchup.site/api/execute-trade
   ↓
5. Backend locks funds
   ↓
6. Backend executes trade via 1inch
   ↓
7. Backend waits for confirmation
   ↓
8. Backend updates ledger
   ↓
9. Backend returns tx hash
   ↓
10. API route forwards response to client
    ↓
11. TradingPanel shows success message
    ↓
12. Components refresh balances and history
```

## Future Enhancements

### 1. Authentication Middleware
```typescript
// Add to each route
const session = await getServerSession();
if (!session) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

### 2. Rate Limiting
```typescript
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

await limiter.check(request, 10, 'CACHE_TOKEN'); // 10 requests per minute
```

### 3. Request Logging
```typescript
console.log({
  timestamp: new Date().toISOString(),
  method: request.method,
  url: request.url,
  userId: body.userId,
  duration: Date.now() - startTime
});
```

### 4. Response Caching
```typescript
// Cache quote responses for 10 seconds
const cacheKey = `quote:${userId}:${tokenIn}:${tokenOut}:${amountIn}`;
const cached = await redis.get(cacheKey);
if (cached) return NextResponse.json(JSON.parse(cached));

// ... fetch from backend ...

await redis.setex(cacheKey, 10, JSON.stringify(data));
```

### 5. Request Validation
```typescript
import { z } from 'zod';

const quoteSchema = z.object({
  userId: z.string().min(1),
  chain: z.enum(['EVM', 'SOLANA']),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/),
  slippage: z.number().min(0).max(50)
});

const validated = quoteSchema.parse(body);
```

## Testing

### Test Quote Endpoint
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "chain": "EVM",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.5
  }'
```

### Test Execute Trade Endpoint
```bash
curl -X POST http://localhost:3000/api/execute-trade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "chain": "EVM",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.5
  }'
```

### Test Trade History Endpoint
```bash
curl http://localhost:3000/api/trades/user123
```

### Test Balances Endpoint
```bash
curl http://localhost:3000/api/users/user123/balances
```

## Monitoring

### Key Metrics to Track
- Request count per endpoint
- Response times
- Error rates
- Backend availability
- Cache hit rates (if implemented)

### Logging Best Practices
```typescript
// Log all requests
console.log('[API] Quote request', { userId, tokenIn, tokenOut, amountIn });

// Log errors with context
console.error('[API] Quote failed', { 
  userId, 
  error: error.message, 
  stack: error.stack 
});

// Log performance
console.log('[API] Quote completed', { 
  userId, 
  duration: Date.now() - startTime 
});
```

## Security Considerations

1. **Input Validation**: Always validate user input
2. **Rate Limiting**: Prevent abuse
3. **Authentication**: Verify user identity
4. **HTTPS Only**: Enforce secure connections
5. **Error Messages**: Don't leak sensitive information
6. **Logging**: Log security events
7. **CORS**: Configure properly for production

## Environment Variables

Add to `.env.local`:
```env
TRADING_BACKEND_URL=https://trading.watchup.site
TRADING_API_KEY=your_api_key_here  # If needed
```

Update API routes to use:
```typescript
const BACKEND_URL = process.env.TRADING_BACKEND_URL || 'https://trading.watchup.site';
```
