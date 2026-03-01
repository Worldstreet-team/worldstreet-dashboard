# Tron External API Integration

## Overview
The Tron integration now uses external APIs from `trading.watchup.site` for wallet generation and balance fetching.

---

## External APIs Used

### 1. Wallet Generation
**Endpoint**: `POST https://trading.watchup.site/api/generate-wallet`

**Request**:
```json
{
  "chain": "trc"
}
```

**Response**:
```json
{
  "success": true,
  "chain": "trc",
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "privateKey": "7A540C8C02D097B533445537B77C4DB9741365F282A1D477C20EB7801A4C8B48",
  "hexAddress": "41C8834F6C4B8B3D67E8FCB2D2E8B5A6F1234567890ABCDEF",
  "publicKey": "04a1b2c3d4e5f6...",
  "network": "TRON"
}
```

**Used By**: `/api/wallet/add-tron` endpoint

---

### 2. Balance Fetching
**Endpoint**: `GET https://trading.watchup.site/api/tron/balance/:address`

**Example**: `GET https://trading.watchup.site/api/tron/balance/TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu`

**Response**:
```json
{
  "success": true,
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "balance": {
    "trx": "100.5",
    "sun": "100500000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

**Used By**: `TronContext.fetchBalance()` function

---

## Implementation Details

### 1. Wallet Generation Flow

```
User clicks "Generate Tron Wallet"
    ↓
POST /api/wallet/add-tron (with PIN)
    ↓
Verify PIN
    ↓
POST https://trading.watchup.site/api/generate-wallet
    Body: { "chain": "trc" }
    ↓
Receive wallet data
    ↓
Encrypt private key with PIN
    ↓
Save to MongoDB
    ↓
Return success
```

**File**: `src/app/api/wallet/add-tron/route.ts`

---

### 2. Balance Fetching Flow

```
Assets page loads
    ↓
TronContext.fetchBalance(address)
    ↓
GET https://trading.watchup.site/api/tron/balance/:address
    ↓
Parse response
    ↓
Set TRX balance
    ↓
Fetch TRC20 token balances (using TronWeb)
    ↓
Display in UI
```

**File**: `src/app/context/tronContext.tsx`

---

## Environment Variables

### Required Variables

```bash
# .env.local

# Wallet generation service
WALLET_SERVICE_URL=https://trading.watchup.site/api/generate-wallet

# Balance fetching service
NEXT_PUBLIC_TRON_BALANCE_API=https://trading.watchup.site/api/tron/balance

# Tron RPC (for token balances and transactions)
NEXT_PUBLIC_TRON_RPC=https://tron-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## Code Changes

### 1. TronContext Balance Fetching

**Before** (Local TronWeb):
```typescript
const trxBalance = await tronWeb.trx.getBalance(target);
setBalance(trxBalance / 1_000_000);
```

**After** (External API):
```typescript
const response = await fetch(`${TRON_BALANCE_API}/${target}`);
const data = await response.json();
const trxBalance = parseFloat(data.balance?.trx || "0");
setBalance(trxBalance);
```

---

### 2. Wallet Generation

**Before** (Local generation):
```typescript
const { generateTronWallet } = await import("@/lib/wallet/tronWallet");
const tronWallet = await generateTronWallet(pin);
```

**After** (External API):
```typescript
const walletResponse = await fetch(WALLET_SERVICE_URL, {
  method: "POST",
  body: JSON.stringify({ chain: "trc" }),
});
const walletData = await walletResponse.json();
const encryptedPrivateKey = encryptWithPIN(walletData.privateKey, pin);
```

---

## Benefits

### 1. Centralized Wallet Generation
- Single source of truth for wallet generation
- Consistent across all services
- Easier to maintain and update

### 2. Reliable Balance Fetching
- Dedicated balance service
- Better error handling
- Consistent response format

### 3. Reduced Client Dependencies
- Less TronWeb usage on client
- Faster page loads
- Better performance

---

## Token Balance Fetching

**Note**: TRC20 token balances are still fetched using TronWeb directly because the external API only returns TRX balance.

