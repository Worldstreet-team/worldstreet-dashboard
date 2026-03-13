# Clerk + Privy JWT Configuration Guide

## Step 1: Get Your Clerk Configuration

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys** section
4. Copy the following:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
5. Note your **Frontend API URL** (e.g., `https://your-app-123.clerk.accounts.dev`)

## Step 2: Add Clerk Keys to .env.local

Add these to your `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
```

## Step 3: Configure Privy Dashboard

Go to your [Privy Dashboard](https://dashboard.privy.io/) → Settings → JWT Authentication

### Configuration Values:

**1. Authentication environment:**
```
Server side
```
(Because your Next.js backend verifies the JWT)

**2. Verification method:**
```
JWKS endpoint
```

**3. JWKS endpoint:**
```
https://[YOUR-CLERK-FRONTEND-API]/.well-known/jwks.json
```

Example:
- If your Clerk Frontend API is `https://my-app-123.clerk.accounts.dev`
- Then use: `https://my-app-123.clerk.accounts.dev/.well-known/jwks.json`

**4. JWT user ID claim:**
```
sub
```
(This is the standard claim where Clerk stores the user ID)

**5. JWT additional claims:**

Add one claim:
- **Key:** `iss`
- **Value:** Your Clerk Frontend API URL (e.g., `https://my-app-123.clerk.accounts.dev`)

**6. JWT aud claim (optional):**
```
Leave empty
```
(Or optionally add your Clerk Publishable Key for extra validation)

## Step 4: How to Find Your Clerk Frontend API URL

### Method 1: From Clerk Dashboard
1. Go to Clerk Dashboard → API Keys
2. Look for "Frontend API" - it will show something like:
   - `https://your-app-123.clerk.accounts.dev`
   - Or your custom domain if configured

### Method 2: From Your Code
Check your `ClerkProvider` configuration or look for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - the domain is embedded in the key structure.

### Method 3: Test Endpoint
Open this URL in your browser (replace with your domain):
```
https://your-app-123.clerk.accounts.dev/.well-known/jwks.json
```

You should see a JSON response with public keys. If you see this, your JWKS endpoint is correct!

## Step 5: Verify Configuration

After configuring Privy:

1. Restart your Next.js development server
2. Log in to your app with Clerk
3. Try sending a transaction from the Assets page
4. Check the browser console and server logs for any errors

## Example Complete Configuration

### .env.local
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123...
CLERK_SECRET_KEY=sk_test_xyz789...

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_SECRET=privy_app_secret_66H9ys4Tf2KRGSUhq91pZ8MY25STJpNfM2WwfgC8Q2VN9o94AAdCsx1yZEhWTNzongDHHCnVyxVUvUCUiQJkpToJ
PRIVY_AUTH_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgh0Ydiwzxzuv2DxOv\nivkde4hhNzbGJ9hdVvoF1T/33QahRANCAASC0zMSPohx0Mz+yNk22O9ttbGg3RoI\nIZCKfZi3LRZk44OOvL2FxxwLuVZpiMDZlnFlvbei7t9tBl/n5AFpplqi\n-----END EC PRIVATE KEY-----
```

### Privy Dashboard Settings
```
Authentication Environment: Server side
Verification: JWKS endpoint
JWKS Endpoint: https://my-app-123.clerk.accounts.dev/.well-known/jwks.json
JWT User ID Claim: sub
Additional Claims:
  - iss: https://my-app-123.clerk.accounts.dev
JWT aud claim: (empty)
```

## How It Works

1. User logs in with Clerk → Clerk creates a session with JWT
2. Frontend calls your API with `credentials: 'include'` → sends Clerk session cookie
3. Your backend calls `auth()` from `@clerk/nextjs/server` → gets userId and JWT token
4. Backend passes JWT to Privy SDK as authorization context
5. Privy validates JWT using Clerk's JWKS endpoint
6. If valid, Privy signs the transaction with the user's wallet

## Troubleshooting

### Error: "Unauthorized - No user session found"
- Make sure you're logged in with Clerk
- Check that Clerk middleware is configured
- Verify `CLERK_SECRET_KEY` is set in `.env.local`

### Error: "Invalid or expired session"
- Check that JWKS endpoint is accessible
- Verify the `iss` claim matches your Clerk Frontend API
- Make sure Privy dashboard configuration is saved

### Error: "Invalid wallet authorization private key"
- Check that `PRIVY_AUTH_PRIVATE_KEY` has no quotes around it
- Verify the key format includes `\n` for newlines

### Test JWKS Endpoint
Run this command to test your JWKS endpoint:
```bash
curl https://your-app-123.clerk.accounts.dev/.well-known/jwks.json
```

You should see a JSON response with `keys` array containing public keys.

## Next Steps

After configuration:
1. Test wallet creation via `/api/privy/onboarding`
2. Test sending SOL via the Assets page
3. Monitor server logs for any Privy/Clerk errors
4. Check Privy dashboard for transaction logs
