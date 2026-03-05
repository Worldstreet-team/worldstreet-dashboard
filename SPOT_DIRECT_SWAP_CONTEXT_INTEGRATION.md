# Spot Trading Direct SwapContext Integration

## Overview

Refactored `MobileTradingModal` and `BinanceOrderForm` to use `swapContext` directly instead of the `useSpotSwap` hook. This makes spot trading work exactly like the swap system, with client-side signing using PIN-encrypted keys.

## Changes Made

### 1. Removed useSpotSwap Hook

**Before:**
```typescript
import { useSpotSwap } from '@/hooks/useSpotSwap';
const { quote, fetchQuote, executeSpotSwap, loading, executing, error } = useSpotSwap();
```

**After:**
```typescript
import { useSwap, SwapQuote } from '@/app/context/swapContext';
const { getQuote, executeSwap, quoteLoading, executing } = useSwap();
const [quote, setQuote] = useState<SwapQuote | null>(null);
```

### 2. Added Token Metadata

Both components now include token metadata for Li.Fi address resolution:

```typescript
const TOKEN_META: Record<string, Record<string, { address: string; decimals: number }>> = {
  ethereum: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  },
  solana: {
    SOL: { address: '11111111111111111111111111111111', decimals: 9 },
    WSOL: { address: 'So11111111111111111111111111111111111111112', decimals: 9 },
    USDT: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    USDC: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  },
};
```

### 3. Refactored Quote Fetching

**New Implementation:**
```typescript
const handleGetQuote = async () => {
  // Determine chain type
  const chainType = effectiveChain === 'sol' ? 'solana' : 'ethereum';
  const chainMeta = effectiveChain === 'sol' ? TOKEN_META.solana : TOKEN_META.ethereum;
  
  // Get token addresses
  const fromTokenMeta = side === 'buy' ? chainMeta[tokenOut] : chainMeta[tokenIn];
  const toTokenMeta = side === 'buy' ? chainMeta[tokenIn] : chainMeta[tokenOut];
  
  // Get wallet address
  const walletAddress = chainType === 'solana' ? solAddress : evmAddress;
  
  // Convert amount to smallest unit
  const decimals = fromTokenMeta.decimals;
  const [intPart = '0', fracPart = ''] = amount.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
  
  // Call swapContext.getQuote
  const quoteResult = await getQuote({
    fromChain: chainType,
    toChain: chainType,
    fromToken: fromTokenMeta.address,
    toToken: toTokenMeta.address,
    fromAmount: rawAmount,
    fromAddress: walletAddress,
    toAddress: walletAddress,
  });
  
  if (quoteResult) {
    setQuote(quoteResult);
    setShowQuote(true);
  }
};
```

### 4. Refactored Swap Execution

**New Implementation:**
```typescript
const handleConfirmSwap = async (pin: string) => {
  if (!quote) {
    setError('No quote available');
    return;
  }

  // Call swapContext.executeSwap directly
  const txHash = await executeSwap(quote, pin);
  
  setSuccess(`Order executed! TX: ${txHash.slice(0, 10)}...`);
  
  // Save to trade history
  await fetch('/api/spot/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user?.userId,
      pair: selectedPair,
      side,
      txHash,
      chain: effectiveChain,
      fromAmount: amount,
      toAmount: total,
      status: 'COMPLETED',
    }),
  });
  
  // Refetch balances
  await refetchBalances();
  fetchSolBalance();
  fetchEvmBalance();
  refreshSolCustom();
  refreshEvmCustom();
};
```

### 5. Updated Quote Display (MobileTradingModal)

Replaced `SpotQuoteDetails` component with inline display:

```typescript
{quote && (
  <div className="space-y-3">
    <div className="p-3 bg-[#2b3139] rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[#848e9c]">You {side === 'buy' ? 'Pay' : 'Sell'}</span>
        <span className="text-white font-mono">
          {(parseFloat(quote.fromAmount) / Math.pow(10, quote.fromToken.decimals)).toFixed(6)} {quote.fromToken.symbol}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-[#848e9c]">You {side === 'buy' ? 'Receive' : 'Get'}</span>
        <span className="text-white font-mono">
          {(parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toFixed(6)} {quote.toToken.symbol}
        </span>
      </div>
      {quote.toolDetails && (
        <div className="flex justify-between text-xs">
          <span className="text-[#848e9c]">Route</span>
          <span className="text-white">{quote.toolDetails.name}</span>
        </div>
      )}
    </div>
  </div>
)}
```

## Architecture Flow

### Quote Flow
```
User enters amount
  ↓
handleGetQuote()
  ↓
Determine chain (solana/ethereum)
  ↓
Get token addresses from TOKEN_META
  ↓
Get wallet address from context (solAddress/evmAddress)
  ↓
Convert amount to smallest unit (string math)
  ↓
swapContext.getQuote({
  fromChain, toChain,
  fromToken, toToken,
  fromAmount,
  fromAddress, toAddress
})
  ↓
Li.Fi API returns quote
  ↓
setQuote(quoteResult)
  ↓
Show quote to user
```

