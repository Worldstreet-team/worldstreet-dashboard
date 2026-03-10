# Solana USDT API Documentation

## Overview
Complete API documentation for fetching Solana USDT balances and transferring USDT tokens. All endpoints include proper error handling with sanitized error messages for security.

---

## API Endpoints

### 1. Get Authenticated User's USDT Balance

**Endpoint:** `GET /api/solana/usdt-balance`

**Authentication:** Required (Clerk session)

**Description:** Fetch the authenticated user's USDT balance on Solana. Uses the user's wallet address stored in MongoDB.

#### Request
```bash
curl -X GET http://localhost:3000/api/solana/usdt-balance \
  -H "Content-Type: application/json"
```

#### Response (Success)
```json
{
  "success": true,
  "balance": 1234.56,
  "address": "So11111111111111111111111111111111111111112",
  "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "decimals": 6
}
```

#### Response (No Wallet)
```json
{
  "success": true,
  "balance": 0,
  "address": null,
  "message": "No Solana wallet found"
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 401 | `Unauthorized` | User not authenticated |
| 404 | `User profile not found` | User profile doesn't exist in database |
| 500 | `Failed to fetch USDT balance` | RPC error or internal server error |

#### Implementation
```typescript
import { useUsdtBalance } from "@/hooks/useUsdtBalance";

export function MyComponent() {
  const { balance, loading, error } = useUsdtBalance();
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && <p>USDT Balance: {balance.toFixed(2)}</p>}
    </div>
  );
}
```

---

### 2. Get Specific User's USDT Balance

**Endpoint:** `GET /api/users/[userId]/solana-usdt-balance`

**Authentication:** Not required

**Description:** Fetch any user's USDT balance by their user ID. Useful for admin dashboards or viewing other users' balances.

#### Request
```bash
curl -X GET http://localhost:3000/api/users/user_id_123/solana-usdt-balance \
  -H "Content-Type: application/json"
```

#### Response (Success)
```json
{
  "success": true,
  "userId": "user_id_123",
  "balance": 5000.25,
  "address": "So11111111111111111111111111111111111111112",
  "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "decimals": 6
}
```

#### Response (No Wallet)
```json
{
  "success": true,
  "balance": 0,
  "address": null,
  "message": "No Solana wallet found"
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `User ID is required` | Missing userId parameter |
| 404 | `User profile not found` | User doesn't exist |
| 500 | `Failed to fetch USDT balance` | RPC or database error |

#### Implementation
```typescript
import { useUserUsdtBalance } from "@/hooks/useUserUsdtBalance";

export function UserBalanceDisplay({ userId }: { userId: string }) {
  const { balance, loading, error } = useUserUsdtBalance(userId);
  
  return (
    <div>
      {loading ? "Loading..." : `Balance: ${balance.toFixed(2)} USDT`}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

---

### 3. Transfer USDT

**Endpoint:** `POST /api/users/[userId]/transfer-usdt`

**Authentication:** Not required (PIN-based verification)

**Description:** Transfer USDT tokens from a user's wallet to a recipient. Backend handles key decryption and transaction signing.

#### Request
```bash
curl -X POST http://localhost:3000/api/users/user_id_123/transfer-usdt \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "recipient": "So11111111111111111111111111111111111111112",
    "amount": 100.50
  }'
```

#### Request Body
```typescript
{
  pin: string;           // User's PIN for key decryption
  recipient: string;     // Recipient Solana address
  amount: number;        // Amount in USDT (decimals handled automatically)
}
```

#### Response (Success)
```json
{
  "success": true,
  "transactionHash": "5Hs5nXKPHbnkzmCKF2iRgZuYcYKYgW4sPHXvxWDMsqH...",
  "from": "So11111111111111111111111111111111111111112",
  "to": "So11111111111111111111111111111111111111113",
  "amount": 100.50,
  "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "decimals": 6
}
```

#### Error Responses

| Status | Error | Cause | Sanitized Message |
|--------|-------|-------|-------------------|
| 400 | Missing fields | PIN, recipient, or amount not provided | `PIN, recipient, and amount are required` |
| 400 | Invalid amount | Amount <= 0 | `Amount must be greater than 0` |
| 400 | Invalid address | Recipient address format invalid | `Invalid recipient address` |
| 400 | No wallet | User has no Solana wallet | `No Solana wallet found` |
| 401 | Invalid PIN | PIN doesn't match stored hash | `Invalid PIN` |
| 404 | User not found | User profile doesn't exist | `User profile not found` |
| 500 | Transaction failed | Insufficient balance, network error, etc. | `Transfer failed` |

#### Implementation
```typescript
import { useTransferUsdt } from "@/hooks/useTransferUsdt";

