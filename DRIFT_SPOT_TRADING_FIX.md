# Drift Spot Trading InsufficientCollateral Fix

## Problem Summary
The Drift spot trading implementation was failing with Error Code 6003 (InsufficientCollateral) even when users had deposited USDC collateral. This document details the root causes and fixes applied.

## Root Causes Identified

### 1. Missing Pre-Order Collateral Verification
**Issue**: Orders were being placed without checking if the user had sufficient free collateral.

**Impact**: The transaction would fail on-chain after gas was spent, providing poor UX.

**Fix**: Added comprehensive pre-order checks:
```typescript
// Get margin info
const totalCollateral = driftUser.getTotalCollateral().toNumber() / 1e6;
const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;

// Safety check before placing order
if (freeCollateral <= 0) {
  return { 
    success: false, 
    error: `Insufficient collateral. You have ${freeCollateral.toFixed(2)} USDC free collateral.` 
  };
}

// Calculate notional value and required margin
const notionalValue = amount * marketPrice;
const estimatedMarginRequired = direction === 'buy' ? notionalValue : 0;

if (direction === 'buy' && estimatedMarginRequired > freeCollateral) {
  return {
    success: false,
    error: `Order requires ${estimatedMarginRequired.toFixed(2)} USDC but you only have ${freeCollateral.toFixed(2)} USDC available.`
  };
}
```

### 2. Missing Account Refresh Before Orders
**Issue**: The Drift client wasn't refreshing account data before placing orders, leading to stale collateral calculations.

**Impact**: Orders would use outdated margin data, causing false insufficient collateral errors.

**Fix**: Added explicit account refresh:
```typescript
// Ensure client is subscribed to get latest account data
if (!client.isSubscribed) {
  await client.subscribe();
}

// Refresh accounts to get latest balances
await refreshAccounts();
```

### 3. Precision Verification Missing
**Issue**: No verification that `convertToSpotPrecision()` was producing correct values.

**Impact**: If precision conversion failed, orders could be 100x-1000x larger than intended.

**Fix**: Added precision verification:
```typescript
const baseAssetAmount = client.convertToSpotPrecision(marketIndex, amount);

// Verify precision conversion
const targetMarket = client.getSpotMarketAccount(marketIndex);
const humanReadableAmount = baseAssetAmount.toNumber() / Math.pow(10, targetMarket.decimals);

if (Math.abs(humanReadableAmount - amount) > amount * 0.01) {
  console.error('[DriftContext] PRECISION MISMATCH DETECTED');
  return {
    success: false,
    error: 'Order size precision error. Please try again.'
  };
}
```

### 4. Insufficient Diagnostic Logging
**Issue**: When errors occurred, there was no visibility into:
- Actual USDC balance in Drift
- Free collateral available
- Order notional value
- Precision conversion results

**Impact**: Debugging was nearly impossible.

**Fix**: Added comprehensive diagnostic logging:
```typescript
console.log('=== DRIFT SPOT ORDER DEBUG ===');
console.log('[DriftContext] Market Index:', marketIndex);
console.log('[DriftContext] Direction:', direction);
console.log('[DriftContext] Amount (input):', amount);
console.log('[DriftContext] USDC Balance (from Drift):', usdcBalance);
console.log('[DriftContext] Total Collateral:', totalCollateral);
console.log('[DriftContext] Free Collateral:', freeCollateral);
console.log('[DriftContext] Market Price:', marketPrice);
console.log('[DriftContext] Notional Value:', notionalValue);
console.log('[DriftContext] Base Asset Amount (BN):', baseAssetAmount.toString());
console.log('=== END DEBUG ===');
```

### 5. Deposit Verification Missing
**Issue**: After deposits, there was no verification that the balance actually increased in Drift.

**Impact**: Silent deposit failures could occur, leaving users confused about why they couldn't trade.

**Fix**: Added pre/post deposit balance verification:
```typescript
// Get pre-deposit balance
const preDepositPosition = driftUser.getSpotPosition(0);
let preDepositBalance = 0;
if (preDepositPosition && preDepositPosition.scaledBalance && !preDepositPosition.scaledBalance.isZero()) {
  const tokenAmount = client.getTokenAmount(
    preDepositPosition.scaledBalance,
    usdcMarket,
    preDepositPosition.balanceType
  );
  preDepositBalance = tokenAmount.toNumber();
}

// ... perform deposit ...

// Verify deposit increased balance
const postDepositBalance = /* get balance same way */;
if (postDepositBalance <= preDepositBalance) {
  console.warn('[DriftContext] WARNING: Deposit did not increase balance as expected!');
}
```

## Drift Architecture Rules Applied

