# Drift Tatum RPC Integration - Complete

## Update Summary

Switched to Tatum RPC endpoint for Solana blockchain access. Tatum provides HTTP-only RPC (no WebSocket), so we're using polling subscriptions with conservative rate limiting.

## Changes Made

### 1. Updated Solana Connection to Tatum
**File**: `src/app/context/driftContext.tsx`

**Tatum RPC Configuration**:
```typescript
const rpcUrl = 'https://solana-mainnet.gateway.tatum.io/';

const conn = new Connection(rpcUrl, {
  commitment: 'confirmed',
  httpHeaders: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'x-api-key': 't-69a7490235e1e9d0cac60b89-5869552b507d413580182b34',
  }
});
```

### 2. Polling Subscription (No WebSocket)
**File**: `src/app/context/driftContext.tsx`

Since Tatum doesn't support WebSocket subscriptions, we use polling:

```typescript
// Import BulkAccountLoader for polling
const { BulkAccountLoader } = await import('@drift-labs/sdk');

// Create account loader for polling (every 2 seconds)
const accountLoader = new BulkAccountLoader(
  connection as any,
  'confirmed',
  2000 // Poll every 2 seconds (conservative rate limiting)
);

const client = new DriftClient({
  connection: connection as any,
  wallet,
  programID: new SolanaPublicKey(DRIFT_PROGRAM_ID) as any,
  accountSubscription: {
    type: 'polling',
    accountLoader: accountLoader,
  },
  subAccountIds: [subaccountId]
} as any);
```

## Tatum API Details

### Endpoint
```
https://solana-mainnet.gateway.tatum.io/
```

### Authentication
API Key (in headers): `t-69a7490235e1e9d0cac60b89-5869552b507d413580182b34`

### Required Headers
```javascript
{
  'accept': 'application/json',
  'content-type': 'application/json',
  'x-api-key': 't-69a7490235e1e9d0cac60b89-5869552b507d413580182b34'
}
```

### Example Request
```javascript
axios.post('https://solana-mainnet.gateway.tatum.io/', {
  'id': 1,
  'jsonrpc': '2.0',
  'method': 'getBlockHeight'
}, {
  headers: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'x-api-key': 't-69a7490235e1e9d0cac60b89-5869552b507d413580182b34',
  }
})
```

## Rate Limiting Strategy

### Polling Interval: 2 seconds
- Conservative approach to avoid rate limits
- 0.5 requests per second per account
- 30 requests per minute per account
- Leaves plenty of headroom for transactions and other operations

### Why 2 seconds?
- Tatum rate limits vary by plan
- 2-second polling is safe for most plans
- Still provides reasonably responsive updates
- Can be adjusted if needed (see `BulkAccountLoader` constructor)

## Comparison: WebSocket vs Polling

### WebSocket (Not Available with Tatum)
- ✅ Real-time push updates
- ✅ Minimal API calls
- ✅ Lower latency
- ❌ Not supported by Tatum

### Polling (Current Implementation)
- ✅ Works with any HTTP RPC
- ✅ Predictable rate limiting
- ✅ Simple to implement
- ⚠️ 2-second delay for updates
- ⚠️ Continuous API calls (but controlled)

## Benefits of Tatum

1. **Reliable Infrastructure**: Enterprise-grade Solana RPC
2. **API Key Authentication**: Secure access control
3. **Rate Limiting**: Clear limits and monitoring
4. **HTTP Headers**: Easy to add authentication
5. **No WebSocket Complexity**: Simpler connection management

## Performance Expectations

### Account Data Updates
- **Polling interval**: 2 seconds
- **Update delay**: 0-2 seconds after on-chain change
- **API calls**: ~30 per minute per account

### Transaction Submission
- **Immediate**: No polling delay
- **Confirmation**: Standard Solana confirmation time (~400ms)

### Trading Operations
- **Deposit/Withdraw**: Real-time transaction submission
- **Open/Close Position**: Real-time transaction submission
- **Balance Updates**: 0-2 second delay after confirmation

## Adjusting Polling Interval

If you need faster updates, you can adjust the polling interval:

```typescript
// Current: 2000ms (2 seconds)
const accountLoader = new BulkAccountLoader(
  connection as any,
  'confirmed',
  2000 // Change this value
);
```

**Recommendations**:
- **Conservative**: 2000ms (current)
- **Balanced**: 1000ms (1 second)
- **Aggressive**: 500ms (0.5 seconds) - watch rate limits!

## Testing

After this update, you should see:
1. Console log: "Connection initialized with Tatum RPC"
2. Console log: "Subscribed to Drift account updates (polling mode)"
3. Account data updates every 2 seconds
4. No WebSocket connection errors
5. Successful transaction submissions

## Files Modified

- `src/app/context/driftContext.tsx` - Updated RPC endpoint and subscription type

## Status

✅ Tatum RPC endpoint configured
✅ API key authentication added
✅ Polling subscription enabled (2-second interval)
✅ Rate limiting strategy implemented
✅ HTTP headers configured

## Next Steps

1. Restart dev server
2. Hard reload browser (Ctrl+Shift+R)
3. Test Drift initialization
4. Verify account data updates (check console logs every 2 seconds)
5. Test trading operations (deposit, withdraw, open/close positions)
6. Monitor API usage in Tatum dashboard (if available)

## Troubleshooting

### If you see authentication errors:
- Verify API key is correct
- Check headers are being sent
- Confirm Tatum account is active

### If updates are too slow:
- Reduce polling interval (e.g., 1000ms)
- Monitor rate limits
- Consider upgrading Tatum plan if needed

### If rate limit errors occur:
- Increase polling interval (e.g., 3000ms)
- Reduce number of concurrent operations
- Check Tatum plan limits
