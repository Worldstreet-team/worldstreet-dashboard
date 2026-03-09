# Drift Spot Trading - Quick Reference Guide

## Critical Rules for Drift Integration

### 1. Balance Source (MOST IMPORTANT!)
```typescript
// ✅ CORRECT - Get balance from Drift protocol
const position = driftUser.getSpotPosition(marketIndex);
const market = client.getSpotMarketAccount(marketIndex);
const balance = client.getTokenAmount(
  position.scaledBalance,
  market,
  position.balanceType
).toNumber();

// ❌ WRONG - Wallet balance is NOT used for trading
const walletBalance = await connection.getTokenAccountBalance(walletATA);
```

### 2. Order Precision (CRITICAL!)
```typescript
// ✅ CORRECT - Use SDK precision converter
const baseAssetAmount = client.convertToSpotPrecision(marketIndex, amount);

// ❌ WRONG - Raw numbers or manual conversion
const baseAssetAmount = new BN(amount);
const baseAssetAmount = new BN(amount * 1e9);
```

### 3. Pre-Order Checks (REQUIRED!)
```typescript
// ✅ CORRECT - Check collateral before placing order
const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;
if (freeCollateral <= 0) {
  throw new Error('Insufficient collateral');
}

const notionalValue = amount * marketPrice;
if (notionalValue > freeCollateral) {
  throw new Error(`Need ${notionalValue} USDC, have ${freeCollateral} USDC`);
}

// ❌ WRONG - Place order without checking
await client.placeSpotOrder(orderParams); // Will fail on-chain
```

### 4. Account Refresh (REQUIRED!)
```typescript
// ✅ CORRECT - Refresh before critical operations
if (!client.isSubscribed) {
  await client.subscribe();
}
await driftUser.fetchAccounts();

// ❌ WRONG - Use stale data
// (no refresh, data could be minutes old)
```

## Common Error Codes

| Code | Error | Cause | Fix |
|------|-------|-------|-----|
| 6003 | InsufficientCollateral | Not enough free collateral | Deposit more USDC or reduce order size |
| 6008 | InvalidOrderMinOrderSize | Order too small | Increase order size above minimum |
| 6024 | MarketPlaceOrderPaused | Market in settlement | Wait a few minutes and retry |
| 6025 | InvalidOracle | Oracle data unavailable | Retry in a few seconds |

## Debugging Checklist

When orders fail, check these in order:

1. **Is user account initialized?**
   ```typescript
   const userAccount = driftUser.getUserAccount();
   console.log('Initialized:', userAccount !== null);
   ```

2. **Does user have USDC deposited in Drift?**
   ```typescript
   const usdcPosition = driftUser.getSpotPosition(0);
   const balance = client.getTokenAmount(
     usdcPosition.scaledBalance,
     client.getSpotMarketAccount(0),
     usdcPosition.balanceType
   ).toNumber();
   console.log('USDC in Drift:', balance);
   ```

3. **Is there free collateral?**
   ```typescript
   const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;
   console.log('Free collateral:', freeCollateral);
   ```

4. **Is the order size correct?**
   ```typescript
   const baseAssetAmount = client.convertToSpotPrecision(marketIndex, amount);
   const market = client.getSpotMarketAccount(marketIndex);
   const humanReadable = baseAssetAmount.toNumber() / Math.pow(10, market.decimals);
   console.log('Order size:', amount, 'Converted:', humanReadable);
   ```

5. **Is the notional value within limits?**
   ```typescript
   const price = client.getOracleDataForSpotMarket(marketIndex).price.toNumber() / 1e6;
   const notional = amount * price;
   console.log('Notional:', notional, 'Free collateral:', freeCollateral);
   ```

## Precision Constants

```typescript
// Drift uses these precision constants:
PRICE_PRECISION = 1e6   // All prices
BASE_PRECISION = 1e9    // Most base assets (SOL, BTC, ETH)
QUOTE_PRECISION = 1e6   // USDC, USDT

// Always use SDK converters:
client.convertToSpotPrecision(marketIndex, amount)  // For order sizes
client.convertToPricePrecision(price)               // For limit prices
```

## Complete Order Flow

