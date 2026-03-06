# Drift SDK Order Placement Fixes

## Issues Fixed

### 1. openPosition - Incorrect Order Parameters

**Problem**: 
- Used string literals instead of SDK enums: `"market"`, `"long"`, `"short"`
- Manually calculated base asset amount: `new BN(size * 1e9)`
- Missing required order parameters

**Solution**:
```typescript
// Import Drift SDK enums
const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

// Convert direction string to SDK enum
const positionDirection = direction === 'long' 
  ? PositionDirection.LONG 
  : PositionDirection.SHORT;

// Use SDK method for precision conversion
const baseAssetAmount = client.convertToPerpPrecision(size);

// Construct order with correct SDK enums
const orderParams = {
  orderType: OrderType.MARKET,
  marketType: MarketType.PERP,
  marketIndex,
  direction: positionDirection,
  baseAssetAmount,
  price: new BN(0),
};
```

**Changes Made**:
1. Import SDK enums: `OrderType`, `MarketType`, `PositionDirection`, `BN`
2. Convert string direction to `PositionDirection` enum
3. Use `client.convertToPerpPrecision(size)` instead of manual calculation
4. Include all required parameters: `orderType`, `marketType`, `marketIndex`, `direction`, `baseAssetAmount`, `price`

---

### 2. closePosition - Manual Order Construction

**Problem**:
- Manually constructed opposite order to close position
- Calculated opposite direction and base amount
- Used reduce-only flag with manual order placement

**Solution**:
```typescript
// Use Drift SDK native closePosition method
const txSignature = await client.closePosition(marketIndex);
```

**Changes Made**:
1. Removed manual order construction
2. Removed direction calculation
3. Removed base amount calculation
4. Use SDK's native `closePosition(marketIndex)` method
5. SDK handles all closing logic internally

---

### 3. BN Import Fixes

**Problem**:
- Used `bn.js` directly: `const BN = (await import('bn.js')).default`
- Caused module not found errors

**Solution**:
```typescript
// Import BN from Drift SDK
const { BN } = await import('@drift-labs/sdk');
```

**Files Updated**:
- `withdrawCollateral` function
- `previewTrade` function

---

## SDK Enums Reference

### OrderType
```typescript
enum OrderType {
  MARKET = 0,
  LIMIT = 1,
  TRIGGER_MARKET = 2,
  TRIGGER_LIMIT = 3,
  ORACLE = 4,
}
```

### MarketType
```typescript
enum MarketType {
  SPOT = 0,
  PERP = 1,
}
```

### PositionDirection
```typescript
enum PositionDirection {
  LONG = 0,
  SHORT = 1,
}
```

---

## Order Parameters Structure

### Market Order (Perp)
```typescript
{
  orderType: OrderType.MARKET,
  marketType: MarketType.PERP,
  marketIndex: number,
  direction: PositionDirection.LONG | PositionDirection.SHORT,
  baseAssetAmount: BN,
  price: BN, // 0 for market orders
}
```

---

## Benefits

1. **Type Safety**: Using SDK enums prevents runtime errors
2. **Correct Precision**: SDK methods handle decimal conversions properly
3. **Simplified Logic**: Native `closePosition` method is cleaner
4. **Better Maintainability**: Following SDK patterns makes code easier to understand
5. **Future Proof**: SDK updates won't break enum-based code

---

## Testing Checklist

### openPosition
- [ ] Long position opens successfully
- [ ] Short position opens successfully
- [ ] Correct base asset amount calculated
- [ ] Transaction confirms on-chain
- [ ] Position appears in account
- [ ] Summary refreshes after order

### closePosition
- [ ] Position closes successfully
- [ ] Transaction confirms on-chain
- [ ] Position removed from account
- [ ] PnL calculated correctly
- [ ] Summary refreshes after close

### General
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Proper error messages displayed
- [ ] Loading states work correctly
- [ ] PIN unlock flow works

---

## Notes

- The `@solana/web3.js` version conflict warning is a known issue with Drift SDK dependencies
- It doesn't affect runtime functionality
- All BN imports now come from `@drift-labs/sdk` for consistency
- The SDK handles all precision conversions internally
