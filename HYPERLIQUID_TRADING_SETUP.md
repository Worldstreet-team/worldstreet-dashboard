# Hyperliquid Trading Wallet Setup

## Overview

This implementation creates a complete trading setup for Hyperliquid using Privy wallets and Viem accounts. It follows the recommended pattern of:

1. **Main Wallet**: User's primary Ethereum wallet for holding funds
2. **Trading Wallet**: Separate Ethereum wallet specifically for trading operations
3. **Viem Account**: Wrapper around the trading wallet for signing transactions
4. **Hyperliquid Integration**: Exchange client for trading operations

## Architecture

```
User (Clerk Auth)
    ↓
Privy User (email + custom_auth)
    ↓
Main Wallets (ETH, SOL, SUI, TON, TRX)
    ↓
Trading Wallet (Additional ETH wallet)
    ↓
Viem Account (Transaction signer)
    ↓
Hyperliquid Exchange Client
```

## API Endpoints

### 1. Setup Trading Wallet
**POST** `/api/privy/setup-trading-wallet`

Creates or retrieves a trading wallet and initializes Hyperliquid integration.

**Request Body:**
```json
{
  "email": "user@example.com",
  "clerkUserId": "user_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "privyUserId": "privy_user_id",
    "mainWallet": {
      "id": "wallet_id",
      "address": "0x...",
      "chainType": "ethereum"
    },
    "tradingWallet": {
      "id": "trading_wallet_id", 
      "address": "0x...",
      "chainType": "ethereum"
    },
    "viemAccount": {
      "address": "0x...",
      "ready": true
    },
    "hyperliquid": {
      "success": true,
      "initialized": true,
      "testnet": true,
      "timestamp": "2026-03-13T..."
    }
  }
}
```

### 2. Get Trading Wallet Status
**GET** `/api/privy/setup-trading-wallet?email=user@example.com&clerkUserId=user_xxx`

Checks current trading wallet setup status.

**Response:**
```json
{
  "success": true,
  "data": {
    "privyUserId": "privy_user_id",
    "hasMainWallet": true,
    "hasTradingWallet": true,
    "mainWallet": { "id": "...", "address": "0x...", "chainType": "ethereum" },
    "tradingWallet": { "id": "...", "address": "0x...", "chainType": "ethereum" },
    "totalEthereumWallets": 2
  }
}
```

### 3. Test Hyperliquid Connection
**GET** `/api/hyperliquid/test`

Tests Hyperliquid API connection and returns basic market data.

## Implementation Details

### User Creation Pattern

Following the existing Privy patterns, users are created with both `custom_auth` and `email` linked accounts:

```typescript
const privyUser = await privyNode.users().create({
  linked_accounts: [
    { type: 'custom_auth', custom_user_id: clerkUserId },
    { type: 'email', address: email }
  ],
  wallets: [
    { chain_type: 'ethereum' },
    { chain_type: 'solana' },
    { chain_type: 'sui' },
    { chain_type: 'ton' },
    { chain_type: 'tron' }
  ]
});
```

### Trading Wallet Creation

The system checks for existing Ethereum wallets and creates a new one for trading:

```typescript
// List existing Ethereum wallets
const existingWallets = [];
for await (const wallet of privyNode.wallets().list({ 
  user_id: privyUser.id,
  chain_type: 'ethereum' 
})) {
  existingWallets.push(wallet);
}

// Create trading wallet if needed
const tradingWallet = await privyNode.wallets().create({
  chain_type: 'ethereum',
  user_id: privyUser.id
});
```

### Viem Account Integration

The trading wallet is wrapped in a Viem account for transaction signing:

```typescript
import { createViemAccount } from '@privy-io/node/viem';

const viemAccount = createViemAccount(privyNode, {
  walletId: tradingWallet.id,
  address: tradingWallet.address as `0x${string}`,
});
```

### Hyperliquid Exchange Client

The Viem account is used to create a Hyperliquid exchange client:

```typescript
import * as hl from '@nktkas/hyperliquid';

const transport = new hl.HttpTransport({ isTestnet: true });
const exchangeClient = new hl.ExchangeClient({
  transport,
  wallet: viemAccount,
});
```

## Wallet Context Integration

The wallet context has been extended to support trading wallets:

```typescript
interface WalletContextType {
  // Existing properties...
  tradingWallet: TradingWallet | null;
  hyperliquidStatus: HyperliquidStatus | null;
  setupTradingWallet: () => Promise<void>;
  getTradingWalletStatus: () => Promise<void>;
}
```

## Usage Example

```typescript
import { useWallet } from '@/app/context/walletContext';

function TradingComponent() {
  const { 
    tradingWallet, 
    hyperliquidStatus, 
    setupTradingWallet 
  } = useWallet();

  const handleSetupTrading = async () => {
    try {
      await setupTradingWallet();
      console.log('Trading wallet setup complete');
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  return (
    <div>
      {tradingWallet ? (
        <div>
          <p>Trading Wallet: {tradingWallet.address}</p>
          <p>Hyperliquid: {hyperliquidStatus?.initialized ? 'Ready' : 'Not Ready'}</p>
        </div>
      ) : (
        <button onClick={handleSetupTrading}>
          Setup Trading Wallet
        </button>
      )}
    </div>
  );
}
```

## Environment Configuration

The system automatically uses testnet in development:

```typescript
const testnet = process.env.NODE_ENV !== 'production';
```

## Security Considerations

1. **Wallet Separation**: Main wallet and trading wallet are separate for security
2. **Privy Key Management**: Private keys are managed by Privy, not stored locally
3. **Viem Integration**: Secure transaction signing through Viem accounts
4. **Database Storage**: Wallet metadata stored in MongoDB with proper indexing

## Files Created/Modified

### New Files:
- `src/app/api/privy/setup-trading-wallet/route.ts` - Main setup endpoint
- `src/lib/hyperliquid/client.ts` - Hyperliquid service wrapper
- `src/app/api/hyperliquid/test/route.ts` - API test endpoint

### Modified Files:
- `src/app/context/walletContext.tsx` - Added trading wallet support

## Testing

1. **Test Hyperliquid Connection:**
   ```bash
   curl http://localhost:3000/api/hyperliquid/test
   ```

2. **Setup Trading Wallet:**
   ```bash
   curl -X POST http://localhost:3000/api/privy/setup-trading-wallet \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","clerkUserId":"user_123"}'
   ```

3. **Check Status:**
   ```bash
   curl "http://localhost:3000/api/privy/setup-trading-wallet?email=test@example.com&clerkUserId=user_123"
   ```

## Next Steps

1. **Trading Interface**: Build UI components for trading operations
2. **Order Management**: Implement order placement and management
3. **Portfolio Tracking**: Add position and P&L tracking
4. **Risk Management**: Implement position sizing and risk controls
5. **Real-time Data**: Add WebSocket connections for live market data