# Privy Wallet Send API Standardization

## Overview
This document outlines the standardization of Privy wallet send APIs across all supported chains (Solana, Ethereum, Sui) to follow a consistent pattern for authentication, authorization, and transaction handling.

## Changes Made

### 1. Ethereum Send API (`/api/privy/wallet/ethereum/send`)

**Before:**
- Used `verifyClerkJWT` helper function
- Queried database by `clerkUserId`
- Limited error handling and logging
- Inconsistent authentication flow

**After:**
- Uses Clerk's `auth()` function directly like Solana
- Queries database by `email` (consistent with get-wallet pattern)
- Enhanced error handling with detailed logging
- Proper JWT authorization context for Privy
- Consistent response format with transaction details

### 2. Sui Send API (`/api/privy/wallet/sui/send`)

**Before:**
- Used `verifyClerkJWT` helper function
- Queried database by `clerkUserId`
- Limited error handling and logging
- Inconsistent authentication flow

**After:**
- Uses Clerk's `auth()` function directly like Solana
- Queries database by `email` (consistent with get-wallet pattern)
- Enhanced error handling with detailed logging
- Proper JWT authorization context for Privy
- Consistent response format with transaction details

### 3. Library Updates

#### Ethereum Library (`src/lib/privy/ethereum.ts`)
- Updated `sendEthereumTransaction` to require and use Clerk JWT
- Added proper authorization context for Privy API calls
- Enhanced error handling and logging
- Made JWT parameter required (not optional)

#### Sui Library (`src/lib/privy/sui.ts`)
- Updated to use consistent authorization context format
- Enhanced error handling and logging
- Removed dependency on separate authorization helper
- Simplified authorization context creation

## Standardized Pattern

All chain send APIs now follow this consistent pattern:

### 1. Authentication Flow
```typescript
// 1. Authenticate with Clerk and get JWT
const { userId, getToken } = await auth();

// 2. Validate user session
if (!userId) {
  return NextResponse.json(
    { error: "Unauthorized - No active session found" },
    { status: 401 }
  );
}

// 3. Get Clerk JWT token
const clerkJwt = await getToken();
if (!clerkJwt) {
  return NextResponse.json(
    { error: "Authentication token not available" },
    { status: 401 }
  );
}
```

### 2. User Identification
```typescript
// Get user's email from Clerk (consistent with get-wallet)
const { clerkClient } = await import("@clerk/nextjs/server");
const client = await clerkClient();
const clerkUser = await client.users.getUser(userId);
const email = clerkUser.emailAddresses[0]?.emailAddress;
```

### 3. Database Query
```typescript
// Query by email (consistent with get-wallet pattern)
const userWallet = await UserWallet.findOne({ email });
```

### 4. Wallet Validation
```typescript
// Check if specific chain wallet exists
if (!userWallet.wallets?.[chainType]) {
  return NextResponse.json(
    { 
      error: `${chainType} wallet not found`,
      hint: `Please create a ${chainType} wallet first by calling /api/privy/get-wallet?email=${email}`
    },
    { status: 404 }
  );
}
```

### 5. Transaction Execution
```typescript
// Send transaction with proper authorization
const result = await sendChainToken(walletId, to, amount.toString(), clerkJwt);
```

### 6. Response Format
```typescript
return NextResponse.json({
  success: true,
  [transactionIdField]: result[transactionIdField], // signature/transactionHash/digest
  status: result.status,
  from: userWallet.wallets[chainType].address,
  to,
  amount: amountNum,
  // Chain-specific fields (e.g., explorerUrl for Sui)
});
```

## Benefits of Standardization

1. **Consistency**: All chains now use the same authentication and database query patterns
2. **Maintainability**: Easier to maintain and debug with consistent code structure
3. **Security**: Proper JWT authorization for all Privy operations
4. **Error Handling**: Comprehensive error handling and logging across all chains
5. **User Experience**: Consistent API responses and error messages
6. **Database Consistency**: All APIs query by email, matching the get-wallet pattern

## Security Improvements

1. **Required JWT**: All chain operations now require valid Clerk JWT tokens
2. **Proper Authorization Context**: Privy operations use correct authorization context
3. **Enhanced Validation**: Improved input validation and error handling
4. **Consistent Database Queries**: All APIs use email-based queries for consistency

## Testing Recommendations

1. Test each chain's send API with valid Clerk authentication
2. Verify proper error handling for missing wallets
3. Confirm transaction signing works with JWT authorization
4. Test database queries work correctly with email-based lookups
5. Validate response formats are consistent across chains

## Migration Notes

- Old APIs using `clerkUserId` database queries will continue to work
- New APIs use `email` queries for consistency with wallet creation
- JWT authorization is now required for all transaction operations
- Error messages provide helpful hints for wallet creation