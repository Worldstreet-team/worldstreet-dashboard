# Hyperliquid Trading Wallet - Authorization Context Integration

## Overview

This document explains how the Privy authorization context is integrated into the Hyperliquid trading wallet setup, enabling secure transaction signing using Clerk JWT authentication.

## Authorization Flow

```
Clerk User Session
    ↓
Clerk JWT Token
    ↓
Privy Authentication API
    ↓
Authorization Private Key
    ↓
Authorization Context
    ↓
Viem Account (with context)
    ↓
Hyperliquid Exchange Client
```

## Implementation Details

### 1. Authorization Context Creation

The authorization context is created using the same pattern as the Sui implementation:

```typescript
// Get Clerk JWT from authenticated session
const { userId, getToken } = await auth();
const clerkJwt = await getToken();

// Create authorization context from JWT
const authorizationContext = await createAuthorizationContext(clerkJwt);

// Validate the context
if (!validateAuthorizationContext(authorizationContext)) {
  throw new Error('Invalid authorization context');
}
```

### 2. Privy Authentication API

The authorization key is obtained from Privy's authentication endpoint:

```typescript
const authResponse = await fetch('https://api.privy.io/v1/wallets/authenticate', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
    ).toString('base64')}`,
    'Content-Type': 'application/json',
    'privy-app-id': process.env.PRIVY_APP_ID!,
  },
  body: JSON.stringify({
    user_jwt: clerkJwt
  })
});

const authData = await authResponse.json();
const userKey = authData.authorization_key;
```

### 3. Viem Account with Authorization

The Viem account is created and the authorization context is attached:

```typescript
// Create Viem account
const viemAccount = createViemAccount(privyNode, {
  walletId: tradingWallet.id,
  address: tradingWallet.address as `0x${string}`,
});

// Attach authorization context for transaction signing
(viemAccount as any)._authorizationContext = authorizationContext;
```

### 4. Hyperliquid Integration

The Hyperliquid service receives both the Viem account and authorization context:

```typescript
const hyperliquidSetup = await hyperliquidService.initializeTradingWallet({
  address: tradingWallet.address,
  walletId: tradingWallet.id,
  chainType: 'ethereum'
}, viemAccount, authorizationContext);
```

## API Endpoints

### Setup Trading Wallet with Authorization
**POST** `/api/privy/setup-trading-wallet`

Now includes full authorization context setup:

**Request:**
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
    "viemAccount": {
      "address": "0x...",
      "ready": true,
      "authorized": true
    },
    "authorization": {
      "authenticated": true,
      "contextCreated": true,
      "contextValid": true,
      "keysCount": 1
    },
    "hyperliquid": {
      "success": true,
      "hasAuthorizationContext": true,
      "initialized": true
    }
  }
}
```

### Test Authorization Flow
**GET** `/api/privy/test-authorization`

Tests the complete authorization flow:

**Response:**
```json
{
  "success": true,
  "test_results": {
    "clerk_auth": {
      "user_id": "user_xxx",
      "jwt_obtained": true,
      "jwt_length": 1234
    },
    "privy_auth": {
      "context_created": true,
      "context_valid": true,
      "keys_count": 1,
      "error": null
    },
    "overall_status": "SUCCESS"
  }
}
```

## Authorization Context Structure

```typescript
interface AuthorizationContext {
  authorization_private_keys: string[];
}
```

The authorization context contains:
- **authorization_private_keys**: Array of private keys obtained from Privy authentication
- These keys enable the Viem account to sign transactions on behalf of the user

## Security Considerations

1. **JWT Validation**: Clerk JWT is validated by Privy's authentication endpoint
2. **Key Isolation**: Authorization keys are scoped to the specific user session
3. **Context Attachment**: Authorization context is attached to the Viem account for transaction signing
4. **Secure Storage**: Keys are not stored permanently, only used for the session

## Transaction Signing Flow

When a transaction needs to be signed:

1. **Viem Account**: Uses the attached authorization context
2. **Privy SDK**: Validates the authorization keys
3. **Transaction Signing**: Signs the transaction using the user's private keys
4. **Hyperliquid**: Submits the signed transaction to the exchange

## Files Created/Modified

### New Files:
- `src/lib/privy/authorization.ts` - Authorization context utilities
- `src/app/api/privy/test-authorization/route.ts` - Authorization test endpoint
- `HYPERLIQUID_AUTHORIZATION_INTEGRATION.md` - This documentation

### Modified Files:
- `src/app/api/privy/setup-trading-wallet/route.ts` - Added authorization context
- `src/lib/hyperliquid/client.ts` - Added authorization context support

## Testing

### 1. Test Authorization Flow
```bash
curl -H "Authorization: Bearer CLERK_JWT" \
  http://localhost:3000/api/privy/test-authorization
```

### 2. Setup Trading Wallet with Authorization
```bash
curl -X POST http://localhost:3000/api/privy/setup-trading-wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLERK_JWT" \
  -d '{"email":"test@example.com","clerkUserId":"user_123"}'
```

### 3. Verify Authorization Context
Check the response for:
- `authorization.authenticated: true`
- `authorization.contextCreated: true`
- `authorization.contextValid: true`
- `hyperliquid.hasAuthorizationContext: true`

## Error Handling

Common authorization errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "No Clerk JWT available" | User not authenticated | Ensure user is logged in with Clerk |
| "Failed to authenticate with Privy" | Invalid JWT or Privy config | Check Privy app credentials |
| "Invalid authorization context" | Malformed response from Privy | Verify Privy API response format |
| "Authorization context not applied" | Viem account creation failed | Check Viem account creation process |

## Next Steps

1. **Transaction Testing**: Test actual transaction signing with the authorized Viem account
2. **Error Recovery**: Implement authorization context refresh for expired keys
3. **Performance**: Cache authorization contexts for session duration
4. **Monitoring**: Add logging for authorization context usage in transactions