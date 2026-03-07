# Spot Balances Debugging Guide

## Issue: Balances Not Showing

If your spot trading balances are showing as 0 when they shouldn't be, follow this debugging checklist:

## 1. Check Browser Console

Open your browser's developer console (F12) and look for these log messages:

### Expected Logs (Successful):

```
[DriftContext] Drift client ready!
[DriftContext] Building spot market mapping...
[DriftContext] Spot Market 0: USDC
[DriftContext] Spot Market 1: SOL
[DriftContext] Spot Market 2: BTC
...
[DriftContext] User account loaded successfully
[useSpotBalances] Fetching balances for markets: { baseMarketIndex: 1, quoteMarketIndex: 0 }
[useSpotBalances] Available spotPositions: 6
[useSpotBalances] Position: USDC (index 0), amount: 100.5, type: deposit
[useSpotBalances] Position: SOL (index 1), amount: 0, type: deposit
[useSpotBalances] Base (SOL): 0 (deposited)
[useSpotBalances] Quote (USDC): 100.5 (deposited)
```

### Problem Indicators:

```
❌ [useSpotBalances] Not ready: { isClientReady: false, ... }
   → Drift client not initialized yet

❌ [useSpotBalances] No spotPositions available
   → spotPositions array is empty

❌ [useSpotBalances] No base position found for market index 1
   → Market index not found in spotPositions

❌ [DriftContext] User account not initialized yet
   → Drift account needs initialization
```

## 2. Verify Drift Account Status

### Check if account is initialized:

1. Open browser console
2. Look for: `[DriftContext] User account loaded successfully`
3. If you see `User account not initialized yet`, you need to:
   - Click "Initialize Account" button
   - Ensure you have at least 0.05 SOL in your wallet

### Check if client is ready:

```javascript
// In console, check:
// Should log: true
```

## 3. Verify Market Indices

The hook needs correct market indices to find balances.

### Common Market Indices:

| Token | Market Index |
|-------|--------------|
| USDC  | 0            |
| SOL   | 1            |
| BTC   | 2            |
| ETH   | 3            |
| USDT  | 4            |
| JitoSOL | 5          |

### Check in console:

```javascript
// Should return correct index (e.g., 1 for SOL)
```

If it returns `undefined`, the market mapping is not loaded yet.

## 4. Verify spotPositions Array

The balances come from the `spotPositions` array in DriftContext.

### Check in console:

```javascript
// Should show array with all spot markets (even with 0 balance)
```

### Expected structure:

```javascript
[
  {
    marketIndex: 0,
    marketName: "USDC",
    amount: 100.5,
    balanceType: "deposit",
    price: 1.0,
    value: 100.5
  },
  {
    marketIndex: 1,
    marketName: "SOL",
    amount: 0,
    balanceType: "deposit",
    price: 150.0,
    value: 0
  },
  // ... more markets
]
```

## 5. Common Issues & Solutions

### Issue: "Not ready" in console

**Cause:** Drift client not initialized

**Solution:**
1. Wait for initialization to complete
2. Check if PIN unlock modal appeared
3. Verify you're logged in
4. Check network connection

### Issue: "No spotPositions available"

**Cause:** `refreshPositions()` hasn't been called or failed

**Solution:**
1. Check console for errors in `refreshPositions`
2. Manually trigger: Click refresh button or navigate away and back
3. Check if Drift account is initialized

### Issue: "No base/quote position found"

**Cause:** Market index is incorrect or not in spotPositions

**Solution:**
1. Verify market indices are correct
2. Check if `spotMarkets` map is populated
3. Ensure `refreshPositions()` completed successfully

### Issue: Balances show 0 but you have funds

**Cause:** Funds might be in wallet, not deposited to Drift

**Solution:**
1. Check if you deposited to Drift Protocol
2. Drift balances are separate from wallet balances
3. Use "Deposit" button to move funds from wallet to Drift

## 6. Manual Testing Steps

### Step 1: Check Drift Account

```bash
# In browser console:
# 1. Check if initialized
console.log('Initialized:', /* check summary.initialized */);

# 2. Check collateral
console.log('Total Collateral:', /* check summary.totalCollateral */);
```

### Step 2: Check Market Mappings

```bash
# In browser console:
# Should show Map with entries
```

### Step 3: Trigger Refresh

```bash
# In browser console:
# Should trigger balance refresh
```

### Step 4: Check Hook State

```bash
# In component using the hook:
console.log('Base Balance:', baseBalance);
console.log('Quote Balance:', quoteBalance);
console.log('Is Borrowed:', isBorrowed);
console.log('Loading:', loading);
console.log('Error:', error);
```

## 7. Differences: Spot vs Futures

### Spot Trading (Drift Spot Markets)
- Balances stored per token in spot markets
- Each token has its own market index
- Example: SOL balance in SOL spot market (index 1)
- Used for spot trading on Drift

### Futures Trading (Drift Perp Markets)
- Uses USDC collateral (spot market index 0)
- Perp positions are separate from spot balances
- Collateral is in USDC spot market
- Perp positions don't affect spot token balances

### Key Point:
**Spot and Futures use the SAME underlying spot markets for balances!**

- Futures collateral = USDC spot market (index 0)
- Spot SOL balance = SOL spot market (index 1)
- They share the same `spotPositions` array

## 8. Force Refresh

If balances are stuck, try these in order:

1. **Soft refresh:** Click refresh button in UI
2. **Hard refresh:** Browser refresh (F5)
3. **Clear cache:** 
   ```javascript
   localStorage.removeItem('worldstreet_temp_pin');
   // Then refresh page
   ```
4. **Re-initialize:** Log out and log back in

## 9. Verify on Drift UI

To confirm your actual balances:

1. Go to https://app.drift.trade/
2. Connect with your wallet address (from console)
3. Check your spot balances there
4. Compare with what your app shows

## 10. Still Not Working?

If balances still don't show after all checks:

1. **Check console for errors** - Look for red error messages
2. **Verify network** - Ensure Solana RPC is responding
3. **Check Drift status** - Visit https://status.drift.trade/
4. **Test with different pair** - Try SOL/USDC instead of custom tokens
5. **Check account initialization** - Ensure Drift account is fully initialized

## Quick Checklist

- [ ] Drift client initialized (`isClientReady: true`)
- [ ] Drift account initialized (`summary.initialized: true`)
- [ ] Market mappings loaded (`spotMarkets.size > 0`)
- [ ] spotPositions populated (`spotPositions.length > 0`)
- [ ] Correct market indices (`baseMarketIndex` and `quoteMarketIndex` defined)
- [ ] No errors in console
- [ ] Funds deposited to Drift (not just in wallet)

## Example: Working Flow

```
1. User logs in
   → [DriftContext] Fetching initial data

2. PIN unlock
   → [DriftContext] Using cached PIN from memory

3. Client initialization
   → [DriftContext] Drift client ready!

4. Market mapping
   → [DriftContext] Built mapping for 6 spot markets

5. Account load
   → [DriftContext] User account loaded successfully

6. Positions refresh
   → [DriftContext] Accounts refreshed successfully

7. Hook fetches balances
   → [useSpotBalances] Base (SOL): 0 (deposited)
   → [useSpotBalances] Quote (USDC): 100.5 (deposited)

8. UI displays balances
   → Available: 100.5 USDC
```

## Need More Help?

Check these files for implementation details:
- `src/app/context/driftContext.tsx` - Main Drift integration
- `src/hooks/useSpotBalances.ts` - Balance fetching hook
- `src/hooks/SPOT_BALANCES_IMPLEMENTATION.md` - Implementation guide
