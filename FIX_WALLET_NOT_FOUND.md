# Fix: Solana Wallet Not Found Error

## Problem

You're getting "Solana wallet not found" error even though the wallets exist in Privy. This happens because:

1. Wallets were created via `/api/privy/get-wallet` (which doesn't save `clerkUserId`)
2. The send route looks for wallets by `clerkUserId`
3. The database record exists but doesn't have the `clerkUserId` field populated

## Solution: Link Clerk User to Existing Wallet

### Option 1: Call the Link Endpoint (Quickest)

Call this endpoint to link your Clerk user to the existing Privy wallet:

```bash
curl -X POST http://localhost:3000/api/privy/link-clerk \
  -H "Content-Type: application/json" \
  -b "your-clerk-session-cookie"
```

Or from your frontend:

```typescript
const response = await fetch('/api/privy/link-clerk', {
  method: 'POST',
  credentials: 'include'
});

const data = await response.json();
console.log('Linked:', data);
```

### Option 2: Update Database Manually

If you have access to MongoDB, update the record:

```javascript
db.userwallets.updateOne(
  { email: "your-email@example.com" },
  { $set: { clerkUserId: "your-clerk-user-id" } }
)
```

### Option 3: Use the Onboarding Endpoint

The `/api/privy/onboarding` endpoint properly creates wallets with Clerk ID:

```typescript
const response = await fetch('/api/privy/onboarding', {
  method: 'POST',
  credentials: 'include'
});
```

This will:
1. Get your Clerk user ID
2. Create Privy user
3. Create all 5 chain wallets
4. Save to database with `clerkUserId`

## Verify It Worked

After linking, try sending SOL again. The send route should now find your wallet.

## Prevention: Always Use Onboarding

Going forward, use `/api/privy/onboarding` instead of `/api/privy/get-wallet` for new users. The onboarding endpoint properly links Clerk and Privy.

## Updated Send Route

I've updated the send route to provide better error messages:

```typescript
{
  error: "Solana wallet not found. Please create a wallet first.",
  hint: "Call /api/privy/onboarding to create wallets"
}
```

## Quick Test

1. Call `/api/privy/link-clerk` (POST)
2. Try sending SOL again
3. Should work now!

## Database Schema

Your `UserWallet` should have:

```typescript
{
  clerkUserId: "user_xxx",  // ← This was missing!
  email: "user@example.com",
  privyUserId: "did:privy:xxx",
  wallets: {
    solana: {
      walletId: "z9piguh4y0tjy6satb6o7cmh",
      address: "E4fXvmcH71e6kJTHC1itnec7sN8Wvd3tc1nQ3qJMVFKe"
    },
    // ... other chains
  }
}
```
