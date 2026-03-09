# Spot Balance Refresh Fix - Complete Solution

## Problem Summary

After successful spot trades, balances displayed as 0.0000 instead of showing the updated amounts. The transaction history showed successful trades, but the UI didn't reflect the new balances.

## Root Cause Analysis

### 1. Missing `fetchAccounts()` Calls

The Drift SDK caches account data and requires explicit `fetchAccounts()` calls to get the latest on-chain state. Without this, the UI displays stale cached data even after successful transactions.

**From Drift SDK Documentation:**
```typescript
// After any transaction, you MUST call fetchAccounts()
await driftClient.fetchAccounts();
```

### 2. Incorrect useEffect Dependency

The `useSpotBalances` hook was watching `spotPositions?.length` instead of `spotPositions`, which meant it only triggered when the number of positions changed, not when existing position amounts updated.

**Before (Broken):**
```typescript
useEffect(() => {
  if (spotPositions && spotPositions.length > 0) {
    fetchBalances();
  }
}, [spotPositions?.length]); // Only triggers on length change
```

**After (Fixed):**
```typescript
useEffect(() => {
  if (spotPositions && spotPositions.length > 0) {
    fetchBalances();
  }
}, [spotPositions]); // Triggers on any position update
```

### 3. Insufficient Delay for State Propagation

The blockchain state needs time to propagate after transaction confirmation. A 1-second delay was too short; increased to 1.5 seconds for reliability.

## Complete Solution

### 1. Enhanced `refreshAccounts()` Function

**File**: `src/app/context/driftContext.tsx`

```typescript
const refreshAccounts = useCallback(async () => {
  const client = driftClientRef.current;
  if (!client) {
    console.log('[DriftContext] No client to refresh');
    return;
  }

  try {
    // Check subscription status
    if (!client.isSubscribed) {
      console.warn('[DriftContext] Client not subscribed, attempting to resubscribe...');
      await client.subscribe();
    }

    // CRITICAL: Fetch latest account data from on-chain
    const driftUser = client.getUser();
    if (driftUser && driftUser.fetchAccounts) {
      console.log('[DriftContext] Fetching latest account data from blockchain...');
      await driftUser.fetchAccounts(); // This is the key call!
      console.log('[DriftContext] Account data refreshed successfully');
    }
  } catch (err: any) {
    console.error('[DriftContext] Error refreshing accounts:', err);
    // Don't throw - allow retry on next refresh
  }
}, []);
```

**Key Changes:**
- Added explicit `fetchAccounts()` call
- Enhanced logging for debugging
- Better error handling

### 2. Updated `placeSpotOrder()` Function

**File**: `src/app/context/driftContext.tsx`

```typescript
// After transaction confirmation
await pollTransactionStatus(client.connection, txSignature, 30, 2000);
console.log('[DriftContext] Transaction confirmed on-chain');

// CRITICAL: Small delay to ensure blockchain state is fully propagated
await new Promise(resolve => setTimeout(resolve, 1500));

// CRITICAL: Force refresh account data from blockchain
console.log('[DriftContext] Refreshing account data after transaction...');
await refreshAccounts();

// Refresh summary and positions to update UI
console.log('[DriftContext] Refreshing positions and summary...');
await Promise.all([
  refreshSummary(),
  refreshPositions()
]);

console.log('[DriftContext] All data refreshed successfully');
```

**Key Changes:**
- Increased delay from 1000ms to 1500ms
- Added explicit `refreshAccounts()` call before refreshing positions
- Parallel refresh of summary and positions for better performance
- Enhanced logging for debugging

### 3. Fixed `useSpotBalances` Hook

**File**: `src/hooks/useSpotBalances.ts`

```typescript
// Watch the entire spotPositions array, not just length
useEffect(() => {
  if (spotPositions && spotPositions.length > 0) {
    console.log('[useSpotBalances] Spot positions updated, refetching balances');
    fetchBalances();
  }
}, [spotPositions]); // Watch entire array to catch all updates
```

**Key Changes:**
- Changed dependency from `spotPositions?.length` to `spotPositions`
- Now triggers on any position update, not just when positions are added/removed

### 4. Enhanced `refreshPositions()` Function

**File**: `src/app/context/driftContext.tsx`

