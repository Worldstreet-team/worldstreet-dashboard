# Backend Balance Integration

## Overview

The spot trading system now fetches real-time blockchain balances directly from the backend API, which uses RPC calls to get accurate on-chain data. This replaces the previous MongoDB-based balance system.

## Architecture

```
Frontend Component (BinanceOrderForm, MobileTradingModal)
    ↓
usePairBalances Hook
    ↓
Next.js API Route (/api/users/[userId]/balances)
    ↓
Backend API (https://trading.watchup.site/api/users/:userId/balances)
    ↓
MySQL Database (user_wallets table)
    ↓
RPC Providers (Alchemy for ETH/SOL, TronWeb for TRC)
    ↓
Real-time On-Chain Balances
```

## Backend API Endpoint

### GET /api/users/:userId/balances

Returns real-time blockchain balances for all user wallets.

**Response Structure:**
```json
[
  {
    "asset": "ETH",
    "chain": "evm",
    "available_balance": "1.234567",
    "locked_balance": "0",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  {
    "asset": "USDT",
    "chain": "evm",
    "available_balance": "1000.500000",
    "locked_balance": "0",
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  },
  {
    "asset": "SOL",
    "chain": "sol",
    "available_balance": "5.123456789",
    "locked_balance": "0",
    "tokenAddress": "11111111111111111111111111111111"
  },
  {
    "asset": "USDT",
    "chain": "sol",
    "available_balance": "500.000000",
    "locked_balance": "0",
    "tokenAddress": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  },
  {
    "asset": "TRX",
    "chain": "trc",
    "available_balance": "100.000000",
    "locked_balance": "0",
    "tokenAddress": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
  },
  {
    "asset": "USDT",
    "chain": "trc",
    "available_balance": "250.000000",
    "locked_balance": "0",
    "tokenAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
  }
]
```

## How It Works

### 1. Backend Fetches Wallets from MySQL

```sql
SELECT asset, chain, public_address 
FROM user_wallets 
WHERE user_id = ?
```

### 2. Backend Queries RPC for Each Wallet

**Ethereum (EVM):**
- Native ETH: `ethers.JsonRpcProvider.getBalance(address)`
- ERC-20 Tokens: `contract.balanceOf(address)` via Alchemy RPC

**Solana:**
- Native SOL: `Connection.getBalance(publicKey)`
- SPL Tokens: `Connection.getParsedAccountInfo(ata)` for Associated Token Account

**Tron:**
- Native TRX: `tronWeb.trx.getBalance(address)`
- TRC-20 Tokens: `contract.balanceOf(address).call()`

### 3. Backend Returns Real-Time Balances

All balances are fetched in real-time from blockchain RPCs, ensuring accuracy.

## Next.js API Route

**File:** `src/app/api/users/[userId]/balances/route.ts`

```typescript
export async function GET(request, { params }) {
  // 1. Authenticate user via Clerk
  const { userId: clerkUserId } = await auth();
  
  // 2. Verify authorization
  if (clerkUserId !== params.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 3. Fetch from backend
  const response = await fetch(
    `${BACKEND_URL}/api/users/${params.userId}/balances`
  );
  
  // 4. Return balances
  const balances = await response.json();
  return NextResponse.json({ balances });
}
```

## usePairBalances Hook

**File:** `src/hooks/usePairBalances.ts`

### Key Features

1. **Fetches ALL balances** from backend (no query parameters needed)
2. **Filters client-side** to find the correct assets and chains
3. **Chain-aware USDT matching** - uses correct USDT based on trading pair
4. **Fallback logic** - tries Tron USDT if primary chain USDT not found

### Chain Mapping Logic

```typescript
const getUSDTChain = (baseAsset: string): 'tron' | 'evm' | 'sol' => {
  const asset = baseAsset.toUpperCase();
  
  if (asset === 'ETH' || asset === 'BTC') {
    return 'evm'; // Ethereum USDT for ETH and BTC pairs
  } else if (asset === 'SOL') {
    return 'sol'; // Solana USDT for SOL pairs
  }
  
  return 'tron'; // Default to Tron USDT
};
```

### Usage Example

```typescript
const { tokenIn, tokenOut, loading, error, refetch } = usePairBalances(
  user?.userId,
  'BTC-USDT',  // Trading pair
  'evm'        // Chain for base asset
);

// tokenIn = BTC balance on EVM chain
// tokenOut = USDT balance on EVM chain (matches BTC's chain)
```

## Trading Flow with Backend Balances

### 1. User Opens Trading Form

```typescript
// BinanceOrderForm.tsx
const { tokenIn: baseBalance, tokenOut: quoteBalance } = usePairBalances(
  user?.userId,
  selectedPair,  // e.g., "SOL-USDT"
  chain          // e.g., "sol"
);

// For SOL-USDT on Solana:
// baseBalance = SOL balance on Solana chain
// quoteBalance = USDT balance on Solana chain
```

### 2. Hook Fetches Balances

