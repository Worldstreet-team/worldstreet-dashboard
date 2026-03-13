# Privy Multi-Chain Wallet System

## Overview

This system creates and manages multi-chain self-custodial wallets for users using Privy's embedded wallet infrastructure. Each user gets wallets for:
- Ethereum (EVM)
- Solana
- Sui
- Ton
- Tron

## Database Schema

### UserWallet Model

```typescript
{
  email: string;              // User's email (unique)
  clerkUserId?: string;       // Optional Clerk user ID
  privyUserId: string;        // Privy user ID (unique)
  wallets: {
    ethereum: {
      walletId: string;       // Privy wallet ID
      address: string;        // Public address
      publicKey: string;      // Public key (if available)
    },
    solana: { ... },
    sui: { ... },
    ton: { ... },
    tron: { ... }
  },
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Get or Create Wallet by Email

**Endpoint:** `GET /api/privy/get-wallet?email=user@example.com`

**Description:** Gets existing wallets or creates new ones for a user by email.

**Response:**
```json
{
  "success": true,
  "privyUserId": "did:privy:cmmnvrql200360cjomk78pwpk",
  "wallets": {
    "ethereum": {
      "walletId": "go3yvubnjoo289oi5udgnozl",
      "address": "0xDca524281041a19674B2b1c424Bcefb36a05A543",
      "publicKey": null
    },
    "solana": {
      "walletId": "z9piguh4y0tjy6satb6o7cmh",
      "address": "E4fXvmcH71e6kJTHC1itnec7sN8Wvd3tc1nQ3qJMVFKe",
      "publicKey": null
    },
    "sui": {
      "walletId": "sqknarslprz8z4q498ig8rw6",
      "address": "0xc5cb83af13eb179f2db7417a52218c3998fc9c8f7a6595706f6f23b7f3c4e5aa",
      "publicKey": "006bf2025b8b42ebb8c416af03044b3e772c3af80d0903c913fd5e733d690fc47d"
    },
    "ton": {
      "walletId": "jsal5e48fqv2u4guskf7o03s",
      "address": "EQBArCWQUnCYcnKKvF-4LeL8MtoS9tI1QkO_JQyexNSja_iH",
      "publicKey": "00854f280de3610ec25f0ad72b4176af46ef2dfea428bcc9d6bdf1648489368861"
    },
    "tron": {
      "walletId": "slqr0lfy62vzk5hv5ru2f9ak",
      "address": "TUeaKAi3EzkqbptvK4T1xSy2VGKrFuyLrj",
      "publicKey": "02f68828084561a17063cf343f77c985d4656432302bc54ac74584bf8260edf2e9"
    }
  },
  "source": "privy"
}
```

**Flow:**
1. Check if user exists in MongoDB by email
2. If exists, return wallets from database
3. If not, check if user exists in Privy
4. If not in Privy, create new user with all wallets
5. Save wallet information to MongoDB
6. Return wallet addresses

### 2. Pregenerate Wallet

**Endpoint:** `POST /api/privy/pregenerate-wallet`

**Body:**
```json
{
  "email": "user@example.com",
  "clerkUserId": "user_2abc123xyz" // optional
}
```

**Description:** Creates a new Privy user with all wallets before they sign up.

**Response:**
```json
{
  "success": true,
  "privyUserId": "did:privy:cmmnvrql200360cjomk78pwpk",
  "wallets": {
    "ethereum": { ... },
    "solana": { ... },
    "sui": { ... },
    "ton": { ... },
    "tron": { ... }
  }
}
```

### 3. Get Wallet by Clerk User ID

**Endpoint:** `GET /api/privy/get-wallet-by-clerk?clerkUserId=user_2abc123xyz`

**Description:** Gets wallets for a user by their Clerk user ID.

**Response:**
```json
{
  "success": true,
  "privyUserId": "did:privy:cmmnvrql200360cjomk78pwpk",
  "email": "user@example.com",
  "wallets": {
    "ethereum": { ... },
    "solana": { ... },
    "sui": { ... },
    "ton": { ... },
    "tron": { ... }
  }
}
```

### 4. Refresh Wallet Data

**Endpoint:** `POST /api/privy/refresh-wallet`

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Description:** Deletes old wallet data from database and fetches fresh data from Privy. Useful when wallet data is corrupted or incomplete.

**Response:**
```json
{
  "success": true,
  "privyUserId": "did:privy:cmmnvrql200360cjomk78pwpk",
  "wallets": {
    "ethereum": { ... },
    "solana": { ... },
    "sui": { ... },
    "ton": { ... },
    "tron": { ... }
  },
  "message": "Wallet data refreshed successfully"
}
```

**Alternative:** You can also use the `forceRefresh` parameter with the get-wallet endpoint:
```
GET /api/privy/get-wallet?email=user@example.com&forceRefresh=true
```

## Usage Examples

### Frontend: Get User Wallets

```typescript
// Get wallets by email
async function getUserWallets(email: string) {
  const response = await fetch(
    `/api/privy/get-wallet?email=${encodeURIComponent(email)}`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log('Ethereum:', data.wallets.ethereum.address);
    console.log('Solana:', data.wallets.solana.address);
    console.log('Sui:', data.wallets.sui.address);
    console.log('Ton:', data.wallets.ton.address);
    console.log('Tron:', data.wallets.tron.address);
  }
  
  return data;
}
```

### Frontend: Pregenerate Wallets

```typescript
async function pregenerateWallets(email: string, clerkUserId?: string) {
  const response = await fetch('/api/privy/pregenerate-wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, clerkUserId })
  });
  
  const data = await response.json();
  return data;
}
```

### Backend: Access Wallet Information

```typescript
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

