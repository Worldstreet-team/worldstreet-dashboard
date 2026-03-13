# Privy Node SDK Migration Complete

## What Changed

Migrated from `@privy-io/server-auth` to `@privy-io/node` for proper server-side wallet operations.

## Key Differences

### Old API (`@privy-io/server-auth`)
```typescript
const client = new PrivyClient(appId, appSecret, {
  walletApi: {
    authorizationPrivateKey: privateKey
  }
});

await client.wallets.solana(walletId).sendTransaction(params);
```

### New API (`@privy-io/node`)
```typescript
const client = new PrivyClient({
  appId,
  appSecret
});

await client.wallets().solana.signAndSendTransaction(walletId, {
  transaction: serializedTx,
  caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
});
```

## Files Updated

### 1. `src/lib/privy/client.ts`
- ✅ Changed import from `@privy-io/server-auth` to `@privy-io/node`
- ✅ Updated client initialization (no longer needs `authorizationPrivateKey`)
- ✅ Removed `PRIVY_AUTH_PRIVATE_KEY` requirement

### 2. `src/lib/privy/solana.ts`
- ✅ Completely rewritten to use `signAndSendTransaction` API
- ✅ Now builds Solana transactions using `@solana/web3.js`
- ✅ Serializes transactions before sending to Privy
- ✅ Uses CAIP-2 chain identifier for Solana mainnet

### 3. `src/lib/privy/wallets.ts`
- ✅ Updated `createUserWallets` to use `client.wallets().create()`
- ✅ Updated `getUserWallets` to use `client.wallets().list()`
- ✅ Changed API from `owner: { userId }` to `userId` directly

## How Solana Transactions Work Now

### 1. Build Transaction
```typescript
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(wallet.address),
    toPubkey: new PublicKey(toAddress),
    lamports: amount,
  })
);
```

### 2. Set Blockhash & Fee Payer
```typescript
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = fromPubkey;
```

### 3. Serialize Transaction
```typescript
const serializedTransaction = transaction.serialize({
  requireAllSignatures: false,
  verifySignatures: false,
});
```

### 4. Sign & Send via Privy
```typescript
const result = await privyClient.wallets().solana.signAndSendTransaction(walletId, {
  transaction: serializedTransaction,
  caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
});
```

## Environment Variables

### No Longer Needed
- ❌ `PRIVY_AUTH_PRIVATE_KEY` - Not required for `@privy-io/node`

### Still Required
- ✅ `PRIVY_APP_ID`
- ✅ `PRIVY_APP_SECRET`
- ✅ `NEXT_PUBLIC_SOLANA_RPC_URL`

## CAIP-2 Chain Identifiers

For reference, here are the CAIP-2 identifiers for each chain:

```typescript
// Solana Mainnet
"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"

// Ethereum Mainnet
"eip155:1"

// Polygon
"eip155:137"

// Tron Mainnet
"tron:0x2b6653dc"
```

## Testing

### 1. Test Wallet Creation
```bash
curl -X POST http://localhost:3000/api/privy/onboarding \
  -H "Content-Type: application/json" \
  -b "your-clerk-session-cookie"
```

### 2. Test SOL Transfer
```bash
curl -X POST http://localhost:3000/api/privy/wallet/solana/send \
  -H "Content-Type: application/json" \
  -b "your-clerk-session-cookie" \
  -d '{
    "to": "RECIPIENT_ADDRESS",
    "amount": "0.001"
  }'
```

## Benefits of @privy-io/node

1. **Simpler Setup**: No need for authorization private key
2. **Better Documentation**: More examples and clearer API
3. **Full Control**: Build transactions yourself, Privy just signs
4. **Flexibility**: Can add custom instructions, memo, etc.
5. **Debugging**: Easier to debug transaction building vs signing

## Next Steps for Other Chains

The same pattern can be applied to other chains:

### Ethereum
```typescript
// Build transaction
const tx = {
  to: recipientAddress,
  value: ethers.utils.parseEther(amount),
  // ... other fields
};

// Sign and send
await client.wallets().ethereum.signAndSendTransaction(walletId, {
  transaction: serializedTx,
  caip2: "eip155:1"
});
```

### Tron
```typescript
// Build transaction
const transaction = await tronWeb.transactionBuilder.sendTrx(
  toAddress,
  amount,
  fromAddress
);

// Sign and send
await client.wallets().tron.signAndSendTransaction(walletId, {
  transaction: transaction,
  caip2: "tron:0x2b6653dc"
});
```

## Troubleshooting

### Error: "Property 'wallets' does not exist"
**Solution**: Make sure you're using `@privy-io/node`, not `@privy-io/server-auth`

### Error: "Transaction simulation failed"
**Solution**: Check that the transaction is properly built with correct blockhash and fee payer

### Error: "Invalid CAIP-2 identifier"
**Solution**: Use the correct chain identifier for your network

## Documentation

- Privy Node SDK: https://docs.privy.io/guide/server/wallets/embedded
- CAIP-2 Standard: https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/

## Summary

Your Privy integration now uses the correct `@privy-io/node` SDK with the `signAndSendTransaction` API. This gives you full control over transaction building while Privy handles the secure signing in their HSM.
