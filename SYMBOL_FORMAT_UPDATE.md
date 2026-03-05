# Symbol Format Update

Updated the symbol format handling to be consistent across the application.

## Changes Made

### API Routes (Backend)

All KuCoin API routes now handle symbol conversion internally:

**src/app/api/kucoin/ticker/route.ts**
```typescript
// Convert from our format (BTC-USDT) to KuCoin format (BTCUSDT)
const kucoinSymbol = symbol.replace('-', '');
```

**src/app/api/kucoin/trades/route.ts**
```typescript
// Convert from our format (BTC-USDT) to KuCoin format (BTCUSDT)
const kucoinSymbol = symbol.replace('-', '');
```

### Frontend Components

All frontend components now send symbols in our standard format (`BTC-USDT`):

**src/components/spot/MarketTicker.tsx**
- ❌ Before: `fetch(/api/kucoin/ticker?symbol=BTCUSDT)`
- ✅ After: `fetch(/api/kucoin/ticker?symbol=BTC-USDT)`

**src/components/spot/MarketTrades.tsx**
- ❌ Before: `fetch(/api/kucoin/trades?symbol=BTCUSDT)`
- ✅ After: `fetch(/api/kucoin/trades?symbol=BTC-USDT)`

## Benefits

### 1. Consistency
- All frontend code uses the same format (`BTC-USDT`)
- No need to remember which API expects which format
- Easier to maintain and debug

### 2. Separation of Concerns
- Frontend doesn't need to know about KuCoin's format
- API routes handle provider-specific formatting
- Easy to switch providers in the future

### 3. Single Source of Truth
- Symbol conversion happens in one place (API routes)
- No duplicate conversion logic across components
- Reduces potential bugs

### 4. Better Abstraction
- Frontend works with our domain model
- Backend handles external API specifics
- Clean architecture pattern

## Symbol Format Reference

| Context | Format | Example |
|---------|--------|---------|
| Frontend Components | `BASE-QUOTE` | `BTC-USDT` |
| API Route Parameters | `BASE-QUOTE` | `BTC-USDT` |
| KuCoin API Calls | `BASEQUOTE` | `BTCUSDT` |

## Code Examples

### Frontend Component
```typescript
// Always use dashed format
const response = await fetch(`/api/kucoin/ticker?symbol=${selectedPair}`);
// selectedPair = "BTC-USDT"
```

### API Route
```typescript
// Receive dashed format, convert for KuCoin
const symbol = searchParams.get('symbol'); // "BTC-USDT"
const kucoinSymbol = symbol.replace('-', ''); // "BTCUSDT"
const response = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${kucoinSymbol}`);
```

## Migration Complete ✅

All components and API routes now follow the consistent symbol format pattern.