```typescript
async function placeSpotOrder(marketIndex, direction, amount) {
  // 1. Ensure client is ready
  if (!client.isSubscribed) {
    await client.subscribe();
  }
  
  // 2. Refresh account data
  await driftUser.fetchAccounts();
  
  // 3. Get current state
  const freeCollateral = driftUser.getFreeCollateral().toNumber() / 1e6;
  const price = client.getOracleDataForSpotMarket(marketIndex).price.toNumber() / 1e6;
  const notional = amount * price;
  
  // 4. Verify sufficient collateral
  if (direction === 'buy' && notional > freeCollateral) {
    throw new Error(`Need ${notional} USDC, have ${freeCollateral} USDC`);
  }
  
  // 5. Convert to proper precision
  const baseAssetAmount = client.convertToSpotPrecision(marketIndex, amount);
  
  // 6. Verify precision conversion
  const market = client.getSpotMarketAccount(marketIndex);
  const humanReadable = baseAssetAmount.toNumber() / Math.pow(10, market.decimals);
  if (Math.abs(humanReadable - amount) > amount * 0.01) {
    throw new Error('Precision conversion error');
  }
  
  // 7. Place order
  const orderParams = {
    orderType: OrderType.MARKET,
    marketType: MarketType.SPOT,
    marketIndex,
    direction: direction === 'buy' ? PositionDirection.LONG : PositionDirection.SHORT,
    baseAssetAmount,
    price: new BN(0),
  };
  
  const txSig = await client.placeSpotOrder(orderParams);
  
  // 8. Wait for confirmation
  await connection.confirmTransaction(txSig, 'confirmed');
  
  // 9. Refresh balances
  await driftUser.fetchAccounts();
  
  return txSig;
}
```

## Deposit Flow

```typescript
async function depositUSDC(amount) {
  // 1. Get pre-deposit balance
  const preBalance = getUSDCBalance(); // Use getTokenAmount
  
  // 2. Convert to proper precision
  const depositAmount = client.convertToSpotPrecision(0, amount);
  
  // 3. Get user's USDC token account
  const userTokenAccount = await client.getAssociatedTokenAccount(0);
  
  // 4. Deposit
  const txSig = await client.deposit(
    depositAmount,
    0, // USDC market index
    userTokenAccount,
    0  // subaccount
  );
  
  // 5. Wait for confirmation
  await connection.confirmTransaction(txSig, 'confirmed');
  
  // 6. Verify balance increased
  await driftUser.fetchAccounts();
  const postBalance = getUSDCBalance();
  
  if (postBalance <= preBalance) {
    console.warn('Deposit did not increase balance!');
  }
  
  return txSig;
}
```

## Market Indexes

Common Drift market indexes:
```typescript
0  = USDC (collateral)
1  = SOL
2  = BTC
3  = ETH
4  = Other tokens...
```

Always use `getSpotMarketAccount(index)` to get market details.

## Testing Commands

```typescript
// Check if account is initialized
const user = client.getUser();
const account = user.getUserAccount();
console.log('Initialized:', account !== null);

// Check USDC balance in Drift
const usdcPos = user.getSpotPosition(0);
const usdcMarket = client.getSpotMarketAccount(0);
const balance = client.getTokenAmount(
  usdcPos.scaledBalance,
  usdcMarket,
  usdcPos.balanceType
).toNumber();
console.log('USDC Balance:', balance);

// Check free collateral
const free = user.getFreeCollateral().toNumber() / 1e6;
console.log('Free Collateral:', free);

// Check total collateral
const total = user.getTotalCollateral().toNumber() / 1e6;
console.log('Total Collateral:', total);
```

## Common Mistakes

1. ❌ Using wallet balance instead of Drift balance
2. ❌ Not calling `fetchAccounts()` before operations
3. ❌ Using `new BN(amount)` instead of `convertToSpotPrecision()`
4. ❌ Not checking free collateral before placing orders
5. ❌ Not verifying deposits actually increased balance
6. ❌ Using stale oracle prices
7. ❌ Not handling market settlement mode
8. ❌ Placing orders smaller than minimum size

## Quick Fixes

**Problem**: InsufficientCollateral error
**Solution**: 
1. Check `getFreeCollateral()` > 0
2. Verify USDC deposited with `getTokenAmount()`
3. Ensure order notional < free collateral

**Problem**: Order size too small
**Solution**: 
1. Check market minimum with `market.minOrderSize`
2. Increase order size above minimum

**Problem**: Precision mismatch
**Solution**: 
1. Always use `convertToSpotPrecision()`
2. Verify conversion with human-readable check

**Problem**: Stale data
**Solution**: 
1. Call `fetchAccounts()` before operations
2. Ensure `client.isSubscribed === true`
