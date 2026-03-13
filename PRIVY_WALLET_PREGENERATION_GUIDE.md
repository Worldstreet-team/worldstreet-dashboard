# Privy Wallet Pregeneration Guide

This guide explains how the Privy wallet pregeneration system works with Clerk authentication.

## Overview

- **Clerk** handles user authentication (login/signup)
- **Privy** generates and manages Solana embedded wallets server-side
- Wallets are pregenerated when users first log in
- Users don't need to interact with Privy directly

## Setup

### 1. Get Your Privy App Secret

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Select your app
3. Go to Settings → API Keys
4. Copy your **App Secret** (not the App ID, you already have that)

### 2. Update .env.local

Add your Privy App Secret to `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_SECRET=your-actual-app-secret-here
```

**Important:** Never commit `.env.local` to git!

### 3. Test Locally

To test locally without Clerk production issues:

1. Make sure you're on the `devtomiwa` branch:
   ```bash
   git checkout devtomiwa
   ```

2. Start your dev server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. Log in with Clerk (use development mode)

4. Open browser console (F12) and look for logs:
   ```
   [WalletPregenerator] Checking/creating wallet for: user@example.com
   [WalletPregenerator] Wallet created: <solana-address>
   [SolanaContext] Setting address from pregenerated wallet: <solana-address>
   ```

## How It Works

### Flow Diagram

```
User Signs Up/Logs In (Clerk)
         ↓
Dashboard Layout Loads
         ↓
WalletPregenerator Component Runs
         ↓
Checks if wallet exists (/api/privy/get-wallet)
         ↓
    ┌────┴────┐
    │         │
  Exists   Doesn't Exist
    │         │
    │    Creates wallet (/api/privy/pregenerate-wallet)
    │         │
    └────┬────┘
         ↓
SolanaContext fetches wallet
         ↓
Wallet address set automatically
         ↓
User can trade!
```

### Components

1. **WalletPregenerator** (`src/components/privy/WalletPregenerator.tsx`)
   - Runs on dashboard load
   - Checks if user has a wallet
   - Creates one if they don't

2. **usePregeneratedWallet** (`src/hooks/usePregeneratedWallet.ts`)
   - Hook to fetch wallet from server
   - Used by SolanaContext

3. **API Routes**:
   - `/api/privy/pregenerate-wallet` - Creates new wallet
   - `/api/privy/get-wallet` - Fetches existing wallet

### Server-Side Wallet Creation

When a wallet is created, Privy:
1. Generates a Solana keypair
2. Encrypts the private key
3. Stores it securely in their infrastructure
4. Returns the public address

The wallet is immediately available and can receive funds.

## Testing

### Test Wallet Creation

1. Create a new test user in Clerk
2. Log in with that user
3. Check console logs for wallet creation
4. Verify wallet address appears in your app

### Test Wallet Retrieval

1. Log out
2. Log back in with the same user
3. Check console - should say "Wallet already exists"
4. Same wallet address should be loaded

### Manual API Testing

Test wallet creation:
```bash
curl -X POST http://localhost:3000/api/privy/pregenerate-wallet \
  -H "Content-Type: application/json" \
  -d '{"clerkUserId":"user_xxx","email":"test@example.com"}'
```

Test wallet retrieval:
```bash
curl "http://localhost:3000/api/privy/get-wallet?email=test@example.com"
```

## Troubleshooting

### "Cannot find module '@privy-io/server-auth'"

Run:
```bash
pnpm install
```

### "PRIVY_APP_SECRET is not defined"

Make sure you added it to `.env.local` and restarted your dev server.

### "Wallet not found"

The wallet hasn't been created yet. Log in once to trigger creation.

### Clerk Issues in Development

If Clerk is causing issues locally:
1. Make sure you're using development keys (not production)
2. Check that `NODE_ENV` is not set to "production"
3. The production Clerk config only applies when `NODE_ENV === "production"`

## Production Deployment

### Environment Variables

Make sure these are set in your production environment:
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- All Clerk variables

### Security Notes

- Never expose `PRIVY_APP_SECRET` to the client
- API routes use server-side Privy client only
- Wallets are encrypted by Privy
- Private keys never leave Privy's infrastructure

## Advanced Usage

### Batch Wallet Creation

If you need to create wallets for multiple users at once, you can call the API in a loop:

```typescript
const users = await getUsers(); // Your user list

for (const user of users) {
  await fetch('/api/privy/pregenerate-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clerkUserId: user.id,
      email: user.email,
    }),
  });
}
```

### Wallet Migration

If you have existing users with old wallets, you can migrate them by:
1. Keeping old wallet system running
2. Pregenerate Privy wallets for all users
3. Transfer funds from old to new wallets
4. Switch to Privy wallets

## Support

- Privy Docs: https://docs.privy.io/
- Clerk Docs: https://clerk.com/docs

## Branch Info

This implementation is on the `devtomiwa` branch. To merge to main:

```bash
git checkout main
git merge devtomiwa
git push origin main
```
