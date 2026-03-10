# Wallet Integration Summary

## Overview
This document explains how to access wallet data (addresses and encrypted keys) from MongoDB and use them to fetch balances and sign transactions across your application.

## Architecture

### 1. Data Flow
```
MongoDB (User Document)
    ↓
WalletContext (fetches addresses)
    ↓
SolanaContext / EvmContext (manages balances)
    ↓
useUsdtBalance Hook / API Routes (specific operations)
    ↓
Components (display & interact)
```

### 2. Key Components

#### WalletContext (`src/app/context/walletContext.tsx`)
- **Purpose**: Manages wallet addresses and encrypted keys from MongoDB
- **Fetches from**: `/api/wallet/setup` (gets addresses from authenticated user's MongoDB document)
- **Provides**:
  - `addresses`: WalletAddresses (solana, ethereum, bitcoin, tron)
  - `getEncryptedKeys(pin)`: Retrieves encrypted private keys after PIN verification
  - `walletsGenerated`: Boolean flag for wallet setup status

#### SolanaContext (`src/app/context/solanaContext.tsx`)
- **Purpose**: Manages Solana-specific balance and transaction operations
- **Uses**: Wallet address from WalletContext
- **Provides**:
  - `getUsdtBalance()`: Returns USDT balance from loaded token balances
  - `sendTransaction()`: Send SOL (requires encrypted key + PIN)
  - `sendTokenTransaction()`: Send SPL tokens (requires encrypted key + PIN)

#### API Routes
- `/api/solana/usdt-balance`: Fetch USDT balance from MongoDB wallet address
- `/api/wallet/setup`: Get wallet addresses from MongoDB
- `/api/wallet/keys`: Get encrypted keys (requires PIN verification)

#### Hooks
- `useUsdtBalance()`: Standalone hook to fetch USDT balance via API
- `useSolana()`: Access Solana context for balance and transactions

---

## How to Use

### Method 1: Get USDT Balance (Standalone Hook)

**Best for**: Independent balance checks from any page

```tsx
import { useUsdtBalance } from "@/hooks/useUsdtBalance";

export function MyComponent() {
  const { balance, loading, error, refetch } = useUsdtBalance();
  
  return (
    <div>
      <p>USDT Balance: {balance.toFixed(2)}</p>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**How it works**:
1. Hook calls `/api/solana/usdt-balance` on mount
2. API fetches authenticated user from session
3. API retrieves wallet address from MongoDB
4. API queries Solana RPC for USDT token balance
5. Returns balance to component

---

### Method 2: Get USDT Balance (From Context)

**Best for**: When you already have token balances loaded

```tsx
import { useSolana } from "@/app/context/solanaContext";

export function MyComponent() {
  const { getUsdtBalance, loading } = useSolana();
  const balance = getUsdtBalance();
  
  return (
    <div>
      <p>USDT Balance: {balance.toFixed(2)}</p>
      {loading && <p>Loading...</p>}
    </div>
  );
}
```

**How it works**:
1. SolanaContext already has `tokenBalances` loaded
2. `getUsdtBalance()` searches for USDT mint in token balances
3. Returns balance instantly (no API call)

---

### Method 3: Send USDT Transaction

**Best for**: Transferring USDT tokens

```tsx
import { useSolana } from "@/app/context/solanaContext";
import { useWallet } from "@/app/context/walletContext";

export function SendUsdtComponent() {
  const { sendTokenTransaction, loading } = useSolana();
  const { getEncryptedKeys } = useWallet();
  
  const handleSend = async (recipient: string, amount: number, pin: string) => {
    try {
      // Get encrypted keys from MongoDB (requires PIN)
      const keys = await getEncryptedKeys(pin);
      
      if (!keys?.solana) {
        throw new Error("Solana wallet not found");
      }
      
      // Send USDT token
      const txHash = await sendTokenTransaction(
        keys.solana.encryptedPrivateKey,
        pin,
        recipient,
        amount,
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT mint
        6 // USDT decimals
      );
      
      console.log("Transaction sent:", txHash);
    } catch (error) {
      console.error("Send failed:", error);
    }
  };
  
  return (
    <button 
      onClick={() => handleSend("recipient_address", 100, "1234")}
      disabled={loading}
    >
      {loading ? "Sending..." : "Send USDT"}
    </button>
  );
}
```

**How it works**:
1. User enters PIN
2. `getEncryptedKeys(pin)` calls `/api/wallet/keys`
3. API verifies PIN and retrieves encrypted keys from MongoDB
4. Encrypted key is decrypted with PIN (client-side)
5. Transaction is signed and sent to Solana
6. Balance is refreshed

---

## MongoDB Data Structure

Your User document should have this structure:

```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  wallets: {
    solana: {
      address: "So11111111111111111111111111111111111111112",
      encryptedPrivateKey: "encrypted_base64_string"
    },
    ethereum: {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE",
      encryptedPrivateKey: "encrypted_base64_string"
    },
    bitcoin: {
      address: "1A1z7agoat5...",
      encryptedPrivateKey: "encrypted_base64_string"
    },
    tron: {
      address: "TN3W4H6rK...",
      encryptedPrivateKey: "encrypted_base64_string"
    }
  },
  pinHash: "hashed_pin_for_verification"
}
```

---

## API Routes Reference

### GET `/api/solana/usdt-balance`
Fetch USDT balance for authenticated user

**Response**:
```json
{
  "success": true,
  "balance": 1234.56,
  "address": "So11111111111111111111111111111111111111112",
  "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "decimals": 6
}
```

### GET `/api/wallet/setup`
Get wallet addresses for authenticated user

**Response**:
```json
{
  "success": true,
  "walletsGenerated": true,
  "wallets": {
    "solana": { "address": "..." },
    "ethereum": { "address": "..." },
    "bitcoin": { "address": "..." },
    "tron": { "address": "..." }
  }
}
```

### POST `/api/wallet/keys`
Get encrypted keys (requires PIN verification)

**Request**:
```json
{
  "pin": "1234"
}
```

**Response**:
```json
{
  "success": true,
  "wallets": {
    "solana": {
      "address": "...",
      "encryptedPrivateKey": "..."
    },
    "ethereum": { ... },
    "bitcoin": { ... },
    "tron": { ... }
  }
}
```

---

## Security Considerations

1. **Encrypted Keys**: Private keys are stored encrypted in MongoDB
2. **PIN Verification**: Keys only decrypted after PIN verification
3. **Client-Side Decryption**: Decryption happens in browser, not on server
4. **Session-Based**: All operations require authenticated session
5. **No Key Exposure**: Keys never logged or exposed in responses

---

## Usage Examples by Page

### Dashboard Page
```tsx
import { useUsdtBalance } from "@/hooks/useUsdtBalance";

