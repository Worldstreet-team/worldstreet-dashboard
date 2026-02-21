# Debugging Guide - Quote API Issues

## Problem Identified

The backend API returns errors in an `error` field, but the Next.js route was checking for `message` field.

### Backend Response Format

**Success:**
```json
{
  "expectedOut": "0.0234",
  "toAmountMin": "0.0233",
  "priceImpact": 0.12,
  "gasEstimate": "2.50",
  "route": "...",
  "executionData": "..."
}
```

**Error:**
```json
{
  "error": "No EVM wallet found. Create wallets first."
}
```

### Frontend Expected Format

```json
{
  "expectedOutput": "0.0234",
  "priceImpact": 0.12,
  "platformFee": "3.0",
  "gasEstimate": "2.50",
  "route": "..."
}
```

## Changes Made

### 1. Error Field Handling

**Before:**
```typescript
if (!response.ok) {
  return NextResponse.json(
    { message: data.message || 'Quote failed' },  // ❌ Wrong field
    { status: response.status }
  );
}
```

**After:**
```typescript
if (!response.ok) {
  const errorMessage = data.error || data.message || 'Quote failed';  // ✅ Check both
  return NextResponse.json(
    { message: errorMessage },
    { status: response.status }
  );
}
```

### 2. Response Transformation

**Before:**
```typescript
return NextResponse.json(data);  // ❌ Field names don't match
```

**After:**
```typescript
const transformedData = {
  expectedOutput: data.expectedOut || data.expectedOutput || '0',  // ✅ Transform
  priceImpact: data.priceImpact || 0,
  platformFee: '0',
  gasEstimate: data.gasEstimate || '0',
  route: data.route,
  executionData: data.executionData,
  toAmountMin: data.toAmountMin
};

return NextResponse.json(transformedData);
```

### 3. Comprehensive Logging

Added logging at every step:

```typescript
// Log incoming request
console.log('[Quote API] Request:', { userId, fromChain, tokenIn, tokenOut, amountIn });

// Log backend payload
console.log('[Quote API] Sending to backend:', backendPayload);

// Log backend response
console.log('[Quote API] Backend response:', { status: response.status, data });

// Log errors
console.error('[Quote API] Backend error:', errorMessage);

// Log transformed response
console.log('[Quote API] Transformed response:', transformedData);
```

## How to Debug

### 1. Check Browser Console

Open browser DevTools (F12) and check the Console tab for:
- `[Quote API] Request:` - What the frontend sent
- `[Quote API] Sending to backend:` - What's being sent to backend
- `[Quote API] Backend response:` - What the backend returned
- `[Quote API] Backend error:` - Any errors from backend
- `[Quote API] Transformed response:` - Final response to frontend

### 2. Check Network Tab

In DevTools Network tab:
1. Filter by "Fetch/XHR"
2. Look for `/api/quote` request
3. Check:
   - Request payload
   - Response status code
   - Response body

### 3. Check Server Logs

If running locally with `npm run dev`, check terminal for:
```
[Quote API] Request: { userId: 'user123', ... }
[Quote API] Sending to backend: { ... }
[Quote API] Backend response: { status: 200, data: { ... } }
```

## Common Issues & Solutions

### Issue 1: "Quote failed" Error

**Cause:** Backend returned an error in `error` field

**Solution:** Check the logs for the actual error message:
```
[Quote API] Backend error: No EVM wallet found. Create wallets first.
```

**Fix:** User needs to create an EVM wallet first

### Issue 2: "Missing required fields"

**Cause:** Frontend not sending all required fields

**Check logs:**
```
[Quote API] Request: { userId: undefined, ... }
```

**Fix:** Ensure user is logged in and `userId` is available

### Issue 3: Field Name Mismatch

**Cause:** Backend returns `expectedOut` but frontend expects `expectedOutput`

**Solution:** Response transformation now handles this:
```typescript
expectedOutput: data.expectedOut || data.expectedOutput || '0'
```

### Issue 4: Slippage Format

**Cause:** Backend expects decimal (0.005) but frontend sends percentage (0.5)

**Solution:** Frontend now converts:
```typescript
slippage: parseFloat(slippage) / 100  // 0.5% → 0.005
```

## Testing Checklist

### Test 1: Valid Quote Request
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "fromChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

**Expected:** Success response with quote data

