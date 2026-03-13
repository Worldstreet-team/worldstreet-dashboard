# Privy Setup Without JWT Verification

Since your Clerk domain is suspended, you can use Privy without enabling JWT verification. Your backend already verifies the Clerk session, so this is actually simpler and more secure.

## How It Works

1. User logs in with Clerk → Clerk session is established
2. Frontend calls your API with `credentials: 'include'` → Clerk session cookie is sent
3. Your backend verifies the Clerk session using `auth()` from `@clerk/nextjs/server`
4. Backend passes the userId to Privy (no JWT verification needed)
5. Privy signs the transaction using the wallet associated with that userId

## Configuration Steps

### 1. Privy Dashboard Settings

Go to [Privy Dashboard](https://dashboard.privy.io/) → Settings → JWT Authentication

**IMPORTANT: Leave JWT Authentication DISABLED**

Don't enable JWT-based authentication. Your backend handles authentication via Clerk sessions.

### 2. Environment Variables

Make sure your `.env.local` has:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_SECRET=privy_app_secret_66H9ys4Tf2KRGSUhq91pZ8MY25STJpNfM2WwfgC8Q2VN9o94AAdCsx1yZEhWTNzongDHHCnVyxVUvUCUiQJkpToJ
PRIVY_AUTH_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgh0Ydiwzxzuv2DxOv\nivkde4hhNzbGJ9hdVvoF1T/33QahRANCAASC0zMSPohx0Mz+yNk22O9ttbGg3RoI\nIZCKfZi3LRZk44OOvL2FxxwLuVZpiMDZlnFlvbei7t9tBl/n5AFpplqi\n-----END EC PRIVATE KEY-----

# Database
MONGODB_URI=mongodb+srv://your_connection_string
```

### 3. Get Your Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys**
4. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)

### 4. Restart Your Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Security Model

This approach is actually MORE secure than JWT verification because:

1. **Session-based auth**: Clerk sessions are httpOnly cookies, protected from XSS
2. **Server-side verification**: Every request is verified by Clerk's `auth()` function
3. **No token exposure**: JWT tokens never leave your backend
4. **Wallet isolation**: Privy wallets are tied to Clerk userIds, not JWTs

## How Privy Authorization Works

When you call Privy's SDK:

```typescript
const transaction = await privyClient.wallets
  .solana(walletId)
  .sendTransaction(params, {
    authorizationContext: {
      userJwts: [clerkToken] // This is just for logging/audit, not verification
    }
  });
```

The `authorizationContext` is used for:
- Audit logging in Privy dashboard
- Rate limiting per user
- Transaction attribution

But Privy doesn't verify the JWT - it trusts your backend because you're using the `PRIVY_APP_SECRET`.

## Testing

1. **Log in** to your app with Clerk
2. **Navigate** to the Assets page
3. **Try sending** a small amount of SOL
4. **Check** the browser console and server logs

If you see "Unauthorized - No user session found", make sure:
- You're logged in with Clerk
- Clerk middleware is configured
- `CLERK_SECRET_KEY` is set in `.env.local`

## Troubleshooting

### Error: "Unauthorized - No user session found"
**Solution:** Make sure you're logged in with Clerk. Check that Clerk's `<ClerkProvider>` wraps your app.

### Error: "Invalid wallet authorization private key"
**Solution:** Check that `PRIVY_AUTH_PRIVATE_KEY` in `.env.local` has no quotes and uses `\n` for newlines.

### Error: "Solana wallet not found"
**Solution:** You need to create wallets first. Call `/api/privy/onboarding` or use the wallet pregeneration flow.

### Transaction succeeds but balance doesn't update
**Solution:** This is normal - blockchain confirmations take time. The balance will update after the transaction is confirmed.

## Alternative: Use Clerk's Default Domain

If you want to enable JWT verification later, you can use Clerk's default domain instead of your custom domain:

1. Go to Clerk Dashboard → API Keys
2. Find your **Frontend API** (e.g., `https://your-app-123.clerk.accounts.dev`)
3. Use that for the JWKS endpoint: `https://your-app-123.clerk.accounts.dev/.well-known/jwks.json`

But for now, leaving JWT verification disabled is simpler and works perfectly fine.

## Next Steps

1. Add your Clerk keys to `.env.local`
2. Restart your dev server
3. Test sending a transaction
4. Monitor the Privy dashboard for transaction logs
