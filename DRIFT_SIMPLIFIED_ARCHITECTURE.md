# Drift Simplified Architecture

## Overview

The Drift integration has been simplified to remove unnecessary complexity. The master wallet context has been removed since we only need the master wallet's **public address** for fee collection.

## Key Changes

### ❌ Removed
- `src/app/context/driftMasterContext.tsx` - Unnecessary context provider
- Complex master wallet management
- Server-side API routes for Drift operations

### ✅ Added
- `src/config/drift.ts` - Simple configuration file with:
  - Master wallet public address
  - Fee percentage (5%)
  - Fee calculation helper
  - Drift program ID

### ✅ Updated
- `src/app/context/driftContext.tsx` - Now handles fee collection in deposit flow

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  driftContext.tsx                                   │    │
│  │  - User enters PIN                                  │    │
│  │  - Decrypts their own wallet                        │    │
│  │  - Creates Drift client                             │    │
│  │  - Handles all trading operations                   │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ When depositing:                  │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Fee Collection (in deposit flow)                   │    │
│  │  1. Calculate 5% fee                                │    │
│  │  2. Send fee to master wallet (public address)      │    │
│  │  3. Deposit remaining 95% to Drift                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Direct blockchain calls
                           ▼
                    Solana Blockchain
                           │
                           ├─→ Master Wallet (receives fees)
                           └─→ Drift Protocol (user's account)
```

## Fee Collection Flow

1. User wants to deposit 100 USDC
2. System calculates:
   - Fee: 5 USDC (5%)
   - Net deposit: 95 USDC (95%)
3. User's wallet sends:
   - 5 USDC → Master wallet public address
   - 95 USDC → Drift Protocol (user's account)
4. Both transactions signed by user's wallet

## Security

### ✅ Secure
- Master wallet **public address** in client-side config
- Users control their own private keys
- PIN-based wallet decryption
- Direct blockchain interaction

### ❌ Never Exposed
- Master wallet **private key** (stays server-side)
- User private keys (decrypted only in memory)

## Configuration

### Client-Side Environment Variables
```env
# Safe to expose (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_DRIFT_PROGRAM_ID=dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH
NEXT_PUBLIC_DRIFT_MASTER_WALLET_ADDRESS=YOUR_MASTER_WALLET_PUBLIC_KEY
```

### Server-Side Environment Variables
```env
# NEVER expose (no NEXT_PUBLIC_ prefix)
MASTER_KEY=<base58_encoded_private_key>
WALLET_ENCRYPTION_KEY=<hex_encoded_32_byte_key>
```

## Usage Example

```typescript
import { useDrift } from '@/app/context/driftContext';
import { DRIFT_CONFIG, calculateFee } from '@/config/drift';

function DepositComponent() {
  const { depositCollateral } = useDrift();
  
  const handleDeposit = async (amount: number) => {
    // Show user the fee breakdown
    const { fee, netAmount } = calculateFee(amount);
    console.log(`Fee: ${fee} USDC`);
    console.log(`Net deposit: ${netAmount} USDC`);
    console.log(`Fee goes to: ${DRIFT_CONFIG.MASTER_WALLET_ADDRESS}`);
    
    // Deposit with automatic fee handling
    const result = await depositCollateral(amount);
    
    if (result.success) {
      console.log('Deposit successful!', result.txSignature);
    }
  };
  
  return <button onClick={() => handleDeposit(100)}>Deposit 100 USDC</button>;
}
```

## Benefits

1. **Simpler**: No unnecessary context provider
2. **Clearer**: Fee collection logic in one place
3. **Secure**: Only public address exposed
4. **Transparent**: Users see exactly where fees go
5. **Maintainable**: Less code to maintain

## Master Wallet Management

The master wallet private key is only needed for:
- Withdrawing collected fees (server-side operation)
- Administrative tasks (server-side operation)

These operations should be handled by separate admin tools, not the main application.

## Summary

By removing the master wallet context and using only the public address, we've:
- Eliminated unnecessary complexity
- Improved security (no private key exposure risk)
- Made the fee collection flow transparent
- Reduced code maintenance burden

The master wallet is now just a destination address for fees, not an active participant in the client-side application.
