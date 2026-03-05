# USDT Balance Fix

## Problem
The USDT balance was always showing as 0 in both the desktop `BinanceOrderForm` and mobile `MobileTradingModal` components, even though users had USDT in their Tron wallets.

## Root Cause
The `usePairBalances` hook was only fetching balances from the spot trading API (`/api/users/[userId]/balances`), which didn't include USDT balances stored in Tron wallets.

## Solution

### 1. Enhanced Balance API (`src/app/api/users/[userId]/balances/route.ts`)
- Added support for query parameters (`assets` and `chain`)
- Forward query parameters to backend API
- Return zero balances for requested assets if none found
- Ensure consistent response format with `balances` array

### 2. Updated `usePairBalances` Hook (`src/hooks/usePairBalances.ts`)
- Added `fetchTronUSDT()` function to fetch USDT from Tron wallet
- Automatically checks Tron wallet when USDT is not found in spot balances
- Added better error handling and NaN checks
- Enhanced logging for debugging

### 3. Flow
```
1. User opens trading page with BTC-USDT pair
2. usePairBalances fetches from /api/users/[userId]/balances?assets=BTC,USDT
3. If USDT balance is 0 or not found:
   - Hook calls /api/tron/balance
   - Extracts USDT token balance from Tron wallet
   - Uses Tron USDT balance as tokenOut (quote asset)
4. Components display actual USDT balance
```

## Components Updated
- ✅ `BinanceOrderForm.tsx` - Desktop order form
- ✅ `MobileTradingModal.tsx` - Mobile trading modal
- Both components already use `usePairBalances` hook, so they automatically benefit from the fix

## Testing
1. Open spot trading page (desktop or mobile)
2. Check "Available" balance for USDT
3. Should now show actual USDT balance from Tron wallet
4. Check browser console for detailed logs:
   - `[usePairBalances] Fetching balances`
   - `[usePairBalances] USDT not found in spot balances, checking Tron wallet...`
   - `[usePairBalances] Using USDT from Tron wallet: X.XX`

## Benefits
- ✅ Accurate USDT balance display
- ✅ No code duplication (single hook handles both desktop and mobile)
- ✅ Fallback to Tron wallet for USDT
- ✅ Better error handling and logging
- ✅ Consistent behavior across all trading interfaces

## Future Improvements
- Consider caching Tron balance to reduce API calls
- Add support for other stablecoins (USDC, DAI, etc.)
- Implement balance refresh on trade execution