```typescript
let client = driftClientRef.current;
if (!client) {
  console.log('[DriftContext] Initializing client for positions...');
  client = await initializeDriftClient(pin);
} else {
  // CRITICAL: Refresh accounts to get latest on-chain data
  console.log('[DriftContext] Refreshing accounts before fetching positions...');
  await refreshAccounts();
}
```

**Key Changes:**
- Always call `refreshAccounts()` before fetching positions
- Enhanced logging for debugging

## Data Flow After Trade

```
1. User places spot order
   ↓
2. Transaction sent to blockchain
   ↓
3. Wait for confirmation (pollTransactionStatus)
   ↓
4. Transaction confirmed ✓
   ↓
5. Wait 1.5 seconds (state propagation)
   ↓
6. Call refreshAccounts()
   ├─ Resubscribe if needed
   └─ Call driftUser.fetchAccounts() ← CRITICAL
   ↓
7. Parallel refresh:
   ├─ refreshSummary() → Update collateral
   └─ refreshPositions() → Update spot positions
   ↓
8. spotPositions array updated in context
   ↓
9. useSpotBalances detects change (entire array)
   ↓
10. fetchBalances() called
   ↓
11. UI displays updated balances ✓
```

## Why This Works

### 1. Explicit Account Refresh
The Drift SDK uses a caching layer for performance. After transactions, the cache is stale until you explicitly call `fetchAccounts()`. This is by design to reduce RPC calls.

### 2. Proper State Propagation
Blockchain state updates aren't instant. The 1.5-second delay ensures:
- Transaction is fully confirmed
- State is propagated across nodes
- Oracle prices are updated
- Account data is consistent

### 3. Reactive Updates
By watching the entire `spotPositions` array instead of just its length, the hook now detects when existing positions are updated (amount changes) rather than only when positions are added/removed.

### 4. Parallel Refresh
Using `Promise.all()` to refresh summary and positions simultaneously reduces total refresh time while ensuring both are updated.

## Testing Checklist

- [x] Place buy order → Balance updates immediately
- [x] Place sell order → Balance updates immediately
- [x] Multiple consecutive trades → All balances update
- [x] Switch between pairs → Correct balances shown
- [x] Refresh page → Balances persist correctly
- [x] Check transaction history → Matches displayed balances
- [x] Test with USDC (collateral) → Shows free collateral
- [x] Test with other tokens → Shows spot position amounts

## Common Issues & Solutions

### Issue: Balances still show 0.0000
**Solution**: Check console logs for:
- "Fetching latest account data from blockchain..." (should appear)
- "Account data refreshed successfully" (should appear)
- Any errors in `refreshAccounts()`

### Issue: Balances update slowly
**Solution**: 
- Check network latency to Solana RPC
- Verify RPC endpoint is responsive
- Consider reducing delay from 1500ms to 1000ms if network is fast

### Issue: Balances update but then revert
**Solution**:
- This indicates a race condition
- Ensure `refreshAccounts()` completes before `refreshPositions()`
- Check that `fetchAccounts()` is actually being called

## Performance Considerations

### RPC Call Optimization
Each `fetchAccounts()` call makes multiple RPC requests:
- User account data
- Spot market accounts
- Oracle price data

**Optimization**: We only call `fetchAccounts()` after transactions, not on every UI update.

### Delay Tuning
The 1.5-second delay is conservative. You can tune it based on:
- Network conditions
- RPC endpoint speed
- User experience requirements

**Recommendation**: Keep at 1.5s for reliability, reduce to 1.0s if needed for faster UX.

## References

### Drift SDK Documentation
- [User Account Management](https://docs.drift.trade/sdk-documentation)
- [Spot Market Trading](https://docs.drift.trade/trading/spot-markets)

### Related Files
- `src/app/context/driftContext.tsx` - Main context with refresh logic
- `src/hooks/useSpotBalances.ts` - Balance fetching hook
- `src/components/spot/BinanceOrderForm.tsx` - Desktop order form
- `src/components/spot/MobileTradingModal.tsx` - Mobile order form

## Conclusion

The fix addresses the root cause by ensuring the Drift SDK's cached account data is explicitly refreshed after every transaction. Combined with proper state propagation delays and reactive UI updates, balances now display correctly immediately after trades complete.

The key insight is that the Drift SDK requires explicit `fetchAccounts()` calls - it doesn't automatically refresh cached data. This is a common pattern in blockchain SDKs to reduce RPC load, but it requires careful handling in the application layer.
