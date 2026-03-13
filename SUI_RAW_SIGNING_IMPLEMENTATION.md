# Sui Raw Signing Implementation (Tier 2 Chain)

## Overview
This document outlines the implementation of Sui transaction sending using Privy's raw signing functionality for Tier 2 chains. Unlike Tier 1 chains (Solana, Ethereum), Sui requires manual transaction construction and raw signing.

## Why Raw Signing?

Sui is a **Tier 2 chain** in Privy, which means:
- No native `sendTransaction` support
- Must use `rawSign` API to sign transaction hashes/bytes
- Manual transaction construction and submission required
- More complex but gives full control over transaction building

## Implementation Architecture

### 1. Transaction Flow
```
User Request → Build Transaction → Raw Sign → Submit to Network
     ↓              ↓                ↓            ↓
SendModal → SUI Context → Privy rawSign → Sui RPC
```

### 2. Key Components

#### A. Transaction Building (Sui SDK)
```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Create transaction block
const txb = new TransactionBlock();
const [coin] = txb.splitCoins(txb.gas, [txb.pure(amount)]);
txb.transferObjects([coin], txb.pure(toAddress));
```

#### B. Raw Signing (Privy)
```typescript
const signResponse = await privyClient.wallets().rawSign(walletId, {
  params: {
    bytes: txBytesHex,
    encoding: 'hex',
    hash_function: 'sha256'
  }
}, { authorizationContext });
```

#### C. Transaction Submission (Sui Network)
```typescript
const result = await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: signature,
  options: { showEffects: true, showEvents: true }
});
```

## Updated Files

### 1. Enhanced Sui Library (`src/lib/privy/sui.ts`)

**New Implementation:**
- Uses Sui SDK for transaction building
- Privy raw signing for authorization
- Manual transaction submission to Sui network
- Proper error handling and logging

**Key Functions:**
- `sendSuiTransaction()` - Main transaction logic with raw signing
- `sendSui()` - Wrapper for SUI transfers
- `getSuiBalance()` - Balance fetching via RPC

### 2. Package Dependencies (`package.json`)

**Added:**
```json
"@mysten/sui.js": "^1.17.1"
```

**Required for:**
- Transaction building (`TransactionBlock`)
- Sui client (`SuiClient`)
- Network communication

### 3. Environment Configuration

**Required:**
```env
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

## Technical Details

### Transaction Building Process

1. **Create Transaction Block**
   ```typescript
   const txb = new TransactionBlock();
   ```

2. **Add Transfer Instructions**
   ```typescript
   const [coin] = txb.splitCoins(txb.gas, [txb.pure(amount)]);
   txb.transferObjects([coin], txb.pure(toAddress));
   ```

3. **Set Transaction Metadata**
   ```typescript
   txb.setSender(wallet.address);
   txb.setGasBudget(10000000); // 0.01 SUI
   ```

4. **Build Transaction Bytes**
   ```typescript
   const txBytes = await txb.build({ client: suiClient });
   ```

### Raw Signing Process

1. **Convert to Hex**
   ```typescript
   const txBytesHex = '0x' + Buffer.from(txBytes).toString('hex');
   ```

2. **Call Privy Raw Sign**
   ```typescript
   const signResponse = await privyClient.wallets().rawSign(walletId, {
     params: {
       bytes: txBytesHex,
       encoding: 'hex',
       hash_function: 'sha256'
     }
   }, { authorizationContext });
   ```

3. **Extract Signature**
   ```typescript
   const signature = signResponse.signature;
   ```

### Transaction Submission

1. **Execute on Network**
   ```typescript
   const result = await suiClient.executeTransactionBlock({
     transactionBlock: txBytes,
     signature: signature,
     options: {
       showEffects: true,
       showEvents: true,
     },
   });
   ```

2. **Return Transaction Digest**
   ```typescript
   return {
     digest: result.digest,
     status: result.effects?.status?.status || 'unknown'
   };
   ```

## Security Considerations

### 1. Authorization
- Clerk JWT required for all operations
- Privy authorization context validates user permissions
- No direct private key access

### 2. Transaction Validation
- Wallet validation before signing
- Amount and address validation
- Gas budget limits

### 3. Error Handling
- Comprehensive error catching at each step
- Detailed logging for debugging
- User-friendly error messages

## Installation & Setup

### 1. Install Dependencies
```bash
npm install @mysten/sui.js
```

### 2. Environment Variables
```env
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

### 3. Network Configuration
- **Mainnet:** `https://fullnode.mainnet.sui.io:443`
- **Testnet:** `https://fullnode.testnet.sui.io:443`
- **Devnet:** `https://fullnode.devnet.sui.io:443`

## Usage Examples

### Basic SUI Transfer
```typescript
import { sendSui } from '@/lib/privy/sui';

const digest = await sendSui(
  walletId,
  '0x1234...', // recipient address
  '1.5',       // amount in SUI
  clerkJwt     // authorization token
);
```

### Transaction Monitoring
```typescript
// Transaction digest can be used to track status
const explorerUrl = `https://suiscan.xyz/mainnet/tx/${digest}`;
```

## Error Handling

### Common Errors

1. **Invalid Wallet**
   - Wallet not found or wrong chain type
   - Solution: Verify wallet exists and is Sui wallet

2. **Insufficient Gas**
   - Not enough SUI for gas fees
   - Solution: Ensure minimum 0.01 SUI balance

3. **Network Errors**
   - RPC connection issues
   - Solution: Check network connectivity and RPC URL

4. **Signing Errors**
   - Authorization failures
   - Solution: Verify Clerk JWT is valid

### Debug Steps

1. Check console logs for detailed error messages
2. Verify wallet address and balance
3. Test RPC connectivity
4. Validate transaction parameters

## Performance Optimizations

1. **Connection Reuse**
   - Reuse SuiClient instances
   - Connection pooling for RPC calls

2. **Gas Optimization**
   - Dynamic gas budget calculation
   - Gas price estimation

3. **Error Recovery**
   - Retry logic for network failures
   - Graceful degradation

## Future Enhancements

1. **Multi-Coin Support**
   - Support for other Sui tokens
   - Token metadata handling

2. **Advanced Transactions**
   - Multi-signature support
   - Complex transaction types

3. **Gas Optimization**
   - Dynamic gas estimation
   - Gas price optimization

4. **Batch Transactions**
   - Multiple transfers in one transaction
   - Atomic operations

## Comparison: Tier 1 vs Tier 2

### Tier 1 (Solana, Ethereum)
```typescript
// Simple API call
const result = await privyClient.wallets()
  .solana()
  .sendTransaction(walletId, params);
```

### Tier 2 (Sui, TON, etc.)
```typescript
// Manual process
1. Build transaction with chain SDK
2. Convert to bytes/hex
3. Raw sign with Privy
4. Submit to network manually
```

This implementation provides full control over Sui transactions while maintaining security through Privy's authorization system.