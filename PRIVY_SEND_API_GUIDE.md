# Privy Multi-Chain Send API Guide

Complete API documentation for sending native tokens across all 5 supported chains using Privy wallets.

## Supported Chains

1. **Ethereum (ETH)** - EVM-compatible
2. **Solana (SOL)** - High-performance blockchain
3. **Sui (SUI)** - Move-based blockchain
4. **TON (TON)** - Telegram Open Network
5. **Tron (TRX)** - High-throughput blockchain

## API Endpoints

### Unified Send Endpoint

**POST** `/api/privy/wallet/send`

Send native tokens on any supported chain using a single endpoint.

#### Request Body
```json
{
  "chain": "ethereum" | "solana" | "sui" | "ton" | "tron",
  "to": "recipient_address",
  "amount": "1.5"
}
```

#### Response
```json
{
  "success": true,
  "chain": "ethereum",
  "transactionHash": "0x...",  // or signature/digest/hash/txid depending on chain
  "status": "pending",
  "explorerUrl": "https://etherscan.io/tx/0x..."
}
```

### Chain-Specific Endpoints

#### 1. Ethereum
**POST** `/api/privy/wallet/ethereum/send`

```json
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "0.1"
}
```

Response:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "status": "pending"
}
```

#### 2. Solana
**POST** `/api/privy/wallet/solana/send`

```json
{
  "to": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
  "amount": "0.5"
}
```

Response:
```json
{
  "success": true,
  "signature": "5j7s...",
  "status": "pending"
}
```

#### 3. Sui
**POST** `/api/privy/wallet/sui/send`

```json
{
  "to": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "amount": "1.0"
}
```

Response:
```json
{
  "success": true,
  "digest": "abc123...",
  "status": "pending",
  "explorerUrl": "https://suiscan.xyz/mainnet/tx/abc123..."
}
```

#### 4. TON
**POST** `/api/privy/wallet/ton/send`

```json
{
  "to": "EQD...",
  "amount": "2.0"
}
```

Response:
```json
{
  "success": true,
  "hash": "def456...",
  "status": "pending",
  "explorerUrl": "https://tonscan.org/tx/def456..."
}
```

#### 5. Tron
**POST** `/api/privy/wallet/tron/send`

```json
{
  "to": "TRX9aJ...",
  "amount": "10.0"
}
```

Response:
```json
{
  "success": true,
  "txid": "ghi789...",
  "status": "pending",
  "explorerUrl": "https://tronscan.org/#/transaction/ghi789..."
}
```

## Address Validation

Each chain has specific address format requirements:

| Chain | Format | Example |
|-------|--------|---------|
| Ethereum | `0x` + 40 hex chars | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` |
| Solana | Base58, 32-44 chars | `DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK` |
| Sui | `0x` + 64 hex chars | `0x1234...abcdef` (64 chars) |
| TON | Base64, 48+ chars | `EQD...` |
| Tron | Starts with `T`, 34 chars | `TRX9aJ...` (34 chars) |

## Amount Conversion

Each chain uses different base units:

| Chain | Native Token | Base Unit | Conversion |
|-------|-------------|-----------|------------|
| Ethereum | ETH | Wei | 1 ETH = 10^18 Wei |
| Solana | SOL | Lamports | 1 SOL = 10^9 Lamports |
| Sui | SUI | MIST | 1 SUI = 10^9 MIST |
| TON | TON | nanoTON | 1 TON = 10^9 nanoTON |
| Tron | TRX | SUN | 1 TRX = 10^6 SUN |

The API handles conversion automatically - just provide the amount in native tokens.

## Authentication

All endpoints require Clerk JWT authentication via cookies or Authorization header.

```typescript
// Frontend example
const response = await fetch('/api/privy/wallet/send', {
  method: 'POST',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chain: 'ethereum',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '0.1'
  })
});

const data = await response.json();
console.log(data.transactionHash);
```

## Error Handling

### Common Errors

