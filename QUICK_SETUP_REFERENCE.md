# Quick Setup Reference - Privy + Clerk

## 🔧 Privy Dashboard Configuration

**Location:** https://dashboard.privy.io/ → Settings → JWT Authentication

```
✅ Enable JWT-based authentication: ON
✅ Authentication environment: Server side
✅ Verification method: JWKS endpoint

JWKS endpoint:
https://clerk.worldstreetgold.com/.well-known/jwks.json

JWT user ID claim:
sub

JWT additional claims:
Key: iss
Value: https://clerk.worldstreetgold.com

JWT aud claim:
(leave empty)
```

## 🔑 Environment Variables Needed

Add to `.env.local`:

```env
# Get these from Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## ✅ Verification Steps

1. **Test JWKS endpoint:**
   ```
   https://clerk.worldstreetgold.com/.well-known/jwks.json
   ```
   Should return JSON with public keys

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test transaction:**
   - Log in with Clerk
   - Go to Assets page
   - Try sending 0.001 SOL

## 🐛 Common Issues

| Error | Solution |
|-------|----------|
| "Unauthorized - No user session found" | Make sure you're logged in with Clerk |
| "Unable to get session token" | Check Clerk keys in `.env.local` |
| "Invalid wallet authorization private key" | Remove quotes from `PRIVY_AUTH_PRIVATE_KEY` |
| "Solana wallet not found" | Call `/api/privy/onboarding` first |
| "Server error - please check authentication" | Verify Privy JWT config matches above |

## 📝 Current Configuration Status

- ✅ Privy App ID: `cmmni9jmg01680dl8itfo3d2u`
- ✅ Privy App Secret: Set
- ✅ Privy Auth Private Key: Set (corrected)
- ✅ MongoDB URI: Set
- ⚠️ Clerk Publishable Key: **NEEDS TO BE ADDED**
- ⚠️ Clerk Secret Key: **NEEDS TO BE ADDED**

## 🚀 Next Steps

1. Get Clerk keys from https://dashboard.clerk.com/
2. Add them to `.env.local`
3. Configure Privy dashboard (see above)
4. Restart server
5. Test sending SOL

## 📚 Detailed Guides

- Full setup: `PRIVY_CLERK_FINAL_SETUP.md`
- Transaction guide: `HOW_PRIVY_WORKS_IN_OUR_SYSTEM.md`
- Implementation status: `PRIVY_TRANSACTION_IMPLEMENTATION_STATUS.md`