**Current Implementation**:
1. Fetch TRX balance from external API
2. Fetch TRC20 token balances using TronWeb
3. Combine results and display

**Future Enhancement**:
If the external API adds token balance support, we can remove TronWeb dependency entirely for balance fetching.

---

## Error Handling

### Balance API Errors

```typescript
try {
  const response = await fetch(`${TRON_BALANCE_API}/${target}`);
  
  if (!response.ok) {
    console.error("Failed to fetch Tron balance:", response.statusText);
    return;
  }

  const data = await response.json();

  if (!data.success) {
    console.error("Tron balance API error:", data.message);
    return;
  }

  // Use balance
  const trxBalance = parseFloat(data.balance?.trx || "0");
  setBalance(trxBalance);
} catch (err) {
  console.error("Balance fetch error:", err);
}
```

### Wallet Generation Errors

```typescript
try {
  const walletResponse = await fetch(WALLET_SERVICE_URL, {
    method: "POST",
    body: JSON.stringify({ chain: "trc" }),
  });

  if (!walletResponse.ok) {
    throw new Error("Failed to generate wallet from external service");
  }

  const walletData = await walletResponse.json();

  if (!walletData.success || !walletData.address || !walletData.privateKey) {
    throw new Error("Invalid response from wallet generation service");
  }

  // Use wallet data
} catch (error) {
  console.error("Wallet generation error:", error);
  throw error;
}
```

---

## Testing

### 1. Test Balance Fetching

```bash
# Test external API directly
curl https://trading.watchup.site/api/tron/balance/TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu

# Expected response
{
  "success": true,
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "balance": {
    "trx": "100.5",
    "sun": "100500000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

### 2. Test Wallet Generation

```bash
# Test external API directly
curl -X POST https://trading.watchup.site/api/generate-wallet \
  -H "Content-Type: application/json" \
  -d '{"chain": "trc"}'

# Expected response
{
  "success": true,
  "chain": "trc",
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "privateKey": "7A540C8C02D097B533445537B77C4DB9741365F282A1D477C20EB7801A4C8B48",
  ...
}
```

### 3. Test in Application

**Balance Fetching**:
1. Navigate to Assets page
2. Check if TRX balance displays correctly
3. Verify balance updates on refresh

**Wallet Generation**:
1. Navigate to Assets page (without Tron wallet)
2. Click "Generate Tron Wallet"
3. Enter PIN
4. Verify wallet is created
5. Check balance appears

---

## Troubleshooting

### Issue: Balance not loading
**Possible Causes**:
1. External API is down
2. Invalid Tron address
3. Network connectivity issues

**Solution**:
1. Check if `trading.watchup.site` is accessible
2. Verify address format (starts with 'T', 34 characters)
3. Check browser console for errors
4. Verify `NEXT_PUBLIC_TRON_BALANCE_API` environment variable

### Issue: Wallet generation fails
**Possible Causes**:
1. External API is down
2. Invalid response from service
3. Network connectivity issues

**Solution**:
1. Check if `trading.watchup.site` is accessible
2. Verify `WALLET_SERVICE_URL` environment variable
3. Check server logs for details
4. Test external API directly with curl

---

## API Response Validation

### Balance API
```typescript
interface BalanceResponse {
  success: boolean;
  address: string;
  balance: {
    trx: string;
    sun: string;
  };
  network: string;
  timestamp: string;
}
```

### Wallet Generation API
```typescript
interface WalletResponse {
  success: boolean;
  chain: string;
  address: string;
  privateKey: string;
  hexAddress: string;
  publicKey: string;
  network: string;
}
```

---

## Summary

✅ **Integrated External APIs**:
- Wallet generation via `trading.watchup.site`
- Balance fetching via `trading.watchup.site`

✅ **Benefits**:
- Centralized wallet management
- Reliable balance fetching
- Reduced client dependencies
- Better error handling

✅ **Maintained**:
- TRC20 token balance fetching (using TronWeb)
- Transaction signing (backend)
- PIN encryption/decryption

---

**Status**: ✅ Complete and ready for testing
**Last Updated**: 2024-01-15
