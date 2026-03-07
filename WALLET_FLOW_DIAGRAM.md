# Wallet Flow Diagram

## Current Architecture (Correct & Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S DEVICE                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PIN Entry (6 digits)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Client-Side Decryption                       │  │
│  │         (Private key never leaves device)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Main Solana Wallet (Keypair)                    │  │
│  │                                                            │  │
│  │  Public Key:  ABC123...XYZ                                │  │
│  │  Private Key: [Decrypted in memory]                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               ↓
┌──────────────────────────────┼───────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                              │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Drift Protocol Account (PDA)                 │   │
│  │                                                            │   │
│  │  Authority: ABC123...XYZ (Main Wallet)                    │   │
│  │  Subaccount: 0                                            │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │         USDC Collateral: 1,000.00                  │  │   │
│  │  │         (Shared Balance)                           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                              ↓                            │   │
│  │              ┌───────────────┴───────────────┐           │   │
│  │              ↓                               ↓           │   │
│  │  ┌─────────────────────┐       ┌─────────────────────┐  │   │
│  │  │   SPOT TRADING      │       │  FUTURES TRADING    │  │   │
│  │  │                     │       │                     │  │   │
│  │  │  • Buy/Sell tokens  │       │  • Long/Short perps │  │   │
│  │  │  • Uses collateral  │       │  • Uses collateral  │  │   │
│  │  │  • Instant execution│       │  • Leverage trading │  │   │
│  │  └─────────────────────┘       └─────────────────────┘  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Deposit Flow

```
┌──────────────────┐
│   Main Wallet    │  1,500 USDC
│   (Solana SPL)   │
└────────┬─────────┘
         │
         │ User clicks "Transfer to Trading Wallet"
         │ Enters amount: 1,000 USDC
         │ Confirms with PIN
         │
         ↓
┌────────────────────────────────────────┐
│  Transaction: Transfer USDC            │
│  From: Main Wallet                     │
│  To: Drift Account (User's PDA)        │
│  Amount: 1,000 USDC                    │
│  Fee: ~0.00001 SOL                     │
└────────┬───────────────────────────────┘
         │
         ↓
┌──────────────────┐
│   Main Wallet    │  500 USDC (remaining)
└──────────────────┘

┌──────────────────┐
│  Drift Account   │  1,000 USDC (collateral)
│  (Trading Wallet)│  ↓
│                  │  Available for:
│                  │  • Spot Trading
│                  │  • Futures Trading
└──────────────────┘
```

## Trading Flow (Spot)

```
┌──────────────────────────────────────────┐
│         Drift Account Collateral         │
│              1,000 USDC                  │
└────────────────┬─────────────────────────┘
                 │
                 │ User wants to buy SOL
                 │ Amount: 100 USDC worth
                 │
                 ↓
┌────────────────────────────────────────┐
│  Drift Spot Order                      │
│  Market: SOL-PERP                      │
│  Side: BUY                             │
│  Amount: 100 USDC                      │
└────────┬───────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│         Updated Collateral               │
│         900 USDC                         │
│         + 5 SOL (worth ~100 USDC)        │
│                                          │
│  Total Value: ~1,000 USDC                │
└──────────────────────────────────────────┘
```

## Trading Flow (Futures)

```
┌──────────────────────────────────────────┐
│         Drift Account Collateral         │
│              1,000 USDC                  │
└────────────────┬─────────────────────────┘
                 │
                 │ User opens long position
                 │ Market: SOL-PERP
                 │ Size: 10 SOL
                 │ Leverage: 5x
                 │
                 ↓
┌────────────────────────────────────────┐
│  Drift Perp Order                      │
│  Market: SOL-PERP                      │
│  Direction: LONG                       │
│  Size: 10 SOL                          │
│  Leverage: 5x                          │
│  Required Margin: 200 USDC             │
└────────┬───────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│         Updated Collateral               │
│         Total: 1,000 USDC                │
│         Used: 200 USDC (margin)          │
│         Free: 800 USDC                   │
│                                          │
│  Open Position:                          │
│  • 10 SOL LONG @ $20                     │
│  • Notional: $200                        │
│  • Leverage: 5x                          │
└──────────────────────────────────────────┘
```

## Withdrawal Flow