export default function Dashboard() {
  const { balance } = useUsdtBalance();
  
  return <div>Your USDT: {balance.toFixed(2)}</div>;
}
```

### Trading Page
```tsx
import { useSolana } from "@/app/context/solanaContext";
import { useWallet } from "@/app/context/walletContext";

export default function Trading() {
  const { getUsdtBalance } = useSolana();
  const { getEncryptedKeys } = useWallet();
  
  const balance = getUsdtBalance();
  
  const handleTrade = async (pin: string) => {
    const keys = await getEncryptedKeys(pin);
    // Execute trade with keys
  };
  
  return <div>Balance: {balance}</div>;
}
```

### Portfolio Page
```tsx
import { useUsdtBalance } from "@/hooks/useUsdtBalance";

export default function Portfolio() {
  const { balance, refetch } = useUsdtBalance(true, 30000); // Auto-refresh every 30s
  
  return (
    <div>
      <p>USDT: {balance}</p>
      <button onClick={refetch}>Refresh Now</button>
    </div>
  );
}
```

---

## Troubleshooting

### Balance shows 0
- Check wallet address is correct in MongoDB
- Verify USDT token account exists on Solana
- Check RPC endpoint is working

### "Unauthorized" error
- Ensure user is authenticated (session exists)
- Check cookies are being sent with requests

### PIN verification fails
- Verify PIN matches what was set during wallet creation
- Check PIN hash in MongoDB is correct

### Transaction fails
- Verify recipient address is valid
- Check account has sufficient balance
- Ensure SOL balance for transaction fees

---

## Next Steps

1. Ensure MongoDB User model has `wallets` field with encrypted keys
2. Verify `/api/wallet/setup` and `/api/wallet/keys` routes are working
3. Test `useUsdtBalance` hook on a test page
4. Integrate into your trading/portfolio pages
5. Add error handling and user feedback
