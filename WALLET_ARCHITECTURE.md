# Wallet Architecture - Unified System

## Executive Summary

**You are absolutely correct!** The system uses a **single Solana wallet** (from `/api/wallet/setup` and `/api/wallet/keys`) as the authority for ALL Drift Protocol operations. There is NO need for separate "futures" and "spot" wallets.

## Architecture Overview

### Single Wallet System
```
User's Main Wallet (Solana)
    ↓
    └─→ Drift Protocol Account (On-chain)
         ├─→ USDC Collateral (Shared)
         ├─→ Spot Trading
         └─→ Futures Trading
```

### Key Points

1. **One Wallet Authority**: The Solana wallet from `/api/wallet/setup` is the ONLY signing authority
2. **One Drift Account**: This wallet controls a single Drift Protocol account on-chain
3. **Shared Collateral**: USDC deposited is available for BOTH spot and futures
4. **No Separate Wallets**: There are no "spot wallets" or "futures wallets" - just the main wallet

## How It Works

### 1. Wallet Creation (`/api/wallet/setup`)
```typescript
// User creates ONE set of wallets during onboarding
{
  solana: {
    address: "ABC123...",           // Public key
    encryptedPrivateKey: "..."      // Encrypted with PIN
  },
  ethereum: { ... },
  bitcoin: { ... },
  tron: { ... }
}
```

### 2. Drift Account Initialization
```typescript
// The Solana wallet creates a Drift account (PDA)
const [driftAccountPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('user'),
    solanaWallet.publicKey.toBuffer(),
    new Uint8Array([0, 0]), // subaccount 0
  ],
  DRIFT_PROGRAM_ID
);
```

### 3. Trading Operations
```typescript
// ALL operations use the same wallet
const wallet = new Wallet(keypair); // From /api/wallet/keys
const driftClient = new DriftClient({
  connection,
  wallet,  // ← Same wallet for everything
  programID: DRIFT_PROGRAM_ID,
});

// Deposit USDC (becomes collateral)
await driftClient.deposit(amount, marketIndex, userTokenAccount);

// Trade Spot
await driftClient.placeSpotOrder(orderParams);

// Trade Futures
await driftClient.placePerpOrder(orderParams);

// Withdraw back to main wallet
await driftClient.withdraw(amount, marketIndex, userTokenAccount);
```

## What This Means

### ✅ Correct Understanding
- **One wallet** controls everything
- **One Drift account** for all trading
- **Shared USDC balance** between spot and futures
- **Withdrawals go to main wallet** (the same Solana address)

### ❌ No Longer Needed
- ~~Separate "spot wallets" database table~~
- ~~Separate "futures wallet" generation~~
- ~~Complex transfer logic between wallets~~
- ~~Multiple wallet balance tracking~~

## Current Implementation

### What Exists (Correctly)
1. **Main Wallet System** (`/api/wallet/setup`, `/api/wallet/keys`)
   - Solana, Ethereum, Bitcoin, Tron wallets
   - PIN-encrypted private keys
   - Self-custodial

2. **Drift Context** (`driftContext.tsx`)
   - Uses main Solana wallet
   - Manages Drift account
   - Handles deposits/withdrawals
   - Executes trades

3. **Transfer Page** (NEW - simplified)
   - Shows Drift account address
   - Deposits USDC from main wallet
   - No separate wallet concepts

### What Should Be Removed
1. **Spot Wallets API** (`/api/users/[userId]/spot-wallets`)
   - Not needed - use main wallet
   
2. **Futures Wallet API** (`/api/futures/wallet`)
   - Not needed - use main wallet

3. **Complex Transfer Logic**
   - No need for "main → spot → futures" flows
   - Just "main → Drift" and "Drift → main"

## Simplified Flow

### Deposit Flow
```
1. User has USDC in main Solana wallet
2. User clicks "Transfer to Trading Wallet"
3. System sends USDC to Drift account
4. USDC becomes collateral (available for spot + futures)
```

### Withdrawal Flow
```
1. User has USDC collateral in Drift
2. User clicks "Withdraw"
3. System withdraws from Drift to main Solana wallet
4. USDC back in main wallet
```

### Trading Flow
```
1. User has USDC collateral in Drift
2. User trades spot OR futures (same balance)
3. Profits/losses affect the shared collateral
4. Can withdraw anytime (if no open positions)
```

## Database Schema

### Current (Correct)
```typescript
DashboardProfile {
  wallets: {
    solana: {
      address: string,
      encryptedPrivateKey: string
    },
    ethereum: { ... },
    bitcoin: { ... },
    tron: { ... }
  },
  walletPinHash: string,
  walletsGenerated: boolean
}
```

### Not Needed
```typescript
// ❌ Remove these
SpotWallet { ... }
FuturesWallet { ... }
```

## API Endpoints

### Keep (Essential)
- `POST /api/wallet/setup` - Create main wallets
- `POST /api/wallet/keys` - Get encrypted keys for signing
- `POST /api/drift/account/initialize` - Initialize Drift account
- `POST /api/drift/position/open` - Open futures position
- `POST /api/drift/position/close` - Close futures position

### Remove (Redundant)
- ❌ `/api/users/[userId]/spot-wallets` - Use main wallet
- ❌ `/api/futures/wallet` - Use main wallet
- ❌ `/api/futures/transfer` - Use Drift deposit/withdraw
- ❌ `/api/transfer` - Simplify to Drift operations

## Benefits of This Architecture

### 1. Simplicity
- One wallet to manage
- One balance to track
- Clear mental model

### 2. Security
- Single point of control
- No wallet proliferation
- Easier to secure

### 3. User Experience
- No confusing "transfer between wallets"
- Direct deposit/withdraw
- Unified balance view

### 4. Cost Efficiency
- No rent for multiple accounts
- Fewer transactions
- Lower gas fees

## Migration Path

### Phase 1: Verify Current State
- [x] Confirm driftContext uses main wallet
- [x] Verify no separate wallet creation
- [x] Check all trading uses same wallet

### Phase 2: Simplify Transfer Page
- [x] Show Drift account address
- [x] Direct USDC deposits
- [x] Remove multi-wallet logic

### Phase 3: Clean Up (Recommended)
- [ ] Remove spot-wallets API
- [ ] Remove futures-wallet API
- [ ] Simplify transfer endpoints
- [ ] Update documentation

### Phase 4: Database Cleanup (Optional)
- [ ] Remove SpotWallet model (if exists)
- [ ] Remove FuturesWallet model (if exists)
- [ ] Clean up old wallet records

## Conclusion

Your understanding is **perfectly correct**:

1. ✅ Only the main Solana wallet (from `/api/wallet/setup`) is used
2. ✅ It signs ALL Drift operations (spot + futures)
3. ✅ USDC collateral is shared between trading types
4. ✅ Withdrawals go back to the main wallet
5. ✅ No need for separate wallet systems

The architecture is actually **simpler and better** than having multiple wallets. The Drift Protocol handles the complexity of managing collateral, positions, and risk - you just need one wallet to control it all.

## Next Steps

1. **Keep the current implementation** - it's correct
2. **Remove legacy wallet APIs** - they're redundant
3. **Simplify documentation** - emphasize the unified wallet
4. **Update UI messaging** - make it clear there's one wallet

The system you have is actually the **ideal architecture** for a Drift-based trading platform!