```
┌──────────────────┐
│  Drift Account   │  1,000 USDC
│  (Trading Wallet)│
└────────┬─────────┘
         │
         │ User clicks "Withdraw"
         │ Amount: 500 USDC
         │ Confirms with PIN
         │
         ↓
┌────────────────────────────────────────┐
│  Transaction: Withdraw USDC            │
│  From: Drift Account                   │
│  To: Main Wallet                       │
│  Amount: 500 USDC                      │
│  Fee: ~0.00001 SOL                     │
└────────┬───────────────────────────────┘
         │
         ↓
┌──────────────────┐
│  Drift Account   │  500 USDC (remaining)
└──────────────────┘

┌──────────────────┐
│   Main Wallet    │  500 USDC (withdrawn)
└──────────────────┘
```

## Key Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLET HIERARCHY                          │
│                                                              │
│  Main Solana Wallet (User Controls)                         │
│         │                                                    │
│         ├─→ Public Key: ABC123...XYZ                        │
│         ├─→ Private Key: Encrypted with PIN                 │
│         │                                                    │
│         └─→ Controls                                         │
│              │                                               │
│              ↓                                               │
│         Drift Account (PDA)                                  │
│              │                                               │
│              ├─→ Derived from Main Wallet                   │
│              ├─→ Subaccount: 0                              │
│              ├─→ USDC Collateral (Shared)                   │
│              │                                               │
│              └─→ Used By                                     │
│                   │                                          │
│                   ├─→ Spot Trading                          │
│                   └─→ Futures Trading                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## What This Means

### ✅ Single Source of Truth
- **One wallet** = One private key
- **One Drift account** = One PDA
- **One balance** = Shared collateral

### ✅ Simple Mental Model
```
Main Wallet → Drift Account → Trading (Spot + Futures)
     ↑                              ↓
     └──────── Withdraw ─────────────┘
```

### ✅ No Confusion
- No "spot wallet" vs "futures wallet"
- No "transfer between wallets"
- No multiple balances to track

### ✅ Efficient
- One deposit transaction
- One withdrawal transaction
- Shared liquidity
- Lower fees

## Comparison: Old vs New

### ❌ Old (Complex & Wrong)
```
Main Wallet
    ↓
    ├─→ Spot Wallet (Separate)
    │    └─→ Spot Trading
    │
    └─→ Futures Wallet (Separate)
         └─→ Futures Trading

Problems:
• Need to transfer between wallets
• Fragmented liquidity
• Multiple rent costs
• Confusing UX
```

### ✅ New (Simple & Correct)
```
Main Wallet
    ↓
    └─→ Drift Account
         ├─→ Spot Trading
         └─→ Futures Trading

Benefits:
• Direct deposit/withdraw
• Unified liquidity
• Single rent cost
• Clear UX
```

## Technical Implementation

### Wallet Creation (One Time)
```typescript
// User creates wallet during onboarding
const solanaWallet = Keypair.generate();
const encryptedKey = encryptWithPIN(solanaWallet.secretKey, pin);

// Save to database
await saveWallet({
  solana: {
    address: solanaWallet.publicKey.toBase58(),
    encryptedPrivateKey: encryptedKey
  }
});
```

### Drift Account Initialization (One Time)
```typescript
// Derive Drift account PDA
const [driftAccountPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('user'),
    solanaWallet.publicKey.toBuffer(),
    new Uint8Array([0, 0]), // subaccount 0
  ],
  DRIFT_PROGRAM_ID
);

// Initialize on-chain
await driftClient.initializeUserAccount(0, "worldstreet-user");
```

### Every Transaction
```typescript
// 1. Get encrypted key
const { encryptedPrivateKey } = await getWalletKeys(pin);

// 2. Decrypt client-side
const secretKey = decryptWithPIN(encryptedPrivateKey, pin);
const keypair = Keypair.fromSecretKey(secretKey);

// 3. Create Drift client
const wallet = new Wallet(keypair);
const driftClient = new DriftClient({ connection, wallet });

// 4. Execute operation (deposit/trade/withdraw)
await driftClient.deposit(amount, marketIndex, tokenAccount);
```

## Conclusion

The architecture is **beautifully simple**:

1. User has ONE Solana wallet
2. That wallet controls ONE Drift account
3. That Drift account has ONE USDC balance
4. That balance is used for BOTH spot and futures

No separate wallets. No complex transfers. Just clean, efficient trading.

**This is the correct way to build a Drift-based trading platform!**