### 1. Collateral Source
✅ **Correct**: Using `driftUser.getSpotPosition(0)` and `client.getTokenAmount()` to get USDC balance
❌ **Wrong**: Using wallet token balance (wallet balances are NOT used for margin)

### 2. Precision System
✅ **Correct**: Using `client.convertToSpotPrecision(marketIndex, amount)` for all order sizes
✅ **Correct**: Using `client.convertToPricePrecision(price)` for limit orders
❌ **Wrong**: Using `new BN(amount)` or raw floats

### 3. Margin Calculation
✅ **Correct**: Using `driftUser.getFreeCollateral()` to check available margin
✅ **Correct**: Calculating notional value as `amount * marketPrice`
❌ **Wrong**: Assuming wallet balance equals trading power

### 4. Account Refresh
✅ **Correct**: Calling `refreshAccounts()` before critical operations
✅ **Correct**: Ensuring `client.isSubscribed` is true
❌ **Wrong**: Using stale account data

## Testing Checklist

After applying these fixes, verify:

1. **Deposit Flow**
   - [ ] Deposit 10 USDC
   - [ ] Check console logs show balance increase
   - [ ] Verify `getTokenAmount(0)` returns 10 (minus fees)

2. **Order Placement**
   - [ ] Place $1 buy order for SOL
   - [ ] Check console logs show:
     - Free collateral > 0
     - Notional value calculated correctly
     - Precision conversion matches input
   - [ ] Order executes successfully

3. **Error Handling**
   - [ ] Try to place order larger than free collateral
   - [ ] Verify friendly error message appears
   - [ ] Verify no transaction is sent

4. **Balance Display**
   - [ ] UI shows correct USDC balance from Drift
   - [ ] Balance updates after deposit
   - [ ] Balance updates after trade

## Expected Behavior After Fix

### Scenario 1: Successful Trade
```
User deposits: 10 USDC
Drift balance: 9.5 USDC (after 5% fee)
Free collateral: 9.5 USDC
Order: Buy 0.1 SOL at $100 = $10 notional

Result: ❌ Order rejected with clear message
"Order requires 10.00 USDC but you only have 9.50 USDC available."
```

### Scenario 2: Successful Trade
```
User deposits: 20 USDC
Drift balance: 19 USDC (after 5% fee)
Free collateral: 19 USDC
Order: Buy 0.1 SOL at $100 = $10 notional

Result: ✅ Order executes successfully
Console shows all diagnostic info
Balance updates correctly
```

### Scenario 3: Precision Verification
```
Order: Buy 1 SOL
convertToSpotPrecision returns: 1000000000 (1e9)
Verification: 1000000000 / 1e9 = 1.0 ✅

If precision was wrong:
convertToSpotPrecision returns: 1000 (wrong!)
Verification: 1000 / 1e9 = 0.000001 ❌
Error: "Order size precision error"
```

## Key Takeaways

1. **Always verify collateral before placing orders** - Don't rely on on-chain errors
2. **Always refresh accounts before critical operations** - Stale data causes false errors
3. **Always verify precision conversions** - Wrong precision = wrong order size
4. **Always log diagnostic info** - Makes debugging 100x easier
5. **Always verify deposits worked** - Silent failures are the worst UX

## Files Modified

- `src/app/context/driftContext.tsx`
  - Enhanced `placeSpotOrder()` with pre-order checks and diagnostics
  - Enhanced `depositCollateral()` with pre/post balance verification
  - Added comprehensive logging throughout

## Next Steps

1. Test deposit flow with real USDC
2. Test small spot orders ($1-5)
3. Monitor console logs for any anomalies
4. Verify UI balance matches Drift balance
5. Test error cases (insufficient collateral, etc.)

## Additional Notes

### Why Spot Orders Need 100% Margin
Unlike perpetual futures which use leverage, spot orders on Drift require full collateral:
- **Buy order**: Need 100% of notional value in USDC
- **Sell order**: Need 100% of base asset

This is why a $10 buy order requires $10 in free collateral.

### Common Mistakes to Avoid
1. ❌ Using wallet balance instead of Drift balance
2. ❌ Not refreshing accounts before orders
3. ❌ Using raw numbers instead of BN with proper precision
4. ❌ Not checking free collateral before placing orders
5. ❌ Not verifying deposits actually increased balance

### Debugging Commands
When investigating issues, check these values:
```typescript
// In browser console after order attempt:
// Look for "=== DRIFT SPOT ORDER DEBUG ===" section
// Verify:
// - USDC Balance > 0
// - Free Collateral > 0
// - Notional Value < Free Collateral
// - Base Asset Amount looks reasonable
```