async function getWalletsByEmail(email: string) {
  await connectDB();
  const userWallet = await UserWallet.findOne({ email });
  return userWallet;
}

async function getWalletsByClerkId(clerkUserId: string) {
  await connectDB();
  const userWallet = await UserWallet.findOne({ clerkUserId });
  return userWallet;
}
```

## Wallet Creation Flow

```
┌─────────────────────────────────────────────────────────┐
│                  User Signs Up                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend: Call GET /api/privy/get-wallet?email=...    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend: Check MongoDB for existing user               │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    User Exists            User Not Found
         │                       │
         │                       ▼
         │          ┌────────────────────────────┐
         │          │  Check Privy for user      │
         │          └────────────┬───────────────┘
         │                       │
         │           ┌───────────┴───────────┐
         │           │                       │
         │           ▼                       ▼
         │      User Exists          User Not Found
         │           │                       │
         │           │                       ▼
         │           │          ┌────────────────────────────┐
         │           │          │  Create Privy user with:   │
         │           │          │  - Email                   │
         │           │          │  - Ethereum wallet         │
         │           │          │  - Solana wallet           │
         │           │          │  - Sui wallet              │
         │           │          │  - Ton wallet              │
         │           │          │  - Tron wallet             │
         │           │          └────────────┬───────────────┘
         │           │                       │
         │           └───────────┬───────────┘
         │                       │
         │                       ▼
         │          ┌────────────────────────────┐
         │          │  Extract wallet info from  │
         │          │  linked_accounts           │
         │          └────────────┬───────────────┘
         │                       │
         │                       ▼
         │          ┌────────────────────────────┐
         │          │  Save to MongoDB:          │
         │          │  - email                   │
         │          │  - privyUserId             │
         │          │  - wallets (all chains)    │
         │          └────────────┬───────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Return wallet addresses to frontend                    │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Automatic Wallet Creation
- Wallets are created automatically when user signs up
- All 5 chains are provisioned at once
- No additional steps required from user

### 2. Database Caching
- Wallet information is cached in MongoDB
- Reduces API calls to Privy
- Faster response times

### 3. Email-Based Lookup
- Primary lookup by email address
- Optional Clerk user ID association
- Flexible authentication integration

### 4. Self-Custodial
- Users maintain control of their wallets
- Private keys encrypted by Privy
- Recovery through email authentication

### 5. Multi-Chain Support
- Single user, multiple wallets
- Each chain has dedicated wallet
- Consistent user experience across chains

## Security Considerations

### Private Keys
- Never stored in your database
- Encrypted by Privy using industry standards
- Only accessible with valid user authentication

### Authentication
- Email verification required
- Optional Clerk integration for additional security
- JWT-based authorization for transactions

### Database Security
- Only public addresses and wallet IDs stored
- No sensitive key material in MongoDB
- Regular backups recommended

## Environment Variables

```bash
# Privy Configuration
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
PRIVY_AUTH_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"

# Database
MONGODB_URI=mongodb+srv://...

# Optional: Clerk
CLERK_SECRET_KEY=sk_...
```

## Testing

### Test Wallet Creation

```bash
# Get or create wallets
curl "http://localhost:3000/api/privy/get-wallet?email=test@example.com"

# Pregenerate wallets
curl -X POST http://localhost:3000/api/privy/pregenerate-wallet \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Get by Clerk ID
curl "http://localhost:3000/api/privy/get-wallet-by-clerk?clerkUserId=user_123"
```

## Troubleshooting

### Issue: User not found in Privy
**Solution:** The system will automatically create a new user with wallets

### Issue: Wallet addresses not showing
**Solution:** Check that all 5 wallet types are being created in Privy dashboard

### Issue: Database connection error
**Solution:** Verify MONGODB_URI is set correctly in .env.local

### Issue: Privy API errors
**Solution:** Check PRIVY_APP_ID and PRIVY_APP_SECRET are correct

## Next Steps

1. **Transaction Support**: Add endpoints to send transactions on each chain
2. **Balance Checking**: Implement balance queries for all wallets
3. **Wallet Recovery**: Add email-based recovery flow
4. **Webhook Integration**: Set up Privy webhooks for transaction notifications
5. **UI Components**: Create wallet display components for each chain

---

**Last Updated:** March 12, 2026
