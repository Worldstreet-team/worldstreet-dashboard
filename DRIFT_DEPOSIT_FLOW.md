# Drift Collateral Deposit Flow

## Overview
Users deposit USDC as collateral to trade on Drift Protocol. A 5% platform fee is deducted and sent to the master wallet.

## Deposit Process

### 1. User Input
- User enters amount in USDC (e.g., 100 USDC)
- UI shows breakdown:
  - Total Amount: 100 USDC
  - Platform Fee (5%): -5 USDC
  - Net Collateral: 95 USDC

### 2. Transaction Flow

#### Step 1: Fee Transfer to Master Wallet
- **Asset**: USDC (SPL Token)
- **Amount**: 5% of deposit (5 USDC in example)
- **From**: User's USDC token account
- **To**: Master wallet's USDC token account (3eeHwZi4uRNmXJ4zs6167xR5ZvLfPa9kTwLJ8gaN9J7T)
- **Method**: SPL Token transfer instruction
- **Units**: Amount × 1e6 (USDC has 6 decimals)

#### Step 2: Collateral Deposit to Drift
- **Asset**: USDC
- **Amount**: Net amount after fee (95 USDC in example)
- **From**: User's USDC token account
- **To**: Drift Protocol (market index 0 = USDC)
- **Method**: `client.deposit()`
- **Units**: Amount × 1e6 (USDC has 6 decimals)

### 3. Transaction Fees
- **Network Fees**: Paid in SOL (Solana's native token)
- **Source**: User's SOL balance
- **Amount**: ~0.00001-0.0001 SOL per transaction
- **Note**: User needs small SOL balance for transaction fees

## Code Implementation

### Fee Calculation
```typescript
// From src/config/drift.ts
export function calculateFee(amount: number): { fee: number; netAmount: number } {
  const fee = amount * 0.05; // 5%
  const netAmount = amount - fee;
  return { fee, netAmount };
}
```

### Deposit Function
```typescript
// From src/app/context/driftContext.tsx
const depositCollateral = async (amount: number) => {
  // 1. Calculate fee
  const { fee, netAmount } = calculateFee(amount);
  
  // 2. Send fee to master wallet (USDC SPL token transfer)
  const feeTransaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      userPublicKey,
      Math.floor(fee * 1e6), // USDC base units
      [],
      TOKEN_PROGRAM_ID
    )
  );
  await sendAndConfirm(feeTransaction);
  
  // 3. Deposit net amount to Drift
  const txSignature = await client.deposit(
    Math.floor(netAmount * 1e6), // USDC base units
    0, // USDC market index
    userAccountPublicKey
  );
  await confirmTransaction(txSignature);
};
```

## Important Notes

1. **USDC vs SOL**:
   - Collateral: USDC (SPL token)
   - Platform fee: USDC (sent to master wallet)
   - Network fees: SOL (for transaction costs)

2. **Decimal Precision**:
   - USDC has 6 decimals
   - Always multiply by 1e6 when converting to base units
   - Use `Math.floor()` to avoid floating point issues

3. **Master Wallet**:
   - Address: 3eeHwZi4uRNmXJ4zs6167xR5ZvLfPa9kTwLJ8gaN9J7T
   - Receives 5% fee in USDC
   - Must have USDC associated token account

4. **User Requirements**:
   - USDC balance ≥ deposit amount
   - SOL balance ≥ ~0.001 SOL (for transaction fees)
   - Drift account must be initialized

## Withdrawal Process

### Flow
1. User requests withdrawal amount (e.g., 50 USDC)
2. Drift withdraws from user's collateral
3. USDC sent to user's token account
4. No fee on withdrawal

### Code
```typescript
const withdrawCollateral = async (amount: number) => {
  const txSignature = await client.withdraw(
    Math.floor(amount * 1e6), // USDC base units
    0, // USDC market index
    userAccountPublicKey
  );
  await confirmTransaction(txSignature);
};
```

## UI Components

### CollateralDepositModal
- Shows USDC input
- Displays fee breakdown
- Handles deposit transaction
- Shows success/error states

### CollateralPanel
- Displays total/available/used collateral
- Deposit and withdraw buttons
- Quick percentage buttons for withdrawal
- Real-time balance updates

## Error Handling

Common errors:
- Insufficient USDC balance
- Insufficient SOL for fees
- Master wallet token account not found
- Drift account not initialized
- Network/RPC errors

All errors are caught and displayed to user with clear messages.