```json
{
  "error": "Missing required fields: chain, to, amount"
}
```

```json
{
  "error": "Invalid chain. Must be one of: ethereum, solana, sui, ton, tron"
}
```

```json
{
  "error": "Invalid amount"
}
```

```json
{
  "error": "ethereum wallet not found"
}
```

```json
{
  "error": "Invalid Ethereum address"
}
```

## Implementation Files

### Helper Functions
- `src/lib/privy/ethereum.ts` - Ethereum transaction helpers
- `src/lib/privy/solana.ts` - Solana transaction helpers
- `src/lib/privy/sui.ts` - Sui transaction helpers
- `src/lib/privy/ton.ts` - TON transaction helpers
- `src/lib/privy/tron.ts` - Tron transaction helpers
- `src/lib/privy/wallets.ts` - Wallet management (updated for 5 chains)

### API Routes
- `src/app/api/privy/wallet/send/route.ts` - Unified send endpoint
- `src/app/api/privy/wallet/ethereum/send/route.ts` - Ethereum-specific
- `src/app/api/privy/wallet/solana/send/route.ts` - Solana-specific
- `src/app/api/privy/wallet/sui/send/route.ts` - Sui-specific
- `src/app/api/privy/wallet/ton/send/route.ts` - TON-specific
- `src/app/api/privy/wallet/tron/send/route.ts` - Tron-specific

## Usage Examples

### React Hook Example

```typescript
import { useState } from 'react';

export function useSendTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTransaction = async (
    chain: 'ethereum' | 'solana' | 'sui' | 'ton' | 'tron',
    to: string,
    amount: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/privy/wallet/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chain, to, amount })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendTransaction, loading, error };
}
```

### Component Example

```typescript
import { useSendTransaction } from '@/hooks/useSendTransaction';

export function SendForm() {
  const { sendTransaction, loading, error } = useSendTransaction();
  const [chain, setChain] = useState<'ethereum' | 'solana' | 'sui' | 'ton' | 'tron'>('ethereum');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await sendTransaction(chain, to, amount);
      console.log('Transaction sent:', result);
      alert(`Transaction sent! Explorer: ${result.explorerUrl}`);
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={chain} onChange={(e) => setChain(e.target.value as any)}>
        <option value="ethereum">Ethereum</option>
        <option value="solana">Solana</option>
        <option value="sui">Sui</option>
        <option value="ton">TON</option>
        <option value="tron">Tron</option>
      </select>
      
      <input
        type="text"
        placeholder="Recipient address"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      
      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

## Security Considerations

1. **Authentication Required**: All endpoints verify Clerk JWT tokens
2. **Address Validation**: Each chain validates address format before sending
3. **Amount Validation**: Ensures positive, numeric amounts
4. **Wallet Ownership**: Verifies user owns the wallet before sending
5. **Authorization Context**: Uses Privy's authorization context with user JWT

## Testing

### Test with cURL

```bash
# Ethereum
curl -X POST http://localhost:3000/api/privy/wallet/send \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_CLERK_SESSION" \
  -d '{
    "chain": "ethereum",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "0.01"
  }'

# Solana
curl -X POST http://localhost:3000/api/privy/wallet/send \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_CLERK_SESSION" \
  -d '{
    "chain": "solana",
    "to": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
    "amount": "0.1"
  }'
```

## Explorer URLs

Each chain has its own block explorer:

- **Ethereum**: https://etherscan.io/tx/{hash}
- **Solana**: https://solscan.io/tx/{signature}
- **Sui**: https://suiscan.xyz/mainnet/tx/{digest}
- **TON**: https://tonscan.org/tx/{hash}
- **Tron**: https://tronscan.org/#/transaction/{txid}

## Next Steps

1. Test each endpoint with your Privy wallets
2. Implement frontend components for sending
3. Add transaction history tracking
4. Implement balance checking before sending
5. Add gas estimation for each chain
6. Implement token transfers (ERC20, SPL, etc.)
