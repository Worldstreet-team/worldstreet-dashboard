# Backend Drift Client Initialization Fix

## Problem

The backend is failing to initialize Drift clients because it's trying to use a null public key. The error occurs because:

```
Cannot read properties of null (reading 'publicKey')
```

This happens when the Drift client is initialized without a valid wallet keypair.

## Root Cause

Each user has their own futures wallet with a unique keypair. The Drift Protocol requires a wallet to be provided when initializing the DriftClient. The backend is currently trying to initialize Drift without fetching the user's specific wallet first.

## Solution

The backend needs to follow this flow for EVERY Drift operation:

### 1. Fetch User's Futures Wallet

```javascript
async function getUserFuturesWallet(userId) {
  // Query database for user's futures wallet
  const wallet = await db.query(
    'SELECT encrypted_private_key, public_address FROM futures_wallets WHERE user_id = $1 AND chain = $2',
    [userId, 'solana']
  );
  
  if (!wallet || wallet.rows.length === 0) {
    throw new Error('Futures wallet not found. Please create a futures wallet first.');
  }
  
  return wallet.rows[0];
}
```

### 2. Decrypt Private Key

```javascript
async function decryptPrivateKey(encryptedKey) {
  // Decrypt using your encryption method
  const decrypted = decrypt(encryptedKey, process.env.ENCRYPTION_KEY);
  return decrypted;
}
```

### 3. Create Keypair from Private Key

```javascript
const { Keypair } = require('@solana/web3.js');

function createKeypairFromPrivateKey(privateKeyString) {
  // Convert private key string to Uint8Array
  const privateKeyBytes = bs58.decode(privateKeyString);
  // Or if stored as hex:
  // const privateKeyBytes = Buffer.from(privateKeyString, 'hex');
  
  return Keypair.fromSecretKey(privateKeyBytes);
}
```

### 4. Initialize User-Specific Drift Client

```javascript
const { DriftClient } = require('@drift-labs/sdk');
const { Connection, PublicKey } = require('@solana/web3.js');

async function initializeDriftClient(userId) {
  // 1. Get user's wallet
  const walletData = await getUserFuturesWallet(userId);
  
  // 2. Decrypt private key
  const privateKey = await decryptPrivateKey(walletData.encrypted_private_key);
  
  // 3. Create keypair
  const keypair = createKeypairFromPrivateKey(privateKey);
  
  // 4. Create wallet adapter
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map(tx => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
  
  // 5. Initialize Drift client
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  
  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'mainnet-beta', // or 'devnet' for testing
  });
  
  await driftClient.subscribe();
  
  return driftClient;
}
```

### 5. Use in Drift Operations

```javascript
// Example: Get Collateral
async function getCollateral(userId) {
  try {
    // Initialize user-specific Drift client
    const driftClient = await initializeDriftClient(userId);
    
    // Get user account
    const userAccount = driftClient.getUser();
    
    // Get collateral info
    const collateral = {
      total: userAccount.getTotalCollateral().toNumber() / 1e6, // USDC has 6 decimals
      available: userAccount.getFreeCollateral().toNumber() / 1e6,
      used: userAccount.getMarginRequirement().toNumber() / 1e6,
      currency: 'USDC',
      exists: true,
    };
    
    // Unsubscribe when done
    await driftClient.unsubscribe();
    
    return collateral;
  } catch (error) {
    console.error('Get collateral error:', error);
    throw error;
  }
}

// Example: Open Position
async function openPosition(userId, marketIndex, side, size, leverage) {
  try {
    // Initialize user-specific Drift client
    const driftClient = await initializeDriftClient(userId);
    
    // Place order
    const orderParams = {
      orderType: OrderType.MARKET,
      marketIndex,
      direction: side === 'LONG' ? PositionDirection.LONG : PositionDirection.SHORT,
      baseAssetAmount: new BN(size * 1e9), // Convert to base units
      // ... other params
    };
    
    const txSig = await driftClient.placeOrder(orderParams);
    
    // Unsubscribe when done
    await driftClient.unsubscribe();
    
    return { txHash: txSig };
  } catch (error) {
    console.error('Open position error:', error);
    throw error;
  }
}
```

## Important Notes

### 1. Client Lifecycle
- **Create a new DriftClient for each request**
- Initialize with user's specific wallet
- Subscribe to Drift data
- Perform operation
- Unsubscribe when done
- Don't reuse clients across users

### 2. Error Handling
```javascript
async function safeInitializeDriftClient(userId) {
  try {
    const walletData = await getUserFuturesWallet(userId);
    
    if (!walletData) {
      throw new Error('WALLET_NOT_FOUND');
    }
    
    // ... rest of initialization
    
  } catch (error) {
    if (error.message === 'WALLET_NOT_FOUND') {
      throw new Error('Futures wallet not found. Please create one first.');
    }
    throw new Error(`Drift initialization failed: ${error.message}`);
  }
}
```

### 3. Connection Pooling
Consider reusing the Solana connection:

```javascript
let connection = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(
      process.env.SOLANA_RPC_URL,
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      }
    );
  }
  return connection;
}
```

### 4. Wallet Not Found Response
When a user doesn't have a futures wallet:

```javascript
app.get('/api/futures/collateral', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Check if wallet exists first
    const wallet = await getUserFuturesWallet(userId);
    
    if (!wallet) {
      return res.status(404).json({
        error: 'Futures wallet not found',
        message: 'Please create a futures wallet first',
        code: 'WALLET_NOT_FOUND',
      });
    }
    
    const collateral = await getCollateral(userId);
    res.json({ userId, chain: 'solana', collateral });
    
  } catch (error) {
    console.error('Collateral error:', error);
    res.status(500).json({
      error: 'Failed to fetch collateral',
      message: error.message,
    });
  }
});
```

## Updated Backend Flow

For EVERY Drift operation:

```
1. Receive request with userId
2. Query database for user's futures wallet
3. If no wallet found → return 404 with "create wallet first" message
4. Decrypt wallet's private key
5. Create Keypair from private key
6. Initialize DriftClient with user's keypair
7. Subscribe to Drift
8. Perform operation (get collateral, open position, etc.)
9. Unsubscribe from Drift
10. Return result
```

## Testing

Test with multiple users to ensure each gets their own Drift client:

```javascript
// User 1
const user1Collateral = await getCollateral('user123');

// User 2
const user2Collateral = await getCollateral('user456');

// Should return different data for different users
```

## Summary

The key fix is:
1. **Always fetch the user's specific futures wallet from the database**
2. **Initialize a new DriftClient with that user's keypair for each request**
3. **Never try to initialize Drift without a valid wallet**
4. **Return proper 404 errors when wallet doesn't exist**

This ensures each user has their own isolated Drift account and prevents the "Cannot read properties of null" error.