### Execution Flow
```
User enters PIN
  ↓
handleConfirmSwap(pin)
  ↓
swapContext.executeSwap(quote, pin)
  ↓
getEncryptedKeys(pin) from /api/wallet/keys
  ↓
Decrypt private key with PIN (client-side)
  ↓
For Solana:
  - Create ATA if needed
  - Deserialize transaction from Li.Fi
  - Sign with Keypair
  - Send to Solana RPC
  - Confirm on-chain
  ↓
For Ethereum:
  - Approve ERC20 if needed
  - Sign transaction with ethers.js
  - Send to Ethereum RPC
  - Wait for confirmation
  ↓
Return txHash
  ↓
Save to /api/spot/trades
  ↓
Refetch balances
  ↓
Show success message
```

## Key Benefits

### 1. Consistent Architecture
- Spot trading now uses the exact same flow as the swap system
- No intermediate hooks or backend proxies
- Direct Li.Fi integration

### 2. Client-Side Signing
- Private keys never leave the browser
- PIN decryption happens client-side
- Secure transaction signing

### 3. Simplified Code
- Removed `useSpotSwap` hook complexity
- Removed backend `/api/quote` and `/api/execute-trade` routes
- Direct context usage

### 4. Better Error Handling
- Uses `swapContext.formatSwapError` for consistent error messages
- Proper Solana-specific error handling
- EVM error handling

### 5. Real-Time Execution
- No backend delays
- Direct RPC communication
- Faster transaction submission

## Token Address Mapping

### Ethereum
- ETH: `0x0000000000000000000000000000000000000000` (Native)
- BTC/WBTC: `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` (Wrapped Bitcoin)
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7` (Tether)
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (USD Coin)

### Solana
- SOL: `11111111111111111111111111111111` (Native)
- WSOL: `So11111111111111111111111111111111111111112` (Wrapped SOL)
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (Tether)
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USD Coin)

## Amount Conversion

Uses string manipulation to avoid floating-point precision issues:

```typescript
function toSmallestUnit(amount: string, decimals: number): string {
  const [intPart = '0', fracPart = ''] = amount.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
  return rawAmount;
}
```

Example:
- Input: `"1.5"` USDT (6 decimals)
- Output: `"1500000"` (smallest unit)

## Files Modified

1. `src/components/spot/MobileTradingModal.tsx`
   - Removed `useSpotSwap` hook
   - Added `useSwap` context
   - Added TOKEN_META
   - Refactored quote fetching
   - Refactored execution
   - Updated quote display

2. `src/components/spot/BinanceOrderForm.tsx`
   - Removed `useSpotSwap` hook
   - Added `useSwap` context
   - Added TOKEN_META
   - Refactored quote fetching
   - Refactored execution

## Files No Longer Needed

The following can potentially be removed (but kept for reference):
- `src/hooks/useSpotSwap.ts` - No longer used
- `src/services/spot/executeSpotSwap.ts` - No longer used
- `src/services/spot/quoteService.ts` - No longer used
- `src/services/spot/executionService.ts` - No longer used
- `src/app/api/quote/route.ts` - No longer used
- `src/app/api/execute-trade/route.ts` - No longer used

## Testing Checklist

- [ ] Test BTC-USDT buy on Ethereum (desktop)
- [ ] Test BTC-USDT sell on Ethereum (desktop)
- [ ] Test ETH-USDT buy on Ethereum (desktop)
- [ ] Test ETH-USDT sell on Ethereum (desktop)
- [ ] Test SOL-USDT buy on Solana (desktop)
- [ ] Test SOL-USDT sell on Solana (desktop)
- [ ] Test BTC-USDT buy on Ethereum (mobile)
- [ ] Test BTC-USDT sell on Ethereum (mobile)
- [ ] Test SOL-USDT buy on Solana (mobile)
- [ ] Test SOL-USDT sell on Solana (mobile)
- [ ] Verify PIN decryption works
- [ ] Verify transaction signing works
- [ ] Verify balance refresh after trade
- [ ] Verify trade history saving
- [ ] Verify error handling
- [ ] Verify quote display
- [ ] Verify ATA creation for Solana tokens

## Security Notes

1. **PIN Verification**: PIN is verified by attempting to decrypt the private key
2. **Client-Side Decryption**: Private keys are decrypted in the browser, never sent to backend
3. **Secure Storage**: Encrypted keys are stored in MongoDB
4. **No Backend Signing**: All transaction signing happens client-side
5. **RPC Direct**: Transactions are sent directly to blockchain RPCs

## Performance Improvements

1. **No Backend Proxy**: Direct Li.Fi API calls from browser
2. **Faster Execution**: No backend processing delays
3. **Real-Time Quotes**: Immediate quote fetching
4. **Parallel Operations**: Balance refresh happens in parallel

## Future Enhancements

1. Add support for more tokens (expand TOKEN_META)
2. Add slippage tolerance UI control
3. Add transaction simulation preview
4. Add gas estimation display
5. Add multi-hop route visualization
6. Add price impact warnings
7. Add MEV protection options
