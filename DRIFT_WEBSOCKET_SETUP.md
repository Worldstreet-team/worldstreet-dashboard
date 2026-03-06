# Drift SDK WebSocket Setup Guide

## Overview

This document explains the robust Drift SDK client initialization implemented in `driftContext.tsx` that handles WebSocket subscriptions reliably and falls back to polling when needed.

## Key Features

### 1. **WebSocket Readiness Detection**
- Checks if WebSocket connection is fully open before subscribing
- Prevents `accountSubscribe` JSON-RPC errors from premature subscription attempts
- 5-second timeout with 100ms polling interval

### 2. **User Account Existence Check**
- Verifies user account exists on-chain BEFORE attempting subscription
- Prevents subscription errors when account doesn't exist yet
- Automatically initializes account if needed

### 3. **Automatic Fallback to Polling**
- Falls back to polling mode if WebSocket is not ready
- Falls back if WebSocket subscription fails
- Uses `BulkAccountLoader` for efficient polling

### 4. **Retry Logic with Exponential Backoff**
- 3 retry attempts for initialization
- Exponential backoff: 1s, 2s, 4s
- Detailed error logging for debugging

### 5. **Reconnection Handling**
- Detects when client becomes unsubscribed
- Automatically attempts to resubscribe
- Graceful degradation if resubscription fails

## Environment Variables

Add these to your `.env.local` file:

```bash
# Solana RPC endpoint (HTTP)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Solana WebSocket endpoint (WSS)
NEXT_PUBLIC_SOLANA_WS_URL=wss://solana-mainnet.core.chainstack.com/6b2efd9b0b11d871382ce7bf3c7c0d89

# Drift Program ID (mainnet)
NEXT_PUBLIC_DRIFT_PROGRAM_ID=dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH
```

## Recommended RPC Providers

### 1. **Chainstack** (Current)
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-mainnet.core.chainstack.com/YOUR_API_KEY
NEXT_PUBLIC_SOLANA_WS_URL=wss://solana-mainnet.core.chainstack.com/YOUR_API_KEY
```

### 2. **Helius**
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
NEXT_PUBLIC_SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### 3. **Triton (RPC Pool)**
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://drift-mainnet.rpcpool.com/YOUR_API_KEY
NEXT_PUBLIC_SOLANA_WS_URL=wss://drift-mainnet.rpcpool.com/YOUR_API_KEY
```

### 4. **QuickNode**
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_API_KEY/
NEXT_PUBLIC_SOLANA_WS_URL=wss://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

### 5. **Alchemy**
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SOLANA_WS_URL=wss://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## How It Works

### Initialization Flow

```
1. Fetch encrypted wallet with PIN
   ↓
2. Decrypt private key and create keypair
   ↓
3. Initialize Solana connection with RPC + WS endpoints
   ↓
4. Derive user account PDA (Program Derived Address)
   ↓
5. Check if user account exists on-chain
   ↓
6. If account doesn't exist:
   - Use polling mode temporarily
   - Initialize user account
   - Wait for confirmation
   ↓
7. If account exists:
   - Check WebSocket readiness
   - Use WebSocket if ready, else polling
   ↓
8. Create DriftClient with chosen subscription type
   ↓
9. Subscribe to client (now safe because account exists)
   ↓
10. Verify user account is accessible
    ↓
11. Success! Client is ready
```

### Subscription Order (Critical!)

**WRONG ORDER (causes errors):**
```typescript
// ❌ This causes accountSubscribe errors
const client = new DriftClient({ ... });
await client.subscribe(); // ERROR: Account doesn't exist yet!
await client.initializeUserAccount();
```

**CORRECT ORDER:**
```typescript
// ✅ This works reliably
const client = new DriftClient({ ... });
// Check if account exists first
if (!accountExists) {
  await client.initializeUserAccount();
  await confirmTransaction();
}
// Now safe to subscribe
await client.subscribe();
```

## Error Handling

### Common Errors and Solutions

#### 1. `accountSubscribe` JSON-RPC Error
**Cause:** Trying to subscribe before account exists or WebSocket not ready

**Solution:** The new implementation checks account existence and WebSocket readiness before subscribing

#### 2. WebSocket Connection Timeout
**Cause:** WebSocket endpoint not responding or blocked

**Solution:** Automatically falls back to polling mode

#### 3. Rate Limiting
**Cause:** Too many requests to RPC endpoint

**Solution:** Exponential backoff retry logic with delays

#### 4. Insufficient SOL
**Cause:** Not enough SOL to initialize Drift account

**Solution:** Shows modal with required amount and deposit instructions

## Monitoring and Debugging

### Console Logs

The implementation provides detailed logging:

```
[DriftContext] Initialization attempt 1/3
[DriftContext] Wallet keypair created: ABC123...
[DriftContext] Connecting to RPC: https://...
[DriftContext] WebSocket endpoint: wss://...
[DriftContext] Derived user account PDA: XYZ789...
[DriftContext] User account XYZ789... exists: true
[DriftContext] Checking WebSocket connection readiness...
[DriftContext] WebSocket is ready
[DriftContext] Creating DriftClient with websocket subscription
[DriftContext] Subscribing to DriftClient...
[DriftContext] Successfully subscribed to DriftClient
[DriftContext] User account verified: ABC123...
[DriftContext] Drift client ready!
```

### Error Logs

Detailed error information is logged:

```
[DriftContext] Subscription error: Error message
[DriftContext] JSON-RPC Error Code: -32000
[DriftContext] JSON-RPC Error Data: { ... }
```

## Testing Different Providers

To test different RPC providers:

1. Update `.env.local` with new endpoints
2. Restart your Next.js dev server
3. Clear browser cache and reload
4. Check console logs for connection status

## Performance Considerations

### WebSocket Mode (Preferred)
- **Pros:** Real-time updates, lower latency, less polling overhead
- **Cons:** Requires WebSocket support, can disconnect

### Polling Mode (Fallback)
- **Pros:** More reliable, works with any RPC endpoint
- **Cons:** Higher latency, more RPC calls, potential rate limiting

### Auto-Refresh Interval

The context uses a 10-second auto-refresh interval for UI updates:

```typescript
startAutoRefresh(10000); // 10 seconds
```

You can adjust this based on your needs:
- **Faster (5s):** More responsive UI, more RPC calls
- **Slower (30s):** Less RPC calls, slightly stale data

## Troubleshooting

### Issue: Client keeps falling back to polling

**Check:**
1. WebSocket endpoint is correct and accessible
2. Firewall/proxy allows WebSocket connections
3. RPC provider supports `accountSubscribe` method

### Issue: Subscription fails repeatedly

**Check:**
1. User account exists on-chain
2. RPC endpoint is not rate limiting
3. Network connection is stable

### Issue: "User account not accessible after subscription"

**Check:**
1. Account initialization transaction was confirmed
2. Sufficient SOL for rent exemption
3. Correct Drift program ID

## Production Recommendations

1. **Use a paid RPC provider** with guaranteed uptime and rate limits
2. **Monitor WebSocket connection status** and alert on failures
3. **Implement circuit breaker** to prevent excessive retries
4. **Log errors to monitoring service** (Sentry, DataDog, etc.)
5. **Test failover** between WebSocket and polling modes
6. **Set up health checks** for RPC endpoints

## Additional Resources

- [Drift Protocol Docs](https://docs.drift.trade/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Drift SDK GitHub](https://github.com/drift-labs/protocol-v2)
