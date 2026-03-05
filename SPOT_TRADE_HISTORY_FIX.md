# Spot Trade History MongoDB Validation Fix

## Problem
When saving spot trade history to MongoDB, the application was throwing validation errors:
```
ValidationError: SpotTrade validation failed: 
  fromTokenAddress: Path `fromTokenAddress` is required.
  toTokenAddress: Path `toTokenAddress` is required.
```

The components were not providing all the required fields defined in the SpotTrade model.

## Root Cause
The SpotTrade MongoDB model requires these fields:
- `userId` ✓
- `txHash` ✓
- `chainId` ✗ (was missing)
- `pair` ✓
- `side` ✓ (but wrong format - was lowercase, needs uppercase)
- `fromTokenAddress` ✗ (was missing)
- `fromTokenSymbol` ✗ (was missing)
- `fromAmount` ✓
- `toTokenAddress` ✗ (was missing)
- `toTokenSymbol` ✗ (was missing)
- `toAmount` ✓
- `executionPrice` ✗ (was missing)
- `slippagePercent` ✗ (was missing)
- `status` ✓ (but wrong value - was 'COMPLETED', needs 'CONFIRMED')

## Solution
Updated all three components that save trade history to include complete token metadata.

## Changes Made

### 1. BinanceOrderForm.tsx
Updated the trade history save logic to include:
- `chainId`: Derived from effectiveChain (1151111081099710 for Solana, 1 for Ethereum)
- `side`: Converted to uppercase (BUY/SELL)
- `fromTokenAddress`: Token address from TOKEN_META
- `fromTokenSymbol`: Token symbol (tokenOut for buy, tokenIn for sell)
- `toTokenAddress`: Token address from TOKEN_META
- `toTokenSymbol`: Token symbol (tokenIn for buy, tokenOut for sell)
- `executionPrice`: Current market price as string
- `slippagePercent`: Default 0.5%
- `status`: Changed from 'COMPLETED' to 'CONFIRMED'

```typescript
const chainType = effectiveChain === 'sol' ? 'solana' : 'ethereum';
const chainMeta = effectiveChain === 'sol' ? TOKEN_META.solana : TOKEN_META.ethereum;
const chainId = chainType === 'solana' ? 1151111081099710 : 1;

const fromTokenMeta = activeTab === 'buy' ? chainMeta[tokenOut] : chainMeta[tokenIn];
const toTokenMeta = activeTab === 'buy' ? chainMeta[tokenIn] : chainMeta[tokenOut];

await fetch('/api/spot/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user?.userId,
    txHash,
    chainId,
    pair: selectedPair,
    side: activeTab.toUpperCase(),
    fromTokenAddress: fromTokenMeta.address,
    fromTokenSymbol: activeTab === 'buy' ? tokenOut : tokenIn,
    fromAmount: amount,
    toTokenAddress: toTokenMeta.address,
    toTokenSymbol: activeTab === 'buy' ? tokenIn : tokenOut,
    toAmount: total,
    executionPrice: currentMarketPrice.toString(),
    slippagePercent: 0.5,
    status: 'CONFIRMED',
  }),
});
```

### 2. MobileTradingModal.tsx
Applied the same fix as BinanceOrderForm.tsx:
- Added all required token metadata fields
- Converted side to uppercase
- Added chainId, executionPrice, slippagePercent
- Changed status to 'CONFIRMED'

### 3. useSpotSwap.ts
Updated the executeSpotSwap function to include:
- `chainId`: From getChainLabel helper
- `side`: Converted to uppercase
- `fromTokenAddress` and `toTokenAddress`: From getTokenMeta helper
- `fromTokenSymbol` and `toTokenSymbol`: Parsed from pair
- `executionPrice`: From quote
- `slippagePercent`: From params or default 3%
- `status`: Changed to 'CONFIRMED'

```typescript
const chain = getChainFromPair(params.pair);
const chainId = getChainLabel(params.pair);
const tokens = getTokenMeta(params.pair, chain);
const fromTokenAddr = params.side === 'buy' ? tokens.quote : tokens.base;
const toTokenAddr = params.side === 'buy' ? tokens.base : tokens.quote;
const [baseToken, quoteToken] = params.pair.split('-');

fetch('/api/spot/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user?.userId,
    txHash,
    chainId: typeof chainId === 'number' ? chainId : 1,
    pair: params.pair,
    side: params.side.toUpperCase(),
    fromTokenAddress: fromTokenAddr,
    fromTokenSymbol: params.side === 'buy' ? quoteToken : baseToken,
    fromAmount: quote.fromAmount,
    toTokenAddress: toTokenAddr,
    toTokenSymbol: params.side === 'buy' ? baseToken : quoteToken,
    toAmount: quote.toAmount,
    executionPrice: quote.executionPrice,
    slippagePercent: params.slippage || 3,
    status: 'CONFIRMED',
  }),
});
```

## Token Metadata Mapping

### Buy Order (e.g., Buy BTC with USDT)
- `fromTokenAddress`: USDT address
- `fromTokenSymbol`: "USDT"
- `fromAmount`: Amount of USDT spent
- `toTokenAddress`: BTC address
- `toTokenSymbol`: "BTC"
- `toAmount`: Amount of BTC received

### Sell Order (e.g., Sell BTC for USDT)
- `fromTokenAddress`: BTC address
- `fromTokenSymbol`: "BTC"
- `fromAmount`: Amount of BTC sold
- `toTokenAddress`: USDT address
- `toTokenSymbol`: "USDT"
- `toAmount`: Amount of USDT received

## Chain ID Mapping
- **Solana**: 1151111081099710
- **Ethereum**: 1

## Status Values
Changed from custom status to MongoDB enum:
- ~~'COMPLETED'~~ → 'CONFIRMED'
- Available values: 'PENDING', 'CONFIRMED', 'FAILED'

## Side Values
Changed from lowercase to uppercase:
- ~~'buy'~~ → 'BUY'
- ~~'sell'~~ → 'SELL'

## Testing
After this fix, trade history should save successfully with all required fields:

1. Execute a buy order on BTC-USDT
2. Check MongoDB for the saved trade
3. Verify all fields are present:
   - Token addresses (from/to)
   - Token symbols (from/to)
   - Amounts (from/to)
   - Execution price
   - Slippage percent
   - Chain ID
   - Status = 'CONFIRMED'
   - Side = 'BUY' or 'SELL'

## Benefits
- ✅ No more MongoDB validation errors
- ✅ Complete trade history with all token details
- ✅ Proper chain identification
- ✅ Accurate execution price tracking
- ✅ Slippage tracking for analytics
- ✅ Consistent status and side values
- ✅ Better data for trade history queries

## Notes
- Trade history saving is wrapped in try-catch, so failures won't affect the actual swap
- If history save fails, a warning is logged but the transaction still succeeds
- All token addresses come from the TOKEN_META constant which matches Li.Fi's token addresses
