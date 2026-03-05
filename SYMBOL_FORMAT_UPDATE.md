# Symbol Format Update

Updated the symbol format handling - turns out KuCoin uses the same format as us!

## Discovery

Initially thought KuCoin used `BTCUSDT` format, but testing revealed they actually use `BTC-USDT` format (with dash).

## Changes Made

### API Routes (Backend)

Removed unnecessary symbol conversion - KuCoin accepts dashes:

**src/app/api/kucoin/ticker/route.ts**
```typescript
// ❌ Before: Converted symbol
const kucoinSymbol = symbol.replace('-', '');

// ✅ After: Pass through directly
// KuCoin expects the symbol with dash (BTC-USDT)
const response = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${symbol}`);
```

**src/app/api/kucoin/trades/route.ts**
```typescript
// ❌ Before: Converted symbol
const kucoinSymbol = symbol.replace('-', '');

// ✅ After: Pass through directly
// KuCoin expects the symbol with dash (BTC-USDT)
const response = await fetch(`https://api.kucoin.com/api/v1/market/histories?symbol=${symbol}`);
```

### Frontend Components

No changes needed - already sending correct format:

**src/components/spot/MarketTicker.tsx**
- ✅ Already correct: `fetch(/api/kucoin/ticker?symbol=BTC-USDT)`

**src/components/spot/MarketTrades.tsx**
- ✅ Already correct: `fetch(/api/kucoin/trades?symbol=BTC-USDT)`

## Benefits

### 1. Simplicity
- No conversion needed anywhere
- Both frontend and backend use the same format
- KuCoin API uses the same format too

### 2. Consistency
- All code uses `BTC-USDT` format
- No confusion about which format to use
- Easier to maintain and debug

### 3. Performance
- No string manipulation overhead
- Direct pass-through of symbols
- Cleaner, more efficient code

### 4. Correctness
- Using the actual format KuCoin expects
- No risk of conversion bugs
- Tested and verified with real API calls

## Symbol Format Reference

| Context | Format | Example |
|---------|--------|---------|
| Frontend Components | `BASE-QUOTE` | `BTC-USDT` |
| API Route Parameters | `BASE-QUOTE` | `BTC-USDT` |
| KuCoin API Calls | `BASE-QUOTE` | `BTC-USDT` |

**All contexts use the same format!**

## Code Examples

### Frontend Component
```typescript
// Use dashed format (same as KuCoin)
const response = await fetch(`/api/kucoin/ticker?symbol=${selectedPair}`);
// selectedPair = "BTC-USDT"
```

### API Route
```typescript
// Receive dashed format, pass directly to KuCoin
const symbol = searchParams.get('symbol'); // "BTC-USDT"
const response = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${symbol}`);
// No conversion needed!
```

## Migration Complete ✅

All components and API routes now use the correct symbol format that KuCoin expects (`BTC-USDT`).
