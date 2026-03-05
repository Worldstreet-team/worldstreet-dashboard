# Chain-Aware Trading Fix

## Problem
When users selected a trading pair from the market list, the trading components (BinanceOrderForm and MobileTradingModal) were unaware of which blockchain the pair was on. This caused issues with USDT selection:
- SOL-USDT should use Solana USDT
- ETH-USDT should use Ethereum USDT
- BTC-USDT should use Ethereum USDT (wrapped BTC)

## Solution
Implemented proper chain tracking and propagation from market selection to trading execution.

## Changes Made

### 1. BinanceMarketList.tsx
- **Updated**: `onSelectPair` callback now passes the `chain` parameter
- Markets already had chain information in their data structure
- Now properly passes chain when user clicks on a market

```typescript
onClick={() => onSelectPair(market.symbol, market.chain)}
```

### 2. binance-page.tsx (Parent Component)
- **Added**: `selectedChain` state to track the chain of the currently selected pair
- **Updated**: `handleSelectPair` function to:
  - Accept chain parameter from market list
  - Map chain types: 'solana' → 'sol', 'ethereum' → 'evm', 'bitcoin' → 'evm'
  - Store chain in state for use by child components
  - Fallback logic if chain is not provided

```typescript
const [selectedChain, setSelectedChain] = useState<string>('evm');

const handleSelectPair = (pair: string, chain?: 'solana' | 'ethereum' | 'bitcoin') => {
  // Map chain to format expected by trading components
  if (chain === 'solana') {
    setSelectedChain('sol');
  } else if (chain === 'ethereum') {
    setSelectedChain('evm');
  } else if (chain === 'bitcoin') {
    setSelectedChain('evm'); // Bitcoin uses wrapped BTC on Ethereum
  }
  // ... rest of logic
}
```

- **Updated**: Pass `chain={selectedChain}` prop to:
  - `BinanceOrderForm`
  - `MobileTradingModal`

### 3. BinanceOrderForm.tsx
- **Changed**: `chain` prop from optional to required
- **Removed**: `getChainForPair` fallback function (no longer needed)
- **Simplified**: Use `chain` prop directly as `effectiveChain`
- **Added**: Enhanced debug logging to show which USDT is being used

```typescript
interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain: string; // Required: 'sol' or 'evm'
}

const effectiveChain = chain; // Direct usage, no fallback needed
```

### 4. MobileTradingModal.tsx
- **Changed**: `chain` prop from optional to required
- **Removed**: `getChainForPair` fallback function
- **Simplified**: Use `chain` prop directly as `effectiveChain`
- **Added**: Enhanced debug logging to show which USDT is being used

## Chain Mapping Logic

### Market List → Parent Component
- `solana` → `'sol'`
- `ethereum` → `'evm'`
- `bitcoin` → `'evm'` (wrapped BTC on Ethereum)

### Parent Component → Trading Components
- Passes `'sol'` or `'evm'` as the `chain` prop

### Trading Components → Token Selection
- `'sol'` → Uses Solana USDT (`Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`)
- `'evm'` → Uses Ethereum USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`)

## Token Metadata Reference

```typescript
const TOKEN_META = {
  ethereum: {
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    // ... other tokens
  },
  solana: {
    USDT: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    // ... other tokens
  }
};
```

## Debug Logging
Both trading components now log:
- Selected pair
- Effective chain
- Which USDT is being used (Solana USDT vs Ethereum USDT)
- Token chain information

Check browser console for logs like:
```
[BinanceOrderForm] Chain Mapping: {
  selectedPair: "SOL-USDT",
  effectiveChain: "sol",
  usdtChain: "Solana USDT",
  tokenInChain: "Solana"
}
```

## Testing
1. Select SOL-USDT from market list → Should use Solana USDT
2. Select ETH-USDT from market list → Should use Ethereum USDT
3. Select BTC-USDT from market list → Should use Ethereum USDT (wrapped BTC)
4. Check console logs to verify correct chain is being used
5. Verify balance displays show correct USDT balance for the chain

## Benefits
- ✅ Correct USDT token used based on pair's blockchain
- ✅ No more guessing chain from pair name
- ✅ Explicit chain tracking throughout component tree
- ✅ Better debugging with enhanced logging
- ✅ Cleaner code without fallback logic
- ✅ Type-safe chain propagation
