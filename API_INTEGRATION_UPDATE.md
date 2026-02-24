# API Integration Update - TradingPanel

## Changes Made

Updated the TradingPanel component and API routes to properly match the backend API specification.

## Key Changes

### 1. API Route Parameters Updated

#### Quote Route (`/api/quote`)
**Before:**
```typescript
{
  userId: string,
  chain: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number
}
```

**After:**
```typescript
{
  userId: string,
  fromChain: string,      // ✅ Changed from 'chain'
  toChain: string,        // ✅ Added (defaults to fromChain)
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number        // ✅ Now expects decimal (0.005 not 0.5)
}
```

#### Execute Trade Route (`/api/execute-trade`)
**Before:**
```typescript
{
  userId: string,
  chain: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number
}
```

**After:**
```typescript
{
  userId: string,
  fromChain: string,      // ✅ Changed from 'chain'
  toChain: string,        // ✅ Added (defaults to fromChain)
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number        // ✅ Now expects decimal (0.005 not 0.5)
}
```

### 2. Slippage Conversion

**Important:** Slippage is now converted from percentage to decimal.

**Before:**
```typescript
slippage: parseFloat(slippage) // 0.5 (as percentage)
```

**After:**
```typescript
slippage: parseFloat(slippage) / 100 // 0.5% -> 0.005 (as decimal)
```

**Examples:**
- User enters: `0.5%` → Sent as: `0.005`
- User enters: `1.0%` → Sent as: `0.01`
- User enters: `0.1%` → Sent as: `0.001`

### 3. Chain Parameters

**Before:**
```typescript
chain: 'EVM'
```

**After:**
```typescript
fromChain: 'EVM',
toChain: 'EVM'
```

This allows for future cross-chain swaps (e.g., EVM to Solana).

## Updated Files

### 1. `/api/quote/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const {
    userId,
    fromChain,      // ✅ Updated
    toChain,        // ✅ Added
    tokenIn,
    tokenOut,
    amountIn,
    slippage
  } = body;

  // Validation
  if (!userId || !tokenIn || !tokenOut || !amountIn || !fromChain) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Forward to backend
  await fetch('https://trading.watchup.site/api/quote', {
    body: JSON.stringify({
      userId,
      fromChain,
      toChain: toChain || fromChain,  // ✅ Defaults to fromChain
      tokenIn,
      tokenOut,
      amountIn,
      slippage: slippage ?? 0.005     // ✅ Default 0.5%
    })
  });
}
```

### 2. `/api/execute-trade/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const {
    userId,
    fromChain,      // ✅ Updated
    toChain,        // ✅ Added
    tokenIn,
    tokenOut,
    amountIn,
    slippage
  } = body;

  // Validation
  if (!userId || !tokenIn || !tokenOut || !amountIn || !fromChain) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Forward to backend
  await fetch('https://trading.watchup.site/api/execute-trade', {
    body: JSON.stringify({
      userId,
      fromChain,
      toChain: toChain || fromChain,  // ✅ Defaults to fromChain
      tokenIn,
      tokenOut,
      amountIn,
      slippage: slippage ?? 0.005     // ✅ Default 0.5%
    })
  });
}
```

### 3. `TradingPanel.tsx`

#### fetchQuote Function
```typescript
const fetchQuote = async () => {
  const response = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user?.userId,
      fromChain: 'EVM',                           // ✅ Updated
      toChain: 'EVM',                             // ✅ Added
      tokenIn: side === 'buy' ? tokenOut : tokenIn,
      tokenOut: side === 'buy' ? tokenIn : tokenOut,
      amountIn: amount,
      slippage: parseFloat(slippage) / 100        // ✅ Convert % to decimal
    })
  });
};
```

#### executeTrade Function
```typescript
const executeTrade = async () => {
  const response = await fetch('/api/execute-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user?.userId,
      fromChain: 'EVM',                           // ✅ Updated
      toChain: 'EVM',                             // ✅ Added
      tokenIn: side === 'buy' ? tokenOut : tokenIn,
      tokenOut: side === 'buy' ? tokenIn : tokenOut,
      amountIn: amount,
      slippage: parseFloat(slippage) / 100        // ✅ Convert % to decimal
    })
  });
};
```

## Request Examples

### Quote Request
```json
POST /api/quote
{
  "userId": "user123",
  "fromChain": "EVM",
  "toChain": "EVM",
  "tokenIn": "USDT",
  "tokenOut": "BTC",
  "amountIn": "1000",
  "slippage": 0.005
}
```

### Execute Trade Request
```json
POST /api/execute-trade
{
  "userId": "user123",
  "fromChain": "EVM",
  "toChain": "EVM",
  "tokenIn": "USDT",
  "tokenOut": "BTC",
  "amountIn": "1000",
  "slippage": 0.005
}
```

## Backend Forwarding

Both API routes now forward requests to the backend with the correct format:

```typescript
// Frontend sends
{
  fromChain: 'EVM',
  toChain: 'EVM',
  slippage: 0.005  // 0.5%
}