### Test 2: Missing User ID
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000"
  }'
```

**Expected:** 400 error "Missing required fields"

### Test 3: No Wallet
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "nonexistent",
    "fromChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000"
  }'
```

**Expected:** 404 error "No EVM wallet found"

## Monitoring

### Key Metrics to Watch

1. **Request Success Rate**
   - Track successful vs failed quote requests
   - Alert if success rate drops below 95%

2. **Response Time**
   - Quote requests should complete in < 2 seconds
   - Alert if p95 > 3 seconds

3. **Error Types**
   - Track most common error messages
   - Identify patterns (e.g., many "No wallet" errors)

### Log Analysis

Search logs for patterns:
```bash
# Count successful quotes
grep "\[Quote API\] Transformed response" logs.txt | wc -l

# Count errors
grep "\[Quote API\] Backend error" logs.txt | wc -l

# Most common errors
grep "\[Quote API\] Backend error" logs.txt | sort | uniq -c | sort -rn
```

## Backend API Contract

### Quote Endpoint

**URL:** `POST https://trading.watchup.site/api/quote`

**Request:**
```json
{
  "userId": "string (required)",
  "fromChain": "string (default: 'ETH')",
  "toChain": "string (optional, defaults to fromChain)",
  "tokenIn": "string (required)",
  "tokenOut": "string (required)",
  "amountIn": "string (required)",
  "slippage": "number (default: 0.005)"
}
```

**Success Response (200):**
```json
{
  "expectedOut": "string",
  "toAmountMin": "string",
  "priceImpact": "number",
  "gasEstimate": "string",
  "route": "string",
  "executionData": "object"
}
```

**Error Response (400/404/500):**
```json
{
  "error": "string"
}
```

## Frontend Integration

### TradingPanel Component

**Quote Request:**
```typescript
const response = await fetch('/api/quote', {
  method: 'POST',
  body: JSON.stringify({
    userId: user?.userId,
    fromChain: 'EVM',
    toChain: 'EVM',
    tokenIn: side === 'buy' ? tokenOut : tokenIn,
    tokenOut: side === 'buy' ? tokenIn : tokenOut,
    amountIn: amount,
    slippage: parseFloat(slippage) / 100
  })
});
```

**Expected Response:**
```typescript
{
  expectedOutput: string,
  priceImpact: number,
  platformFee: string,
  gasEstimate: string,
  route?: string
}
```

## Troubleshooting Steps

### Step 1: Verify User Authentication
```typescript
console.log('User:', user);
console.log('User ID:', user?.userId);
```

### Step 2: Check Request Payload
```typescript
console.log('Request body:', {
  userId: user?.userId,
  fromChain: 'EVM',
  tokenIn,
  tokenOut,
  amountIn,
  slippage
});
```

### Step 3: Check Backend Response
Look for `[Quote API] Backend response:` in logs

### Step 4: Verify Wallet Exists
Check if user has an EVM wallet in the database:
```sql
SELECT * FROM user_wallets WHERE user_id = 'user123' AND asset = 'ETH';
```

### Step 5: Test Backend Directly
```bash
curl -X POST https://trading.watchup.site/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "fromChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000"
  }'
```

## Quick Fixes

### Fix 1: Clear Error Message
If you see "Quote failed", check the actual error:
```typescript
// In TradingPanel.tsx
catch (err) {
  console.error('Quote error details:', err);
  setError((err as Error).message);
}
```

### Fix 2: Add Request Logging
```typescript
// In TradingPanel.tsx, before fetch
console.log('Fetching quote with:', {
  userId: user?.userId,
  fromChain: 'EVM',
  tokenIn,
  tokenOut,
  amountIn,
  slippage: parseFloat(slippage) / 100
});
```

### Fix 3: Verify Backend URL
```typescript
// In route.ts
const BACKEND_URL = process.env.TRADING_BACKEND_URL || 'https://trading.watchup.site';
console.log('Backend URL:', BACKEND_URL);
```

## Summary

The main issues were:
1. ✅ Backend returns `error` field, not `message`
2. ✅ Backend returns `expectedOut`, frontend expects `expectedOutput`
3. ✅ Need comprehensive logging for debugging
4. ✅ Need response transformation

All issues are now fixed with:
- Proper error field handling
- Response transformation
- Comprehensive logging
- Better error messages
