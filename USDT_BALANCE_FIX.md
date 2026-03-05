# USDT Balance Fix - Chain-Aware Implementation

## Problem
The USDT balance was always showing as 0 in both the desktop `BinanceOrderForm` and mobile `MobileTradingModal` components, even though users had USDT in their wallets. Additionally, USDT exists on multiple chains (Tron, Ethereum, Solana), and the system needed to fetch from the correct chain based on the trading pair.

## Root Cause
The `usePairBalances` hook was only fetching balances from the spot trading API (`/api/users/[userId]/balances`), which didn't include USDT balances stored in various chain wallets. It also wasn't chain-aware, so it couldn't determine which USDT to use.

## Solution

### 1. Enhanced Balance API (`src/app/api/users/[userId]/balances/route.ts`)
- Added support for query parameters (`assets` and `chain`)
- Forward query parameters to backend API
- Return zero balances for requested assets if none found
- Ensure consistent response format with `balances` array

### 2. Updated `usePairBalances` Hook (`src/hooks/usePairBalances.ts`)
- Added `getUSDTChain()` function to determine correct chain based on trading pair:
  - **BTC-USDT, ETH-USDT** → Use EVM (Ethereum) USDT
  - **SOL-USDT** → Use Solana USDT
  - **Default** → Use Tron USDT
- Added `fetchTronUSDT()` function to fetch USDT from Tron wallet
- Automatically checks appropriate chain when USDT is not found in spot balances
- Fallback mechanism: tries preferred chain first, then falls back to Tron
- Added better error handling and NaN checks
- Enhanced logging for debugging

### 3. Updated Components
Both `BinanceOrderForm` and `MobileTradingModal` now include:
- `getChainForPair()` function to determine chain from trading pair
- Automatic chain detection if not explicitly provided
- Pass `effectiveChain` to `usePairBalances` hook

### 4. Chain Mapping Logic
```typescript
BTC-USDT → EVM (Ethereum USDT)
ETH-USDT → EVM (Ethereum USDT)
SOL-USDT → SOL (Solana USDT)
Other pairs → TRON (Tron USDT as default)
```

### 5. Flow
```
1. User opens trading page with BTC-USDT pair
2. Component determines chain: BTC → EVM
3. usePairBalances fetches from /api/users/[userId]/balances?assets=BTC,USDT&chain=evm
4. If USDT balance is 0 or not found:
   a. Hook checks EVM chain for USDT
   b. If still 0, falls back to Tron wallet
   c. Uses the first non-zero USDT balance found
5. Components display actual USDT balance from correct chain
```

## Components Updated
- ✅ `BinanceOrderForm.tsx` - Desktop order form with chain detection
- ✅ `MobileTradingModal.tsx` - Mobile trading modal with chain detection
- Both components automatically determine the correct chain based on the trading pair

## Testing
1. Open spot trading page (desktop or mobile)
2. Select different pairs:
   - **BTC-USDT**: Should show EVM USDT balance
   - **ETH-USDT**: Should show EVM USDT balance
   - **SOL-USDT**: Should show Solana USDT balance
3. Check "Available" balance for USDT
4. Should now show actual USDT balance from the correct chain
5. Check browser console for detailed logs:
   - `[usePairBalances] Fetching balances`
   - `[usePairBalances] USDT not found in spot balances, checking evm wallet for BTC-USDT pair...`
   - `[usePairBalances] Using USDT from evm chain: X.XX`
   - Or fallback: `[usePairBalances] Using USDT from Tron wallet (fallback): X.XX`

## Benefits
- ✅ Accurate USDT balance display from correct chain
- ✅ Chain-aware USDT fetching based on trading pair
- ✅ Automatic chain detection in components
- ✅ Fallback mechanism for maximum availability
- ✅ No code duplication (single hook handles both desktop and mobile)
- ✅ Better error handling and logging
- ✅ Consistent behavior across all trading interfaces

## Chain Priority
1. **Primary**: Fetch from the chain matching the base asset (BTC→EVM, SOL→SOL)
2. **Fallback**: If primary chain has no USDT, check Tron wallet
3. **Result**: Use the first non-zero USDT balance found

## Future Improvements
- Consider caching balances to reduce API calls
- Add support for other stablecoins (USDC, DAI, etc.)
- Implement balance refresh on trade execution
- Add UI indicator showing which chain's USDT is being used
