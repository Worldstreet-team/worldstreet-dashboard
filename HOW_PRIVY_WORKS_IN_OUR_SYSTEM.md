# How Privy Works in Our System - Complete Flow

This document explains the complete end-to-end flow of how Privy wallet management works in our application, from user signup to transaction execution.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Initial Setup & Configuration](#initial-setup--configuration)
3. [User Onboarding Flow](#user-onboarding-flow)
4. [Wallet Generation & Storage](#wallet-generation--storage)
5. [Authentication Flow](#authentication-flow)
6. [Balance Fetching](#balance-fetching)
7. [Transaction Execution](#transaction-execution)
8. [Data Flow Diagram](#data-flow-diagram)
9. [Key Components](#key-components)
10. [Security Model](#security-model)

---

## System Overview

Our system uses a **dual authentication** approach:
- **Clerk** for user authentication and session management
- **Privy** for secure wallet creation, storage, and transaction signing

This separation provides:
- Enhanced security (wallets isolated from user auth)
- Better key management (Privy's secure infrastructure)
- Simplified user experience (no seed phrases or private keys to manage)

---

## Initial Setup & Configuration

### 1. Environment Variables

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Privy Configuration
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_AUTH_PRIVATE_KEY=your-privy-auth-key
```

### 2. Privy Client Initialization

**File:** `src/lib/privy/client.ts`

```typescript
import { PrivyClient } from "@privy-io/server-auth";

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY
    }
  }
);
```

This singleton client is used throughout the backend for all Privy operations.

---

## User Onboarding Flow

### Step 1: User Signs Up with Clerk

```
User visits app → Clerk login page → User enters email/password
    ↓
Clerk creates user account
    ↓
Clerk issues JWT token (stored in cookies)
    ↓
User redirected to dashboard
```

**What happens:**
- Clerk creates a user account with unique `userId`
- JWT token stored in HTTP-only cookies
- User email becomes the identifier for Privy

### Step 2: Automatic Wallet Pre-generation

**Component:** `src/components/privy/WalletPregenerator.tsx`

```typescript
export function WalletPregenerator() {
  const { user } = useUser(); // Clerk user
  const { walletsGenerated, fetchWallets } = useWallet();

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress && !walletsGenerated) {
      // Trigger wallet generation
      pregenerateWallet();
    }
  }, [user, walletsGenerated]);

  const pregenerateWallet = async () => {
    const response = await fetch('/api/privy/pregenerate-wallet', {
      method: 'POST',
      body: JSON.stringify({
        email: user.primaryEmailAddress.emailAddress
      })
    });
  };
}
```

**What happens:**
- Component renders on first dashboard load
- Checks if user has Privy wallets
- If not, calls pregeneration API

### Step 3: Backend Wallet Creation

**API Route:** `src/app/api/privy/pregenerate-wallet/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Get user email from request
  const { email } = await request.json();
  
  // 2. Create or get Privy user
  let privyUser = await privyClient.getUserByEmail(email);
  
  if (!privyUser) {
    privyUser = await privyClient.createUser({
      email,
      createEmbeddedWallet: false
    });
  }
  
  // 3. Create wallets for all 5 chains
  const wallets = await createUserWallets(privyUser.id);
  
  // 4. Store wallet info in our database
  await UserWallet.create({
    clerkUserId: userId,
    privyUserId: privyUser.id,
    wallets: {
      ethereum: {
        walletId: wallets.ethereum.id,
        address: wallets.ethereum.address
      },
      solana: {
        walletId: wallets.solana.id,
        address: wallets.solana.address
      },
      sui: {
        walletId: wallets.sui.id,
        address: wallets.sui.address
      },
      ton: {
        walletId: wallets.ton.id,
        address: wallets.ton.address
      },
      tron: {
        walletId: wallets.tron.id,
        address: wallets.tron.address
      }
    }
  });
  
  return { success: true, wallets };
}
```

**What happens:**
1. Creates Privy user account (linked to email)
2. Generates 5 blockchain wallets (ETH, SOL, SUI, TON, TRX)
3. Privy securely stores private keys in their infrastructure
4. Our database stores wallet IDs and addresses (NOT private keys)

---

## Wallet Generation & Storage

### Privy's Wallet Creation Process

```
API Call: createUserWallets(privyUserId)
    ↓
Privy generates 5 key pairs:
  - Ethereum (secp256k1)
  - Solana (ed25519)
  - Sui (ed25519)
  - TON (ed25519)
  - Tron (secp256k1)
    ↓
Private keys encrypted and stored in Privy's HSM
    ↓
Public addresses returned to our backend
    ↓
We store: {walletId, address, chainType}
```

### What We Store vs What Privy Stores

**Our Database (MongoDB):**
```javascript
{
  clerkUserId: "user_abc123",
  privyUserId: "privy_xyz789",
  wallets: {
    ethereum: {
      walletId: "wallet_eth_123",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    },
    solana: {
      walletId: "wallet_sol_456",
      address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
    }
    // ... other chains
  }
}
```

**Privy's Infrastructure:**
```
🔒 Private Keys (encrypted in HSM)
🔒 Key derivation paths
🔒 Encryption keys
🔒 Backup mechanisms
```

**Security Note:** Private keys NEVER leave Privy's infrastructure. We only store wallet IDs and public addresses.

---

## Authentication Flow

### How Clerk JWT Works with Privy

```
User makes request → Clerk JWT in cookies
    ↓
Backend API route receives request
    ↓
verifyClerkJWT(request) extracts and validates JWT
    ↓
Get Clerk userId from JWT
    ↓
Look up Privy walletId from database
    ↓
Create Privy authorization context with JWT
    ↓
Call Privy API with authorization
```

**Code Example:**

```typescript
// API Route
export async function POST(request: NextRequest) {
  // 1. Verify Clerk JWT
  const { userId, token } = await verifyClerkJWT(request);
  
  // 2. Get user's Privy wallet
  const userWallet = await UserWallet.findOne({ clerkUserId: userId });
  const walletId = userWallet.wallets.solana.walletId;
  
  // 3. Create authorization context
  const authContext = createAuthorizationContext(token);
  
  // 4. Call Privy API
  const result = await privyClient.wallets
    .solana(walletId)
    .sendTransaction(params, {
      authorizationContext: authContext
    });
}
```

### Authorization Context

**File:** `src/lib/privy/authorization.ts`

```typescript
export function createAuthorizationContext(clerkJwt: string) {
  return {
    userJwts: [clerkJwt]
  };
}
```

This tells Privy: "This request is authorized by this user's Clerk JWT"

---

## Balance Fetching

### Frontend Flow

```
User opens dashboard
    ↓
WalletContext loads
    ↓
Fetches wallet addresses from API
    ↓
Individual chain contexts (Solana, EVM, etc.) initialize
    ↓
Each context fetches balance from blockchain
```

### WalletContext Implementation

**File:** `src/app/context/walletContext.tsx`

```typescript
export function WalletProvider({ children }) {
  const { user } = useUser(); // Clerk user
  const [addresses, setAddresses] = useState(null);
  
  const fetchWallets = async () => {
    const email = user.primaryEmailAddress.emailAddress;
    const response = await fetch(
      `/api/privy/get-wallet?email=${encodeURIComponent(email)}`
    );
    
    const data = await response.json();
    
    // Extract addresses for all chains
    setAddresses({
      ethereum: data.wallets.ethereum?.address,
      solana: data.wallets.solana?.address,
      sui: data.wallets.sui?.address,
      ton: data.wallets.ton?.address,
      tron: data.wallets.tron?.address
    });
  };
  
  useEffect(() => {
    if (user) fetchWallets();
  }, [user]);
  
  return (
    <WalletContext.Provider value={{ addresses, ... }}>
      {children}
    </WalletContext.Provider>
  );
}
```

### Chain-Specific Balance Fetching

**Example: Solana Context**

```typescript
export function SolanaProvider({ children }) {
  const { addresses } = useWallet();
  const address = addresses?.solana || null;
  const [balance, setBalance] = useState(0);
  
  const fetchBalance = async () => {
    if (!address) return;
    
    // Connect to Solana RPC
    const connection = new Connection(SOL_RPC);
    
    // Fetch SOL balance
    const lamports = await connection.getBalance(new PublicKey(address));
    const solBalance = lamports / 1e9;
    setBalance(solBalance);
    
    // Fetch SPL token balances
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      { programId: TOKEN_PROGRAM_ID }
    );
    // ... process token balances
  };
  
  useEffect(() => {
    if (address) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 40000);
      return () => clearInterval(interval);
    }
  }, [address]);
}
```

**Key Points:**
- Addresses come from WalletContext (Privy)
- Balance fetching happens directly from blockchain RPCs
- No Privy API needed for reading balances
- Each chain context manages its own balance state

---

## Transaction Execution

### Complete Transaction Flow

```
1. User initiates transaction in UI
    ↓
