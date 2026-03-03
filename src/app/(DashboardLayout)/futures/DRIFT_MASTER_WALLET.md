# Drift Master Wallet Subaccount System

## Overview

This system implements a centralized master wallet for fee collection and user subaccount management for Drift Protocol futures trading.

## Key Features

- **Master Wallet Management**: Centralized fee collection wallet
- **Subaccount Allocation**: Unique subaccount IDs (0-255) for each user
- **Automatic Fee Deduction**: 5% platform fee on all deposits
- **Concurrent Deposit Handling**: Per-user locking prevents race conditions
- **gRPC Integration**: Real-time data streaming via Yellowstone gRPC
- **Secure Key Management**: Server-side encryption, keys never exposed to frontend

## Architecture

### Service Layer

- **MasterWalletManager**: Manages platform master wallet
- **ClientManager**: Handles Drift client lifecycle and caching
- **SubaccountManager**: Allocates and initializes user subaccounts
- **DepositManager**: Processes deposits with fee deduction
- **PositionManager**: Placeholder for position management

### API Routes

- `POST /api/futures/subaccount/initialize` - Initialize user subaccount
- `GET /api/futures/subaccount/info` - Get subaccount information
- `POST /api/futures/collateral/deposit` - Deposit collateral with fee
- `POST /api/futures/position/create` - Create position (placeholder)
- `POST /api/futures/position/close` - Close position (placeholder)
- `GET /api/futures/master/balance` - Get master wallet balance
- `GET /api/futures/master/fees` - Get fee collection summary
- `GET /api/futures/health` - System health check

### React Context

Use `DriftMasterProvider` and `useDriftMaster()` hook for frontend integration:

```tsx
import { useDriftMaster } from '@/app/context/driftMasterContext';

function MyComponent() {
  const {
    subaccountInfo,
    initializeSubaccount,
    depositCollateral,
    isInitializingSubaccount,
    error
  } = useDriftMaster();
  
  // Use the context...
}
```

## Environment Variables

Required environment variables:

```env
# Master Wallet
MASTER_KEY=<base58_encoded_private_key>
VAULT_URL=<optional_secure_vault_url>

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Drift Protocol
DRIFT_PROGRAM_ID=dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH

# Yellowstone gRPC
YELLOWSTONE_GRPC_ENDPOINT=<grpc_endpoint>
YELLOWSTONE_GRPC_TOKEN=<optional_auth_token>

# Configuration
FEE_PERCENTAGE=5
MASTER_WALLET_MIN_BALANCE=0.05
CLIENT_CLEANUP_TIMEOUT_MINUTES=30

# Encryption
WALLET_ENCRYPTION_KEY=<hex_encoded_32_byte_key>
```

## Database Models

### DriftSubaccount

```typescript
{
  userId: string;              // User identifier
  subaccountId: number;        // 0-255, unique
  futuresWalletAddress: string; // Solana address
  createdAt: Date;
  updatedAt: Date;
}
```

### FeeAuditLog

```typescript
{
  timestamp: Date;
  userId: string;
  operationType: 'deposit' | 'withdrawal' | 'trade';
  totalAmount: number;
  feeAmount: number;
  collateralAmount: number;
  feePercentage: number;
  feeSignature: string;
  depositSignature: string;
}
```

## UI Components

### SubaccountInitButton

Initialize user subaccount:

```tsx
<SubaccountInitButton
  hasSubaccount={!!subaccountInfo}
  hasFuturesWallet={true}
  onInitialize={initializeSubaccount}
  onSuccess={() => console.log('Initialized!')}
/>
```

### CollateralDepositModal

Deposit collateral with fee breakdown:

```tsx
<CollateralDepositModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onDeposit={depositCollateral}
  feePercentage={5}
/>
```

### MasterWalletStatus

Display master wallet status (admin only):

```tsx
<MasterWalletStatus />
```

## Workflow

### 1. Subaccount Initialization

1. User must have a futures wallet (Solana wallet)
2. Click "Initialize Subaccount" button
3. System allocates lowest available ID (0-255)
4. Master wallet pays for on-chain initialization
5. Record saved to database

### 2. Collateral Deposit

1. User enters deposit amount
2. System calculates 5% fee
3. Fee transferred to master wallet
4. Remaining 95% deposited to Drift subaccount
5. Transaction logged to audit trail

### 3. Trading (Placeholder)

Position creation and closing are placeholders for future implementation.

## Error Handling

The system uses custom error classes:

- **ValidationError** (400): Invalid input
- **NotFoundError** (404): Resource not found
- **ResourceExhaustedError** (409): No available slots
- **SystemError** (500): Internal error
- **TransactionError** (500): Blockchain transaction failed

## Security

- Private keys encrypted at rest (AES-256-GCM)
- Keys never transmitted to frontend
- Per-user locking prevents race conditions
- Audit trail for all fee collections
- Rate limiting on API routes (recommended)

## Monitoring

Health check endpoint provides:

- Master wallet connectivity and balance
- Database connectivity and response time
- gRPC connection status
- Active client count

## Future Enhancements

- Implement actual position creation/closing
- Add withdrawal functionality
- Implement fee withdrawal for platform
- Add more detailed analytics
- Implement rate limiting
- Add WebSocket updates for real-time data

## Troubleshooting

### Master wallet not initialized

Check that `MASTER_KEY` environment variable is set correctly.

### Subaccount initialization fails

- Verify user has a futures wallet
- Check master wallet has sufficient balance (>0.05 SOL)
- Ensure not all 256 subaccount IDs are allocated

### Deposit fails

- Verify user has sufficient balance
- Check user has initialized subaccount
- Ensure amount is greater than minimum (fee > 0.000001 SOL)

## Support

For issues or questions, check the logs for detailed error messages. All operations are logged with structured logging for debugging.
