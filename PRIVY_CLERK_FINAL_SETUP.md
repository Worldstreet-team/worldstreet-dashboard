# Final Privy + Clerk Configuration Guide

## Your Clerk JWKS Endpoint
```
https://clerk.worldstreetgold.com/.well-known/jwks.json
```

## Step 1: Configure Privy Dashboard

Go to [Privy Dashboard](https://dashboard.privy.io/) → Settings → JWT Authentication

### Enable JWT-based authentication

**Authentication environment:** `Server side`

**Verification method:** `JWKS endpoint`

**JWKS endpoint:**
```
https://clerk.worldstreetgold.com/.well-known/jwks.json
```

**JWT user ID claim:**
```
sub
```

**JWT additional claims:**
Add one claim:
- **Key:** `iss`
- **Value:** `https://clerk.worldstreetgold.com`

**JWT aud claim (optional):**
```
Leave empty
```

## Step 2: Add Environment Variables

Update your `.env.local` file with your Clerk keys:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# Privy Configuration (already set)
NEXT_PUBLIC_PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_ID=cmmni9jmg01680dl8itfo3d2u
PRIVY_APP_SECRET=privy_app_secret_66H9ys4Tf2KRGSUhq91pZ8MY25STJpNfM2WwfgC8Q2VN9o94AAdCsx1yZEhWTNzongDHHCnVyxVUvUCUiQJkpToJ
PRIVY_AUTH_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgh0Ydiwzxzuv2DxOv\nivkde4hhNzbGJ9hdVvoF1T/33QahRANCAASC0zMSPohx0Mz+yNk22O9ttbGg3RoI\nIZCKfZi3LRZk44OOvL2FxxwLuVZpiMDZlnFlvbei7t9tBl/n5AFpplqi\n-----END EC PRIVATE KEY-----

# Database
MONGODB_URI=mongodb+srv://worldstreetsprint_db_user:TzWQ2YVfEt39zQSb@auth.fc2qg29.mongodb.net/?appName=auth
```

## Step 3: Get Your Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys**
4. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)

## Step 4: Restart Your Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## How It Works

1. **User logs in** with Clerk → Session established with JWT
2. **Frontend calls API** with `credentials: 'include'` → Clerk session cookie sent
3. **Backend verifies** session using `auth()` from `@clerk/nextjs/server`
4. **Backend gets JWT** token from Clerk session
5. **Backend passes JWT** to Privy as authorization context
6. **Privy verifies JWT** using your JWKS endpoint (`https://clerk.worldstreetgold.com/.well-known/jwks.json`)
7. **If valid**, Privy signs the transaction

## Testing the Setup

### 1. Verify JWKS Endpoint
Open this URL in your browser:
```
https://clerk.worldstreetgold.com/.well-known/jwks.json
```

You should see a JSON response with public keys like:
```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "RSA",
      "kid": "...",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 2. Test Transaction Flow
1. Log in to your app with Clerk
2. Navigate to Assets page
3. Try sending a small amount of SOL (0.001 SOL)
4. Check browser console and server logs

## Troubleshooting

### Error: "Unauthorized - No user session found"
**Cause:** Not logged in or Clerk session expired
**Solution:** 
- Make sure you're logged in with Clerk
- Check that `CLERK_SECRET_KEY` is set in `.env.local`
- Verify Clerk middleware is configured

### Error: "Unable to get session token"
**Cause:** Clerk can't generate a JWT token
**Solution:**
- Check that your Clerk app is properly configured
- Verify you're using the correct Clerk keys
- Make sure Clerk sessions are enabled in your Clerk dashboard

### Error: "Invalid wallet authorization private key"
**Cause:** `PRIVY_AUTH_PRIVATE_KEY` is malformed
**Solution:**
- Remove quotes around the private key in `.env.local`
- Ensure newlines are represented as `\n`
- Restart your dev server after changes

### Error: "Solana wallet not found"
**Cause:** User doesn't have a Privy wallet yet
**Solution:**
- Call `/api/privy/onboarding` to create wallets
- Or use the wallet pregeneration flow

### Error: "Server error - please check your authentication"
**Cause:** Privy can't verify the JWT
**Solution:**
- Verify JWKS endpoint is accessible: `https://clerk.worldstreetgold.com/.well-known/jwks.json`
- Check Privy dashboard JWT configuration matches this guide
- Ensure `iss` claim is set to `https://clerk.worldstreetgold.com`

## Verification Checklist

- [ ] JWKS endpoint is accessible (test in browser)
- [ ] Privy dashboard JWT authentication is enabled
- [ ] JWKS endpoint in Privy matches: `https://clerk.worldstreetgold.com/.well-known/jwks.json`
- [ ] JWT user ID claim is set to `sub`
- [ ] Additional claim `iss` is set to `https://clerk.worldstreetgold.com`
- [ ] Clerk keys are added to `.env.local`
- [ ] `PRIVY_AUTH_PRIVATE_KEY` has no quotes
- [ ] Dev server has been restarted
- [ ] You're logged in with Clerk
- [ ] User has Privy wallets created

## Next Steps

After configuration:
1. Test wallet creation via `/api/privy/onboarding`
2. Test sending SOL from Assets page
3. Monitor Privy dashboard for transaction logs
4. Check server logs for any errors

## Security Notes

- JWT tokens are verified by Privy using your JWKS endpoint
- Private keys never leave Privy's HSM
- Your backend never handles private keys
- Clerk sessions are httpOnly cookies (XSS protected)
- All transactions require both Clerk session AND Privy authorization
