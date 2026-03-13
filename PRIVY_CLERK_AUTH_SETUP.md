# Privy + Clerk JWT-Based Authentication Setup

## Overview
To enable backend transaction signing with Privy using Clerk authentication, you need to configure JWT-based auth in the Privy dashboard.

## Setup Steps

### 1. Get Clerk's JWKS URL
Your Clerk JWKS URL follows this format:
```
https://<your-clerk-domain>/.well-known/jwks.json
```

For your app, it should be:
```
https://touched-dassie-2.clerk.accounts.dev/.well-known/jwks.json
```

### 2. Configure Privy Dashboard

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Select your app (ID: `cmmni9jmg01680dl8itfo3d2u`)
3. Navigate to **Settings** → **Authentication**
4. Find the **"JWT-based auth"** section
5. Click **"Add JWKS URL"**
6. Enter your Clerk JWKS URL:
   ```
   https://touched-dassie-2.clerk.accounts.dev/.well-known/jwks.json
   ```
7. Save the configuration

### 3. How It Works

Once configured:

1. **User Authentication**: Users authenticate with Clerk (your existing flow)
2. **Wallet Creation**: Privy creates wallets linked to Clerk user IDs
3. **Backend Signing**: Your backend uses Privy's Node SDK with `appId` and `appSecret` to sign transactions
4. **No JWT Required**: The backend doesn't need to pass Clerk JWTs to Privy - Privy authorizes using its own app secret

### 4. Transaction Flow

```typescript
// Backend API route
const result = await privyClient.wallets().solana().sendTransaction(walletId, {
  caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  params: {
    instructions: [/* transaction instructions */]
  }
});
```

Privy handles:
- ✅ Populating missing transaction values (gas, nonce, etc.)
- ✅ Signing the transaction with the user's wallet
- ✅ Broadcasting to the network
- ✅ Returning the transaction hash

### 5. Security Notes

- **App Secret**: Keep `PRIVY_APP_SECRET` secure - it authorizes all backend operations
- **Wallet Authorization**: Privy ensures the backend can only sign for wallets it created
- **User Verification**: Always verify the Clerk user ID before performing wallet operations

### 6. Testing

After configuration:

1. Ensure user has a Privy wallet linked to their Clerk ID
2. Try sending a small test transaction
3. Check Privy dashboard logs for any authorization errors
4. Verify transaction appears on blockchain explorer

### 7. Common Issues

**401 Unauthorized Error**:
- JWKS URL not configured in Privy dashboard
- App secret incorrect or missing
- Wallet not properly linked to user

**Invalid Wallet Error**:
- Wallet ID doesn't exist
- Wallet is for wrong chain type
- User doesn't own the wallet

## Current Configuration

Your environment variables:
```env
PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_SECRET=privy_app_secret_66H9ys4Tf2KRGSUhq91pZ8MY25STJpNfM2WwfgC8Q2VN9o94AAdCsx1yZEhWTNzongDHHCnVyxVUvUCUiQJkpToJ
```

Clerk domain: `touched-dassie-2.clerk.accounts.dev`

## Next Steps

1. ✅ Configure JWKS URL in Privy dashboard (REQUIRED)
2. ✅ Test transaction signing
3. ✅ Monitor Privy dashboard for errors
4. ✅ Implement error handling for 401/403 responses
