# Custom Token Balance Support

## Summary

Added support for fetching balances of custom/unknown tokens directly from the blockchain using their mint/contract addresses. This fixes the issue where tokens like PUMP/USDT would show 0 balance because PUMP isn't in the standard token list.

## Problem

When selecting a custom token pair like PUMP/USDT:
- PUMP isn't recognized as a standard token (SOL, ETH, BTC, USDT, etc.)
- The backend doesn't have PUMP balance data
- Balance shows as 0 even though the user has PUMP tokens
- USDT balance works fine because it's a standard token

## Solution

### 1. New API Route: `/api/users/[userId]/token-balance`

Created a new endpoint that fetches token balances directly from the blockchain:

**Features:**
- Accepts `tokenAddress` (mint/contract address) and `chain` (sol/evm) as query params
- Fetches user's wallet address from backend
- Queries blockchain RPC directly for token balance
- Supports both Solana SPL tokens and EVM ERC20 tokens

**Solana Implementation:**
- Uses `getParsedTokenAccountsByOwner` to get SPL token accounts
- Returns `uiAmount` (human-readable balance)

**EVM Implementation:**
- Uses ethers.js to call ERC20 `balanceOf` and `decimals`
- Formats balance using token decimals

### 2. Updated `usePairBalances` Hook

**New Parameter:**
- Added `tokenAddress?: string` parameter

**New Logic:**
- Added `isStandardToken()` function to check if token is known
- Added `fetchCustomTokenBalance()` function to fetch from blockchain
- Falls back to blockchain fetch if:
  - Token balance is 0 from backend
  - Token is not in standard list
  - `tokenAddress` is provided

**Flow:**
1. Try to fetch from backend (existing behavior)
2. If balance is 0 and token is custom → fetch from blockchain
3. Return blockchain balance

### 3. Updated Components

All trading components now pass `tokenAddress` to the hook:

- **BinanceOrderForm**: `usePairBalances(userId, pair, chain, tokenAddress)`
- **MobileTradingForm**: `usePairBalances(userId, pair, chain, tokenAddress)`
- **MobileTradingModal**: `usePairBalances(userId, pair, chain, tokenAddress)`

### 4. Updated `usePairBalancesQuery` Hook

Also updated the React Query version for consistency:
- Added `tokenAddress` parameter
- Added custom token fetching logic
- Updated query key to include `tokenAddress`

## Standard Tokens List

Tokens that are fetched from backend (no blockchain query needed):
- SOL, SOLANA
- ETH, ETHEREUM
- BTC, BITCOIN
- USDT, USDC
- TRX, TRON

## Example Flow

### Scenario: User selects PUMP/USDT pair

1. **Market List Selection:**
   - User clicks PUMP/USDT
   - `onSelectPair('PUMP-USDT', 'solana', 'PumpMintAddress123...')`
   - Parent stores: `selectedPair='PUMP-USDT'`, `selectedChain='sol'`, `selectedTokenAddress='PumpMintAddress123...'`

2. **Balance Fetching:**
   - Component calls: `usePairBalances(userId, 'PUMP-USDT', 'sol', 'PumpMintAddress123...')`
   - Hook fetches from backend → PUMP balance = 0 (not in backend)
   - Hook detects: PUMP is not standard token + tokenAddress provided
   - Hook calls: `/api/users/${userId}/token-balance?tokenAddress=PumpMintAddress123...&chain=sol`
   - API fetches from Solana RPC → Returns actual PUMP balance
   - USDT balance fetched normally from backend (standard token)

3. **Display:**
   - Shows correct PUMP balance: `1,234.56 PUMP`
   - Shows correct USDT balance: `5,000.00 USDT`

## Benefits

1. **Universal Token Support**: Works with any SPL/ERC20 token
2. **No Backend Changes**: Backend doesn't need to track every token
3. **Real-time Data**: Fetches directly from blockchain
4. **Fallback Logic**: Standard tokens still use fast backend cache
5. **Automatic Detection**: Automatically detects when to use blockchain fetch

## Performance Considerations

- **Standard tokens**: Fast (backend cache)
- **Custom tokens**: Slower (RPC call) but only when needed
- **Caching**: React Query caches results for 30s
- **Optimization**: Only fetches when balance is 0 from backend

## Testing Checklist

- [ ] Select standard token pair (BTC/USDT) → Shows backend balance
- [ ] Select custom token pair (PUMP/USDT) → Shows blockchain balance
- [ ] Verify Solana custom tokens work
- [ ] Verify EVM custom tokens work
- [ ] Check balance updates after trades
- [ ] Verify USDT balance always shows correctly
- [ ] Test with tokens not in wallet (should show 0)
- [ ] Check console logs for debugging info

## API Endpoints

### New Endpoint
```
GET /api/users/[userId]/token-balance
Query: tokenAddress, chain
Response: { success: true, balance: 1234.56, tokenAddress, walletAddress, chain }
```

### Existing Endpoint (still used)
```
GET /api/users/[userId]/balances
Query: assets, chain
Response: { balances: [...] }
```

## Error Handling

- If RPC call fails → Returns 0 balance (graceful degradation)
- If wallet not found → Returns 404 error
- If invalid chain → Returns 400 error
- Logs all errors to console for debugging

## Future Enhancements

1. **Token Metadata**: Fetch token name, symbol, decimals from blockchain
2. **Multi-token Batch**: Fetch multiple custom token balances in one call
3. **WebSocket**: Real-time balance updates for custom tokens
4. **Cache Layer**: Add Redis cache for custom token balances
5. **Token Registry**: Build internal registry of popular custom tokens
