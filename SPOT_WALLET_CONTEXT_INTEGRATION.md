# Spot Trading Wallet Context Integration

## Overview

Updated the spot trading components to use wallet contexts directly (`useSolana`, `useEvm`, `useWallet`) in addition to the `usePairBalances` hook. This ensures wallet addresses are always available for quote fetching and transaction execution, even when balance fetching encounters errors.

## Changes Made

### 1. MobileTradingModal.tsx

**Added Imports:**
```typescript
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';
import { useWallet } from '@/app/context/walletContext';
```

**Added Wallet Context Hooks:**
```typescript
const { address: solAddress, balance: solBalance, fetchBalance: fetchSolBalance, refreshCustomTokens: refreshSolCustom } = useSolana();
const { address: evmAddress, balance: ethBalance, fetchBalance: fetchEvmBalance, refreshCustomTokens: refreshEvmCustom } = useEvm();
const { walletsGenerated } = useWallet();
```

**Updated Balance Refresh:**
```typescript
// After successful swap execution
await refetchBalances();      // usePairBalances hook
fetchSolBalance();            // Solana context
fetchEvmBalance();            // EVM context
refreshSolCustom();           // Solana custom tokens
refreshEvmCustom();           // EVM custom tokens
```

### 2. BinanceOrderForm.tsx

**Added Imports:**
```typescript
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';
import { useWallet } from '@/app/context/walletContext';
```

**Added Wallet Context Hooks:**
```typescript
const { address: solAddress, balance: solBalance, fetchBalance: fetchSolBalance, refreshCustomTokens: refreshSolCustom } = useSolana();
const { address: evmAddress, balance: ethBalance, fetchBalance: fetchEvmBalance, refreshCustomTokens: refreshEvmCustom } = useEvm();
const { walletsGenerated } = useWallet();
```

**Updated Balance Refresh:**
```typescript
// After successful swap execution
await refetchBalances();      // usePairBalances hook
fetchSolBalance();            // Solana context
fetchEvmBalance();            // EVM context
refreshSolCustom();           // Solana custom tokens
refreshEvmCustom();           // EVM custom tokens
```

### 3. MobileTradingForm.tsx

**Added Imports:**
```typescript
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';
import { useWallet } from '@/app/context/walletContext';
```

**Added Wallet Context Hooks:**
```typescript
const { address: solAddress, fetchBalance: fetchSolBalance, refreshCustomTokens: refreshSolCustom } = useSolana();
const { address: evmAddress, fetchBalance: fetchEvmBalance, refreshCustomTokens: refreshEvmCustom } = useEvm();
const { walletsGenerated } = useWallet();
```

**Added Wallet Validation:**
```typescript
if (!walletsGenerated) {
  setError('Please set up your wallet PIN first');
  return;
}
```

**Updated Balance Refresh:**
```typescript
// After successful trade
fetchSolBalance();
fetchEvmBalance();
refreshSolCustom();
refreshEvmCustom();
```

## Benefits

### 1. Redundant Wallet Address Access
- Components now have direct access to wallet addresses via contexts
- If `usePairBalances` fails, wallet addresses are still available
- Ensures quote fetching can proceed even with balance errors

### 2. Comprehensive Balance Refresh
- Refreshes both `usePairBalances` data and wallet context data
- Updates native balances (SOL, ETH)
- Updates custom token balances
- Ensures UI reflects latest state after trades

### 3. Better Error Handling
- Wallet setup validation using `walletsGenerated`
- Clear error messages when wallets aren't configured
- Graceful degradation if balance fetching fails

### 4. Consistent with Swap System
- Matches the pattern used in `SwapInterface.tsx`
- Uses the same wallet contexts for address retrieval
- Maintains architectural consistency across the app

## Data Flow

### Before Trade Execution
```
Component
  ├─ usePairBalances → Fetch balances (may fail)
  ├─ useSolana → Get SOL address (always available)
  ├─ useEvm → Get EVM address (always available)
  └─ useWallet → Check if wallets generated
```

### During Quote Fetching
```
useSpotSwap.fetchQuote()
  ├─ Get wallet address from contexts (fallback if usePairBalances fails)
  ├─ Call /api/quote with address
  └─ Return quote
```

### After Trade Execution
```
Component
  ├─ refetchBalances() → usePairBalances
  ├─ fetchSolBalance() → useSolana
  ├─ fetchEvmBalance() → useEvm
  ├─ refreshSolCustom() → useSolana
  └─ refreshEvmCustom() → useEvm
```

## Wallet Address Resolution

The `useSpotSwap` hook already has logic to get wallet addresses:

```typescript
// From useSpotSwap.ts
const { addresses } = useWallet();

const walletAddress = chain === 'solana' 
  ? addresses?.solana 
  : addresses?.ethereum;

if (!walletAddress) {
  throw new Error(`Wallet not set up for ${chain}...`);
}
```

Now the components also have direct access via:
- `solAddress` from `useSolana()`
- `evmAddress` from `useEvm()`

This provides redundancy and ensures addresses are always available.

## Testing Checklist

- [ ] Test BTC-USDT buy/sell on desktop
- [ ] Test ETH-USDT buy/sell on desktop
- [ ] Test SOL-USDT buy/sell on desktop
- [ ] Test BTC-USDT buy/sell on mobile
- [ ] Test ETH-USDT buy/sell on mobile
- [ ] Test SOL-USDT buy/sell on mobile
- [ ] Verify balance refresh after successful trade
- [ ] Verify error handling when wallet not set up
- [ ] Verify graceful degradation if balance fetch fails
- [ ] Verify quote fetching works with wallet contexts

## Related Files

- `src/components/spot/MobileTradingModal.tsx` - Mobile trading modal
- `src/components/spot/BinanceOrderForm.tsx` - Desktop trading form
- `src/components/spot/MobileTradingForm.tsx` - Simple mobile form
- `src/hooks/useSpotSwap.ts` - Spot swap execution hook
- `src/app/context/solanaContext.tsx` - Solana wallet context
- `src/app/context/evmContext.tsx` - EVM wallet context
- `src/app/context/walletContext.tsx` - Wallet management context
- `src/components/swap/SwapInterface.tsx` - Reference implementation

## Notes

1. **No Breaking Changes**: The `usePairBalances` hook is still used for balance display
2. **Additive Changes**: Wallet contexts are added alongside existing hooks
3. **Consistent Pattern**: Matches the swap system's approach
4. **Better UX**: Users can still get quotes even if balance fetching fails
5. **Comprehensive Refresh**: All balance sources are updated after trades

## Future Improvements

1. Consider consolidating balance fetching into a single hook
2. Add retry logic for failed balance fetches
3. Implement optimistic UI updates for better perceived performance
4. Add balance caching to reduce API calls
5. Consider WebSocket connections for real-time balance updates