2. Frontend calls context send function
    ↓
3. Context calls Privy API endpoint
    ↓
4. Backend verifies Clerk JWT
    ↓
5. Backend looks up Privy wallet ID
    ↓
6. Backend calls Privy SDK with authorization
    ↓
7. Privy signs transaction with private key
    ↓
8. Privy broadcasts to blockchain
    ↓
9. Transaction hash returned to frontend
    ↓
10. Frontend refreshes balance
```

### Detailed Step-by-Step

#### Step 1: User Initiates Transaction

**Component Example:**

```typescript
function SendForm() {
  const { sendTransaction } = useSolana();
  
  const handleSend = async () => {
    try {
      const signature = await sendTransaction(
        recipientAddress,
        amount
      );
      
      alert(`Transaction sent! Signature: ${signature}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
}
```

#### Step 2: Context Calls API

**File:** `src/app/context/solanaContext.tsx`

```typescript
const sendTransaction = useCallback(
  async (recipient: string, amount: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/privy/wallet/solana/send', {
        method: 'POST',
        credentials: 'include', // Sends Clerk JWT cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          amount: amount.toString()
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      setLastTx(data.signature);
      await fetchBalance(address); // Refresh balance
      
      return data.signature;
    } finally {
      setLoading(false);
    }
  },
  [address, fetchBalance]
);
```

#### Step 3: Backend API Route

**File:** `src/app/api/privy/wallet/solana/send/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Clerk JWT from cookies
    const { userId, token } = await verifyClerkJWT(request);
    
    // 2. Parse request body
    const { to, amount } = await request.json();
    
    // 3. Validate inputs
    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // 4. Validate Solana address
    if (to.length < 32 || to.length > 44) {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 }
      );
    }
    
    // 5. Connect to database
    await connectDB();
    
    // 6. Get user's Solana wallet from database
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (!userWallet?.wallets.solana) {
      return NextResponse.json(
        { error: "Solana wallet not found" },
        { status: 404 }
      );
    }
    
    const walletId = userWallet.wallets.solana.walletId;
    
    // 7. Call Privy helper function
    const result = await sendSol(walletId, to, amount, token);
    
    // 8. Return transaction signature
    return NextResponse.json({
      success: true,
      signature: result.signature,
      status: result.status
    });
  } catch (error) {
    console.error("Solana send error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send SOL" },
      { status: 500 }
    );
  }
}
```

#### Step 4: Privy Helper Function

**File:** `src/lib/privy/solana.ts`

```typescript
export async function sendSol(
  walletId: string,
  toAddress: string,
  amountInSol: string,
  clerkJwt: string
) {
  // 1. Convert SOL to lamports
  const lamports = Math.floor(parseFloat(amountInSol) * 1e9);
  
  // 2. Create authorization context
  const authContext = createAuthorizationContext(clerkJwt);
  
  // 3. Call Privy SDK
  const transaction = await privyClient.wallets
    .solana(walletId)
    .sendTransaction(
      {
        to: toAddress,
        lamports
      },
      {
        authorizationContext: authContext
      }
    );
  
  // 4. Return result
  return {
    signature: transaction.signature,
    status: transaction.status
  };
}
```

#### Step 5: Privy Signs & Broadcasts

**What Privy Does Internally:**

```
1. Validates authorization context (Clerk JWT)
2. Retrieves private key from HSM
3. Builds Solana transaction
4. Signs transaction with private key
5. Broadcasts to Solana RPC
6. Returns transaction signature
```

**Security Notes:**
- Private key never leaves Privy's infrastructure
- Transaction signed in secure enclave
- Our backend never sees the private key
- Clerk JWT proves user authorization

---

## Data Flow Diagram

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Clerk UI   │      │ WalletContext│                     │
│  │  (Login/Auth)│─────▶│  (Addresses) │                     │
│  └──────────────┘      └───────┬──────┘                     │
│                                 │                             │
│                    ┌────────────┼────────────┐               │
│                    ▼            ▼            ▼               │
│            ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│            │ Solana   │  │   EVM    │  │  Tron    │         │
│            │ Context  │  │ Context  │  │ Context  │         │
│            └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│                 │             │             │                │
└─────────────────┼─────────────┼─────────────┼────────────────┘
                  │             │             │
                  │  HTTP/REST  │             │
                  ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes (Next.js)                     │   │
│  │  /api/privy/wallet/solana/send                        │   │
│  │  /api/privy/wallet/ethereum/send                      │   │
│  │  /api/privy/wallet/tron/send                          │   │
│  │  /api/privy/get-wallet                                │   │
│  │  /api/privy/pregenerate-wallet                        │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Authentication Layer                          │   │
│  │  - verifyClerkJWT()                                   │   │
│  │  - Extract userId from JWT                            │   │
│  │  - Create authorization context                       │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Database Layer (MongoDB)                      │   │
│  │  - UserWallet model                                   │   │
│  │  - Store: clerkUserId, privyUserId, walletIds        │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Privy Helper Functions                        │   │
│  │  - sendSol(), sendEth(), sendTrx()                    │   │
│  │  - createUserWallets()                                │   │
│  │  - getUserWallets()                                   │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
└───────────────┼──────────────────────────────────────────────┘
                │
                │  Privy SDK
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRIVY INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Privy API Server                              │   │
│  │  - Validates authorization context                    │   │
│  │  - Manages user accounts                              │   │
│  │  - Orchestrates wallet operations                     │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    Hardware Security Module (HSM)                     │   │
│  │  🔒 Private keys stored encrypted                     │   │
│  │  🔒 Transaction signing in secure enclave             │   │
│  │  🔒 Key derivation and management                     │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
└───────────────┼──────────────────────────────────────────────┘
                │
                │  Signed Transactions
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN NETWORKS                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Solana   │  │ Ethereum │  │   Sui    │  │   TON    │   │
│  │   RPC    │  │   RPC    │  │   RPC    │  │   RPC    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ┌──────────┐                                                │
│  │  Tron    │                                                │
│  │   RPC    │                                                │
│  └──────────┘                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Privy Client (`src/lib/privy/client.ts`)
- Singleton instance of Privy SDK
- Configured with app credentials
- Used for all Privy API calls

### 2. Wallet Context (`src/app/context/walletContext.tsx`)
- Fetches wallet addresses from Privy
- Provides addresses to all chain contexts
- Single source of truth for wallet data

### 3. Chain Contexts
- **Solana Context** (`src/app/context/solanaContext.tsx`)
- **EVM Context** (`src/app/context/evmContext.tsx`)
- **Tron Context** (`src/app/context/tronContext.tsx`)
- **Sui Context** (`src/app/context/suiContext.tsx`)
- **TON Context** (`src/app/context/tonContext.tsx`)

Each handles:
- Balance fetching from blockchain
- Transaction execution via Privy API
- Token balance management
- Loading states

### 4. API Routes
- `/api/privy/pregenerate-wallet` - Create wallets on signup
- `/api/privy/get-wallet` - Fetch wallet addresses
- `/api/privy/wallet/[chain]/send` - Send transactions
- `/api/privy/refresh-wallet` - Force refresh from Privy

### 5. Helper Functions (`src/lib/privy/`)
- `ethereum.ts` - ETH transaction helpers
- `solana.ts` - SOL transaction helpers
- `tron.ts` - TRX transaction helpers
- `sui.ts` - SUI transaction helpers
- `ton.ts` - TON transaction helpers
- `wallets.ts` - Wallet creation and management
- `authorization.ts` - Auth context creation

### 6. Database Model (`src/models/UserWallet.ts`)
```typescript
{
  clerkUserId: String,
  privyUserId: String,
  wallets: {
    ethereum: { walletId, address },
    solana: { walletId, address },
    sui: { walletId, address },
    ton: { walletId, address },
    tron: { walletId, address }
  }
}
```

---

## Security Model

### Multi-Layer Security

#### Layer 1: User Authentication (Clerk)
- Email/password authentication
- JWT tokens with expiration
- HTTP-only cookies
- Session management

#### Layer 2: Authorization (Clerk JWT)
- Every API request verified
- JWT contains user identity
- Prevents unauthorized access
- Token passed to Privy for validation

#### Layer 3: Wallet Ownership (Database)
- Maps Clerk users to Privy wallets
- Ensures user can only access their wallets
- Prevents wallet ID guessing attacks

#### Layer 4: Transaction Authorization (Privy)
- Validates Clerk JWT
- Verifies wallet ownership
- Checks authorization context
- Signs only if all checks pass

#### Layer 5: Key Security (Privy HSM)
- Private keys encrypted at rest
- Keys never leave secure enclave
- Hardware-backed security
- Automatic key rotation

### What Can't Be Compromised

Even if an attacker gains access to:

1. **Our Database:**
   - Only sees wallet IDs and addresses
   - Cannot access private keys
   - Cannot sign transactions

2. **Our Backend:**
   - Cannot extract private keys
   - Cannot sign without valid Clerk JWT
   - Privy validates every request

3. **User's Browser:**
   - No private keys in frontend
   - JWT expires automatically
   - Can only initiate, not sign transactions

4. **Network Traffic:**
   - HTTPS encryption
   - No private keys transmitted
   - JWT tokens short-lived

### Attack Vectors Prevented

✅ **Private Key Theft** - Keys never leave Privy HSM
✅ **Unauthorized Transactions** - Requires valid Clerk JWT
✅ **Wallet Impersonation** - Database links users to wallets
✅ **Replay Attacks** - JWT expiration and nonces
✅ **Man-in-the-Middle** - HTTPS encryption
✅ **Session Hijacking** - HTTP-only cookies

---

## Summary

### The Complete Flow in Simple Terms

1. **User signs up** → Clerk creates account
2. **Wallets auto-generated** → Privy creates 5 blockchain wallets
3. **Addresses stored** → Our database links user to wallets
4. **User logs in** → Clerk issues JWT token
5. **Dashboard loads** → Fetches wallet addresses from Privy
6. **Balances displayed** → Fetched directly from blockchains
7. **User sends transaction** → Frontend calls our API
8. **API verifies user** → Checks Clerk JWT
9. **API calls Privy** → Requests transaction signing
10. **Privy signs** → Uses private key from HSM
11. **Transaction broadcast** → Sent to blockchain
12. **Confirmation** → Transaction hash returned to user

### Key Advantages

✅ **Security** - Private keys never exposed
✅ **Simplicity** - No seed phrases for users
✅ **Multi-chain** - 5 blockchains, one system
✅ **Scalability** - Privy handles infrastructure
✅ **Compliance** - Enterprise-grade key management
✅ **Recovery** - Privy provides backup mechanisms

### Key Files Reference

```
Authentication:
- src/lib/privy/client.ts
- src/lib/privy/authorization.ts
- src/lib/auth/clerk.ts

Wallet Management:
- src/app/context/walletContext.tsx
- src/lib/privy/wallets.ts
- src/models/UserWallet.ts

Chain Contexts:
- src/app/context/solanaContext.tsx
- src/app/context/evmContext.tsx
- src/app/context/tronContext.tsx
- src/app/context/suiContext.tsx
- src/app/context/tonContext.tsx

API Routes:
- src/app/api/privy/pregenerate-wallet/route.ts
- src/app/api/privy/get-wallet/route.ts
- src/app/api/privy/wallet/[chain]/send/route.ts

Transaction Helpers:
- src/lib/privy/solana.ts
- src/lib/privy/ethereum.ts
- src/lib/privy/tron.ts
- src/lib/privy/sui.ts
- src/lib/privy/ton.ts
```

---

## Conclusion

Privy provides a secure, scalable wallet infrastructure that integrates seamlessly with our Clerk authentication system. Users get a simple experience while we maintain enterprise-grade security. Private keys are managed by Privy's HSM, transactions are authorized via Clerk JWTs, and our application orchestrates the entire flow without ever handling sensitive key material.

This architecture allows us to support 5 blockchain networks with a single, unified system that prioritizes security, user experience, and developer productivity.