```typescript
// 1. Call Next.js API route
const response = await fetch(`/api/users/${userId}/balances`);

// 2. Backend returns ALL balances with real-time RPC data
const balances = [
  { asset: 'SOL', chain: 'sol', available_balance: '5.123' },
  { asset: 'USDT', chain: 'sol', available_balance: '500.00' },
  { asset: 'ETH', chain: 'evm', available_balance: '1.234' },
  { asset: 'USDT', chain: 'evm', available_balance: '1000.00' },
  // ... more balances
];

// 3. Filter for SOL on Solana chain
const solBalance = balances.find(
  b => b.asset === 'SOL' && b.chain === 'sol'
);

// 4. Filter for USDT on Solana chain (matches SOL's chain)
const usdtBalance = balances.find(
  b => b.asset === 'USDT' && b.chain === 'sol'
);
```

### 3. Display Balances in UI

```typescript
// Available balance shows correct chain-specific balance
<span>
  {baseBalance.toFixed(6)} {tokenIn}
</span>

// For SOL-USDT: Shows Solana SOL and Solana USDT
// For BTC-USDT: Shows EVM BTC and EVM USDT
// For ETH-USDT: Shows EVM ETH and EVM USDT
```

## Chain-Specific USDT Handling

### Problem

USDT exists on multiple chains:
- Ethereum (ERC-20): `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- Solana (SPL): `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- Tron (TRC-20): `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`

### Solution

The hook automatically selects the correct USDT based on the trading pair:

```typescript
// Trading BTC-USDT (BTC is on Ethereum)
// → Uses Ethereum USDT

// Trading SOL-USDT (SOL is on Solana)
// → Uses Solana USDT

// Trading ETH-USDT (ETH is on Ethereum)
// → Uses Ethereum USDT
```

### Fallback Logic

If the expected USDT is not found:

1. Try Tron USDT (via `/api/tron/balance`)
2. Try any USDT balance as last resort
3. Return 0 if no USDT found

```typescript
if (quoteAsset === 'USDT' && tokenOutValue === 0) {
  // Try Tron fallback
  const tronUSDT = await fetchTronUSDT();
  if (tronUSDT > 0) {
    tokenOutValue = tronUSDT;
  } else {
    // Try any USDT
    const anyUSDT = balances.find(b => b.asset === 'USDT');
    if (anyUSDT) {
      tokenOutValue = parseFloat(anyUSDT.available_balance);
    }
  }
}
```

## Token Addresses

The backend returns `tokenAddress` for each balance, which is used for:

1. **Native tokens:** Public wallet address
2. **ERC-20 tokens:** Contract address (e.g., USDT contract)
3. **SPL tokens:** Associated Token Account (ATA) address
4. **TRC-20 tokens:** Contract address

### Example

```json
{
  "asset": "USDT",
  "chain": "sol",
  "available_balance": "500.000000",
  "tokenAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

The `tokenAddress` is the user's ATA for USDT on Solana, not the mint address.

## Benefits of Backend Balance System

### 1. Real-Time Accuracy
- Balances fetched directly from blockchain via RPC
- No stale data from database
- Reflects actual on-chain state

### 2. Multi-Chain Support
- Supports Ethereum, Solana, and Tron
- Handles native tokens and wrapped tokens
- Correct token addresses for each chain

### 3. Simplified Frontend
- No need to manage RPC connections in frontend
- No need to store private keys in frontend
- Single API call gets all balances

### 4. Security
- Private keys never leave backend
- RPC calls made from secure backend environment
- User can only access their own balances

### 5. Performance
- Backend caches RPC responses
- Parallel RPC calls for multiple wallets
- Efficient token address resolution

## Error Handling

### No Wallets Found

```json
{
  "error": "No wallets found for this user."
}
```

**Frontend Response:** Shows 0 balance for all assets

### RPC Error

If RPC fails for a specific wallet, backend returns `"0"` for that balance and logs warning.

**Frontend Response:** Shows 0 balance for that asset

### Network Error

```json
{
  "error": "Failed to fetch balances from backend",
  "details": "Network timeout"
}
```

**Frontend Response:** Shows error message and 0 balances

## Debugging

### Enable Logging

The hook includes extensive console logging:

```typescript
console.log('[usePairBalances] Fetching balances:', { 
  userId, 
  baseAsset, 
  quoteAsset, 
  chain 
});

console.log('[usePairBalances] API Response:', data);

console.log('[usePairBalances] Base asset balance:', { 
  baseAsset, 
  chain,
  balance: baseBalance, 
  value: tokenInValue,
  allAssets: balances.map(b => `${b.asset}(${b.chain})`)
});
```

### Check Backend Logs

Backend logs RPC calls and errors:

```
[Backend] Fetching balance for ETH on evm (0x123...)
[Backend] ETH balance: 1.234567
[Backend] Fetching balance for USDT on evm (0x123...)
[Backend] USDT balance: 1000.500000
```

## Migration from Old System

### Before (MongoDB)

```typescript
// Balances stored in MongoDB
// Updated manually after trades
// Could be stale or inaccurate

const balance = await SpotBalance.findOne({ 
  userId, 
  asset: 'USDT' 
});
```

### After (Backend RPC)

```typescript
// Balances fetched from blockchain
// Always real-time and accurate
// No manual updates needed

const response = await fetch(`/api/users/${userId}/balances`);
const balances = await response.json();
```

## Summary

The backend balance integration provides:

1. **Real-time accuracy** via RPC calls
2. **Multi-chain support** for ETH, SOL, TRC
3. **Chain-aware USDT** matching
4. **Secure architecture** with backend-only RPC access
5. **Simplified frontend** with single API call
6. **Automatic fallbacks** for missing balances

All spot trading components now use accurate, real-time blockchain balances from the backend API.
