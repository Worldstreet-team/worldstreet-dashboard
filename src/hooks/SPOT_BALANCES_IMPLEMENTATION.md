# Spot Balances Implementation Guide

## Overview

This document explains how spot trading pair balances are fetched and displayed using the Drift Protocol SDK.

## Core Concept

**Important:** Drift does NOT store balances as pairs like centralized exchanges.

Instead, Drift stores balances per token spot market:
- Each token has its own spot market index
- Balances are tracked independently for each token
- Pairs are constructed by combining two token balances

### Example: SOL/USDC Pair

```
Pair: SOL/USDC
├── SOL Balance → from SOL spot market (marketIndex = 1)
└── USDC Balance → from USDC spot market (marketIndex = 0)
```

When a user buys SOL using USDC:
- SOL balance increases (in SOL spot market)
- USDC balance decreases (in USDC spot market)

## Implementation

### 1. New Hook: `useSpotBalances`

Location: `src/hooks/useSpotBalances.ts`

This hook fetches balances for a trading pair from Drift:

```typescript
const {
  baseBalance,      // Balance of base token (e.g., SOL)
  quoteBalance,     // Balance of quote token (e.g., USDC)
  isBorrowed,       // { base: boolean, quote: boolean }
  loading,
  error,
  refetch
} = useSpotBalances(baseMarketIndex, quoteMarketIndex);
```

#### Parameters
- `baseMarketIndex`: Drift spot market index for base token (e.g., SOL = 1)
- `quoteMarketIndex`: Drift spot market index for quote token (e.g., USDC = 0)

#### How It Works

1. **Reads from DriftContext**: The hook uses `spotPositions` from DriftContext
2. **Finds matching positions**: Searches for positions matching the market indices
3. **Extracts balances**: Gets the amount and balance type (deposit/borrow)
4. **Returns UI-friendly values**: Converts to positive numbers for display

```typescript
// Internal logic
const basePosition = spotPositions.find(p => p.marketIndex === baseMarketIndex);
const baseAmount = basePosition?.amount || 0;
const baseBorrowed = basePosition?.balanceType === 'borrow';
```

### 2. Balance Display Logic

#### For SELL Orders
- User is selling the base token (e.g., SOL)
- Display: `Available SOL = baseBalance`
- Max sell: `baseBalance`

#### For BUY Orders
- User is buying the base token using quote token (e.g., buying SOL with USDC)
- Display: `Available USDC = quoteBalance`
- Max buy: depends on current price

### 3. Updated Components

#### BinanceOrderForm.tsx
```typescript
// Get market indices
const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

// Fetch balances
const { baseBalance, quoteBalance, isBorrowed } = 
  useSpotBalances(baseMarketIndex, quoteMarketIndex);

// Display logic
const currentBalance = activeTab === 'buy' ? quoteBalance : baseBalance;
const currentToken = activeTab === 'buy' ? quoteAsset : baseAsset;
```

#### MobileTradingForm.tsx
Same pattern as BinanceOrderForm.

### 4. Borrowed Balances

Drift supports borrowing tokens. The hook detects this:

```typescript
isBorrowed: {
  base: boolean,   // true if base token is borrowed
  quote: boolean   // true if quote token is borrowed
}
```

UI displays borrowed balances differently:
- Label: "Borrowed" instead of "Avbl"
- Color: Red text instead of white

## Market Index Mapping

Common Drift spot market indices:

| Token | Market Index |
|-------|--------------|
| USDC  | 0            |
| SOL   | 1            |
| BTC   | 2            |
| ETH   | 3            |
| USDT  | 4            |
| JitoSOL | 5          |

Get market index dynamically:
```typescript
const marketIndex = getSpotMarketIndexBySymbol('SOL'); // Returns 1
```

## Data Flow

```
DriftContext
  ├── Subscribes to Drift client
  ├── Fetches spot positions
  └── Stores in spotPositions array
        ↓
useSpotBalances Hook
  ├── Reads spotPositions
  ├── Filters by marketIndex
  └── Returns balances
        ↓
Trading Components
  ├── Display balances
  ├── Calculate max amounts
  └── Enable/disable trade buttons
```

## Balance Refresh

Balances automatically update when:
1. Drift client subscribes (initial load)
2. Market data changes (WebSocket updates)
3. Orders are filled
4. User manually calls `refetch()`

```typescript
const { refetch } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

// After trade execution
await refetch();
```

## Edge Cases

### 1. Negative Balances (Borrowed)
```typescript
// Drift returns negative for borrowed tokens
const amount = -2.5; // User borrowed 2.5 SOL

// Hook converts to positive and sets flag
baseBalance = 2.5;
isBorrowed.base = true;
```

### 2. Undefined Drift Client
```typescript
// Hook returns zero balances
if (!isClientReady) {
  return { baseBalance: 0, quoteBalance: 0, ... };
}
```

### 3. Market Not Found
```typescript
// If market index is undefined
const marketIndex = getSpotMarketIndexBySymbol('UNKNOWN'); // undefined

// Hook returns zero balance for that token
```

## Performance

- **No RPC calls**: Balances come from cached Drift client data
- **Efficient updates**: Only re-fetches when dependencies change
- **Minimal re-renders**: Uses React hooks best practices

## Important Rules

❌ **Never** calculate balances from:
- Trade history
- Open orders
- UI state
- External APIs

✅ **Always** read balances from:
- `driftClient.getTokenAmount(marketIndex)` (via DriftContext)
- `spotPositions` array (populated by DriftContext)

## Testing

To verify balances are correct:

1. Check Drift UI: https://app.drift.trade/
2. Compare with your implementation
3. Balances should match exactly

## Migration from Old Hook

Old hook (`usePairBalances`):
- Fetched from backend API
- Mixed Drift + wallet balances
- Complex fallback logic

New hook (`useSpotBalances`):
- Pure Drift SDK integration
- Single source of truth
- Simpler, more reliable

## Future Enhancements

Potential improvements:
1. Add BN (BigNumber) support for precision
2. Cache balances in localStorage
3. Add balance change notifications
4. Support for multiple subaccounts
