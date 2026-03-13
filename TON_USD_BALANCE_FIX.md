# TON USD Balance Display Fix

## Issue
TON balance was not showing USD value and was not being included in total portfolio balance calculations on both the assets page and dashboard page.

## Root Cause
The TON cryptocurrency was not properly configured in the price fetching system:

1. **Missing from CORE_COINS**: TON was not included in the list of core coins that are always fetched from CoinGecko API
2. **Missing Symbol Mapping**: There was no mapping from CoinGecko's "toncoin" ID to the "TON" symbol used in the application

## Solution
Updated `src/app/api/prices/route.ts` to properly include TON:

### Changes Made

1. **Added TON to CORE_COINS list**:
```typescript
// Before
const CORE_COINS = ["bitcoin", "ethereum", "solana", "tron", "tether", "usd-coin"];

// After  
const CORE_COINS = ["bitcoin", "ethereum", "solana", "tron", "toncoin", "tether", "usd-coin"];
```

2. **Added TON symbol mapping**:
```typescript
const ID_TO_SYMBOL: Record<string, string> = {
  "bitcoin": "BTC",
  "ethereum": "ETH", 
  "solana": "SOL",
  "tron": "TRX",
  "toncoin": "TON",  // ← Added this mapping
  "tether": "USDT",
  "usd-coin": "USDC",
  // ... other mappings
};
```

## Technical Details

- **CoinGecko ID**: TON uses the ID "toncoin" on CoinGecko API
- **Application Symbol**: The app uses "TON" as the display symbol
- **Integration Points**: The fix affects:
  - Assets page (`src/app/(DashboardLayout)/assets/page.tsx`)
  - Dashboard portfolio stats (`src/components/trading/PortfolioStats.tsx`)
  - Price fetching hook (`src/lib/wallet/usePrices.ts`)

## Expected Results

After this fix:
1. TON balance will show USD value on the assets page
2. TON will be included in total portfolio calculations
3. TON price will be available for P&L calculations
4. TON will appear with proper USD values in the dashboard

## Files Modified

- `src/app/api/prices/route.ts` - Added TON to price fetching configuration

## Testing

The fix can be verified by:
1. Checking that TON balance shows USD value on `/assets` page
2. Verifying TON is included in total portfolio balance on dashboard
3. Confirming TON price is available in the prices API response

## Status

✅ **COMPLETED** - TON is now properly configured for USD price fetching and portfolio calculations.