export function TransferForm({ userId }: { userId: string }) {
  const { transfer, loading, error, transactionHash } = useTransferUsdt();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");

  const handleTransfer = async () => {
    try {
      const txHash = await transfer(userId, recipient, parseFloat(amount), pin);
      console.log("Transfer successful:", txHash);
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="Recipient address" 
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input 
        type="number" 
        placeholder="Amount" 
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input 
        type="password" 
        placeholder="PIN" 
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <button onClick={handleTransfer} disabled={loading}>
        {loading ? "Processing..." : "Transfer"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {transactionHash && <p className="text-green-500">Tx: {transactionHash}</p>}
    </div>
  );
}
```

---

## Error Handling Strategy

### Sanitized Error Messages
All errors are sanitized to prevent information leakage:

**Sensitive Information Hidden:**
- Database connection errors → `Internal server error`
- RPC endpoint failures → `Failed to fetch USDT balance`
- Decryption failures → `Invalid PIN`
- Key derivation errors → `Invalid PIN`

**User-Friendly Messages:**
- Clear validation errors for missing fields
- Specific messages for authentication failures
- Generic messages for infrastructure errors

### Error Response Format
```json
{
  "success": false,
  "message": "User-friendly error message"
}
```

### Common Error Scenarios

#### Scenario 1: User Not Authenticated
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status:** 401

#### Scenario 2: Invalid PIN
```json
{
  "success": false,
  "message": "Invalid PIN"
}
```
**Status:** 401

#### Scenario 3: Insufficient Balance
```json
{
  "success": false,
  "message": "Transfer failed"
}
```
**Status:** 500
**Note:** Actual error (insufficient balance) is logged server-side but not exposed to client

#### Scenario 4: Invalid Recipient Address
```json
{
  "success": false,
  "message": "Invalid recipient address"
}
```
**Status:** 400

---

## Security Considerations

### 1. PIN Verification
- PIN is never stored in plain text
- PIN is hashed using PBKDF2 during wallet setup
- PIN is used to decrypt private keys on-demand
- Failed PIN attempts should be rate-limited (recommended)

### 2. Private Key Handling
- Private keys are stored encrypted in MongoDB
- Keys are only decrypted when needed for signing
- Decrypted keys are never logged or exposed
- Keys are cleared from memory after transaction

### 3. Transaction Signing
- All transaction signing happens on the backend
- Frontend never handles raw private keys
- Transactions are signed before being sent to Solana

### 4. Rate Limiting
Recommended rate limits:
- Balance checks: 10 requests per minute per user
- Transfers: 5 requests per minute per user
- PIN verification: 3 attempts per minute (then lock for 15 minutes)

---

## Database Schema

### DashboardProfile Model
```typescript
{
  authUserId: string;
  wallets: {
    solana: {
      address: string;
      encryptedPrivateKey: string;
    };
    ethereum: { ... };
    bitcoin: { ... };
  };
  walletPinHash: string;
  walletsGenerated: boolean;
}
```

---

## Constants

### USDT on Solana
- **Mint Address:** `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **Decimals:** 6
- **Program:** SPL Token Program

### Solana RPC
- **Default:** Alchemy Mainnet
- **Configurable via:** `NEXT_PUBLIC_SOL_RPC` environment variable

---

## Testing

### Test Balance Endpoint
```bash
# Get authenticated user's balance
curl -X GET http://localhost:3000/api/solana/usdt-balance

# Get specific user's balance
curl -X GET http://localhost:3000/api/users/user_id_123/solana-usdt-balance
```

### Test Transfer Endpoint
```bash
# Transfer USDT
curl -X POST http://localhost:3000/api/users/user_id_123/transfer-usdt \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "recipient": "So11111111111111111111111111111111111111113",
    "amount": 10.5
  }'
```

---

## Hooks Reference

### useUsdtBalance
Fetch authenticated user's USDT balance
```typescript
const { balance, loading, error, refetch } = useUsdtBalance(
  autoFetch = true,
  refreshInterval = 30000
);
```

### useUserUsdtBalance
Fetch any user's USDT balance by ID
```typescript
const { balance, loading, error, refetch } = useUserUsdtBalance(
  userId,
  autoFetch = true,
  refreshInterval = 30000
);
```

### useTransferUsdt
Transfer USDT for a user
```typescript
const { transfer, loading, error, transactionHash, clearError } = useTransferUsdt();

// Usage
await transfer(userId, recipient, amount, pin);
```

---

## Troubleshooting

### Balance shows 0
- Verify wallet address is correct in MongoDB
- Check USDT token account exists on Solana
- Verify RPC endpoint is accessible

### "Invalid PIN" error
- Ensure PIN matches what was set during wallet creation
- Check PIN hash in database is correct
- Verify encryption/decryption functions work

### Transfer fails with generic error
- Check server logs for actual error
- Verify recipient address is valid Solana address
- Ensure account has sufficient SOL for transaction fees
- Check USDT balance is sufficient

### Unauthorized error
- Verify user is authenticated (Clerk session)
- Check authentication middleware is working
- Verify authUserId is set in DashboardProfile

---

## Future Enhancements

1. **Rate Limiting:** Implement per-user rate limits
2. **Transaction History:** Track all transfers
3. **Batch Transfers:** Support multiple recipients
4. **Fee Estimation:** Show estimated transaction fees
5. **Webhook Notifications:** Notify on transfer completion
6. **Multi-Signature:** Support multi-sig wallets