// Backend receives
{
  fromChain: 'EVM',
  toChain: 'EVM',
  slippage: 0.005  // 0.5% as decimal
}
```

## Slippage Conversion Table

| User Input | Frontend Value | Sent to API | Backend Receives |
|------------|---------------|-------------|------------------|
| 0.1% | "0.1" | 0.001 | 0.001 (0.1%) |
| 0.5% | "0.5" | 0.005 | 0.005 (0.5%) |
| 1.0% | "1.0" | 0.01 | 0.01 (1.0%) |
| 2.0% | "2.0" | 0.02 | 0.02 (2.0%) |
| 5.0% | "5.0" | 0.05 | 0.05 (5.0%) |

## Future Cross-Chain Support

The new structure supports future cross-chain swaps:

```typescript
// Same chain swap (current)
{
  fromChain: 'EVM',
  toChain: 'EVM',
  tokenIn: 'USDT',
  tokenOut: 'BTC'
}

// Cross-chain swap (future)
{
  fromChain: 'EVM',
  toChain: 'SOLANA',
  tokenIn: 'USDT',
  tokenOut: 'SOL'
}
```

## Testing

### Test Quote with Correct Format
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "fromChain": "EVM",
    "toChain": "EVM",
    "tokenIn": "USDT",
    "tokenOut": "BTC",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

### Test Execute Trade with Correct Format
```bash
curl -X POST http://localhost:3000/api/execute-trade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "fromChain": "EVM",
    "toChain": "EVM",
    "tokenIn": "USDT",
    "tokenOut": "BTC",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

## Validation

### API Routes Now Validate:
- ✅ `userId` is present
- ✅ `fromChain` is present (not just `chain`)
- ✅ `tokenIn` is present
- ✅ `tokenOut` is present
- ✅ `amountIn` is present
- ✅ `toChain` defaults to `fromChain` if not provided
- ✅ `slippage` defaults to `0.005` (0.5%) if not provided

## Error Handling

Both routes maintain proper error handling:

```typescript
// Missing required fields
if (!userId || !tokenIn || !tokenOut || !amountIn || !fromChain) {
  return NextResponse.json(
    { message: 'Missing required fields' },
    { status: 400 }
  );
}

// Backend error
if (!response.ok) {
  return NextResponse.json(
    { message: data.message || 'Operation failed' },
    { status: response.status }
  );
}

// Internal error
catch (error) {
  return NextResponse.json(
    { message: 'Internal error', error: error.message },
    { status: 500 }
  );
}
```

## Verification Checklist

- [x] API routes updated with `fromChain` and `toChain`
- [x] Slippage conversion implemented (% to decimal)
- [x] TradingPanel updated to match API format
- [x] Validation updated for new parameters
- [x] Default values set correctly
- [x] Error handling maintained
- [x] TypeScript errors resolved
- [x] Ready for testing

## Summary

The TradingPanel component now correctly integrates with the updated API routes, which match the backend API specification. Key improvements:

1. ✅ Uses `fromChain` and `toChain` instead of `chain`
2. ✅ Converts slippage from percentage to decimal
3. ✅ Supports future cross-chain swaps
4. ✅ Maintains proper error handling
5. ✅ All TypeScript types correct

The integration is now complete and ready for production use! 🚀
