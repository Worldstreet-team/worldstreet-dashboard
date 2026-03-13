# Clerk + Privy Self-Custodial Wallet Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Clerk Authentication Integration](#clerk-authentication-integration)
3. [Creating Privy Users](#creating-privy-users)
4. [Creating Self-Custodial Wallets](#creating-self-custodial-wallets)
5. [Requesting User Keys](#requesting-user-keys)
6. [Server Authorization Keys](#server-authorization-keys)
7. [Signing Messages](#signing-messages)
8. [Sending Ethereum Transactions](#sending-ethereum-transactions)
9. [Sending Solana Transactions](#sending-solana-transactions)
10. [Full End-to-End Flow](#full-end-to-end-flow)
11. [Security Best Practices](#security-best-practices)
12. [Advanced Features](#advanced-features)

---

## 1. Architecture Overview

### System Components

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ Clerk JWT
       ▼
┌─────────────────────────────────────────┐
│         Backend (Next.js API)           │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ Clerk Verify │───▶│ Privy Client │  │
│  └──────────────┘    └──────┬───────┘  │
└──────────────────────────────┼──────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Privy Platform  │
                    │  (Wallet API)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   Ethereum RPC   │        │    Solana RPC    │
    │   (Blockchain)   │        │   (Blockchain)   │
    └──────────────────┘        └──────────────────┘
```

### Authentication and Wallet Flow

1. **User Authentication**
   - User signs in with Clerk (email, social, etc.)
   - Clerk issues JWT token
   - Frontend receives JWT

2. **Backend Verification**
   - Frontend sends Clerk JWT to backend
   - Backend verifies JWT using Clerk's JWKS endpoint
   - Extracts Clerk user ID from JWT

3. **Privy User Creation**
   - Backend creates Privy user linked to Clerk user ID
   - Uses `custom_user_id` to map Clerk → Privy

4. **Wallet Creation**
   - Backend creates Ethereum wallet for user
   - Backend creates Solana wallet for user
   - Wallets are owned by Privy user

5. **Transaction Authorization**
   - User initiates transaction from frontend
   - Frontend sends Clerk JWT + transaction details
   - Backend requests ephemeral user key from Privy
   - Privy verifies JWT and returns temporary key
   - Backend signs and submits transaction

### Self-Custody Explained

**How Self-Custody Works with Privy:**

- **Private keys are encrypted** and stored by Privy using industry-standard encryption
- **User authorization required**: Every transaction requires a valid JWT from the authentication provider
- **Ephemeral keys**: Privy issues temporary signing keys that expire after use
- **Server authorization keys**: Servers can initiate transactions BUT only with valid user JWT
- **Key recovery**: Users can recover wallets through authentication provider
- **No direct key access**: Backend never sees raw private keys

**Key Principle**: Even though transactions are executed server-side, users remain in control because:
1. Privy enforces JWT verification before any wallet operation
2. Without a valid user JWT, the server cannot access wallet keys
3. Users can revoke access by logging out of Clerk

---

## 2. Clerk Authentication Integration

### Privy Dashboard Configuration

1. **Enable JWT Authentication**
   - Go to Privy Dashboard → Settings → Login Methods
   - Enable "Custom Auth" or "JWT Authentication"

2. **Configure JWKS Endpoint**
   - Add Clerk's JWKS endpoint: `https://[your-clerk-domain]/.well-known/jwks.json`
   - Example: `https://clerk.myapp.com/.well-known/jwks.json`

3. **Set User ID Claim**
   - Configure `sub` claim as the user identifier
   - This maps Clerk's user ID to Privy's `custom_user_id`

### Backend JWT Verification

```typescript
// src/lib/auth/clerk.ts
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function verifyClerkJWT(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  
  try {
    // Verify the JWT
    const verified = await clerkClient.verifyToken(token);
    return {
      userId: verified.sub,
      token: token
    };
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}
```

### Frontend: Getting Clerk JWT

```typescript
// Frontend component
import { useAuth } from "@clerk/nextjs";

function MyComponent() {
  const { getToken } = useAuth();

  async function callBackend() {
    const token = await getToken();
    
    const response = await fetch("/api/wallet/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    return response.json();
  }
}
```

---

## 3. Creating Privy Users (Linked to Clerk)

### Initialize Privy Client

```typescript
// src/lib/privy/client.ts
import { PrivyClient } from "@privy-io/server-auth";

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY
    }
  }
);
```

### Create Privy User

```typescript
// src/lib/privy/users.ts
import { privyClient } from "./client";

export async function createPrivyUser(clerkUserId: string) {
  try {
    // Check if user already exists
    const existingUser = await privyClient.getUserByCustomId(clerkUserId);

    if (existingUser) {
      return existingUser.id;
    }
  } catch (error) {
    // User doesn't exist, create new one
  }

  const user = await privyClient.createUser({
    linkedAccounts: [{
      type: "custom_auth",
      customUserId: clerkUserId
    }]
  });

  return user.id;
}

export async function getPrivyUserByClerkId(clerkUserId: string) {
  const user = await privyClient.getUserByCustomId(clerkUserId);
  return user;
}
```

### API Route Example

```typescript
// src/app/api/privy/user/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { createPrivyUser } from "@/lib/privy/users";

export async function POST(request: NextRequest) {
  try {
    // Verify Clerk JWT
    const { userId } = await verifyClerkJWT(request);

    // Create Privy user
    const privyUserId = await createPrivyUser(userId);

    return NextResponse.json({
      success: true,
      privyUserId,
      clerkUserId: userId
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

---

## 4. Creating Self-Custodial Wallets

### Wallet Creation Service

```typescript
// src/lib/privy/wallets.ts
import { privyClient } from "./client";

export interface UserWallets {
  ethereum: {
    id: string;
    address: string;
    chainType: "ethereum";
  };
  solana: {
    id: string;
    address: string;
    chainType: "solana";
  };
}

export async function createUserWallets(
  privyUserId: string
): Promise<UserWallets> {

  // Create Ethereum wallet
  const ethWallet = await privyClient.wallets.create({
    chainType: "ethereum",
    owner: {
      userId: privyUserId
    }
  });

  // Create Solana wallet
  const solWallet = await privyClient.wallets.create({
    chainType: "solana",
    owner: {
      userId: privyUserId
    }
  });

  return {
    ethereum: {
      id: ethWallet.id,
      address: ethWallet.address,
      chainType: "ethereum"
    },
    solana: {
      id: solWallet.id,
      address: solWallet.address,
      chainType: "solana"
    }
  };
}

export async function getUserWallets(privyUserId: string) {
  const wallets = await privyClient.wallets.list({
    userId: privyUserId
  });

  const ethereum = wallets.find(w => w.chainType === "ethereum");
  const solana = wallets.find(w => w.chainType === "solana");

  return {
    ethereum: ethereum ? {
      id: ethereum.id,
      address: ethereum.address,
      chainType: "ethereum" as const
    } : null,
    solana: solana ? {
      id: solana.id,
      address: solana.address,
      chainType: "solana" as const
    } : null
  };
}
```

### Store Wallet IDs in Database

```typescript
// src/models/UserWallet.ts
import mongoose from "mongoose";

const UserWalletSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  privyUserId: { type: String, required: true },
  wallets: {
    ethereum: {
      walletId: String,
      address: String
    },
    solana: {
      walletId: String,
      address: String
    }
  },
  createdAt: { type: Date, default: Date.now }
});

export const UserWallet = mongoose.models.UserWallet || 
  mongoose.model("UserWallet", UserWalletSchema);
```

### API Route: Create Wallets

```typescript
// src/app/api/wallet/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { createPrivyUser, getPrivyUserByClerkId } from "@/lib/privy/users";
import { createUserWallets, getUserWallets } from "@/lib/privy/wallets";
import { UserWallet } from "@/models/UserWallet";

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await verifyClerkJWT(request);

    // Check if wallets already exist
    let userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (userWallet) {
      return NextResponse.json({
        success: true,
        wallets: userWallet.wallets,
        message: "Wallets already exist"
      });
    }

    // Create or get Privy user
    const privyUserId = await createPrivyUser(userId);

    // Create wallets
    const wallets = await createUserWallets(privyUserId);

    // Save to database
    userWallet = await UserWallet.create({
      clerkUserId: userId,
      privyUserId,
      wallets: {
        ethereum: {
          walletId: wallets.ethereum.id,
          address: wallets.ethereum.address
        },
        solana: {
          walletId: wallets.solana.id,
          address: wallets.solana.address
        }
      }
    });

    return NextResponse.json({
      success: true,
      wallets: userWallet.wallets
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 5. Requesting User Keys (Authorization)

### Ephemeral User Key Mechanism

Privy uses ephemeral keys to authorize wallet operations:

1. Backend sends user's JWT to Privy
2. Privy verifies the JWT against configured JWKS endpoint
3. Privy returns a temporary signing key
4. Key is valid for single operation or short time period
5. Backend uses key to sign transaction request

### Authorization Context

```typescript
// src/lib/privy/authorization.ts
export function createAuthorizationContext(clerkJwt: string) {
  return {
    userJwts: [clerkJwt]
  };
}
```

### Example Usage

```typescript
import { privyClient } from "@/lib/privy/client";
import { createAuthorizationContext } from "@/lib/privy/authorization";

async function signMessage(
  walletId: string,
  message: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);


  const signature = await privyClient.wallets.ethereum(walletId).signMessage(
    { message },
    { authorizationContext: authContext }
  );

  return signature;
}
```

**Why This is Required:**
- Ensures the user is authenticated
- Proves the user approves the transaction
- Prevents unauthorized wallet access
- Maintains self-custody principles

---

## 6. Server Authorization Keys

### Generate Authorization Key Pair

```bash
# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out private.pem

# Extract public key
openssl ec -in private.pem -pubout -out public.pem

# View private key (add to .env)
cat private.pem

# View public key (add to Privy dashboard)
cat public.pem
```

### Register Public Key in Privy Dashboard

1. Go to Privy Dashboard → Settings → Wallet API
2. Navigate to "Authorization Keys"
3. Click "Add Authorization Key"
4. Paste the public key content
5. Set key name and permissions
6. Save configuration

### Environment Variables

```bash
# .env.local
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
PRIVY_AUTH_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nMHc...\n-----END EC PRIVATE KEY-----"
```

### Initialize SDK with Authorization Key

```typescript
// src/lib/privy/client.ts
import { PrivyClient } from "@privy-io/server-auth";

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY!
    }
  }
);
```

**Authorization Key Quorum:**
- Privy requires both user JWT AND server authorization key
- This creates a "quorum" - both parties must approve
- Server can initiate, but user must authorize
- Prevents rogue server actions without user consent

---

## 7. Signing Messages

### Sign Arbitrary Messages

```typescript
// src/lib/privy/signing.ts
import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

export async function signEthereumMessage(
  walletId: string,
  message: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const signature = await privyClient.wallets.ethereum(walletId).signMessage(
    { message },
    { authorizationContext: authContext }
  );

  return signature;
}

export async function signSolanaMessage(
  walletId: string,
  message: string,
  clerkJwt: string
) {

  const authContext = createAuthorizationContext(clerkJwt);

  const signature = await privyClient.wallets.solana(walletId).signMessage(
    { message },
    { authorizationContext: authContext }
  );

  return signature;
}
```

### API Route: Sign Message

```typescript
// src/app/api/wallet/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { signEthereumMessage, signSolanaMessage } from "@/lib/privy/signing";
import { UserWallet } from "@/models/UserWallet";

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await verifyClerkJWT(request);
    const { message, chain } = await request.json();

    // Get user's wallet
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (!userWallet) {
      throw new Error("Wallet not found");
    }

    let signature;
    if (chain === "ethereum") {
      const walletId = userWallet.wallets.ethereum.walletId;
      signature = await signEthereumMessage(walletId, message, token);
    } else if (chain === "solana") {
      const walletId = userWallet.wallets.solana.walletId;
      signature = await signSolanaMessage(walletId, message, token);
    } else {
      throw new Error("Invalid chain");
    }

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Use Cases:**
- Login signatures (Sign-In with Ethereum)
- Verifying wallet ownership
- Off-chain approvals
- Message authentication

---

## 8. Sending Ethereum Transactions

### Ethereum Transaction Service

```typescript
// src/lib/privy/ethereum.ts
import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

export interface EthereumTransactionParams {
  to: string;
  value?: string; // in wei
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: number;
}

export async function sendEthereumTransaction(
  walletId: string,
  params: EthereumTransactionParams,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const transaction = await privyClient.wallets.ethereum(walletId).sendTransaction(
    params,
    { authorizationContext: authContext }
  );

  return {
    transactionHash: transaction.hash,
    status: transaction.status
  };
}

export async function sendEth(
  walletId: string,
  toAddress: string,
  amountInEth: string,
  clerkJwt: string
) {

  // Convert ETH to wei
  const valueInWei = (parseFloat(amountInEth) * 1e18).toString();

  return sendEthereumTransaction(
    walletId,
    {
      to: toAddress,
      value: valueInWei
    },
    clerkJwt
  );
}
```

### API Route: Send ETH

```typescript
// src/app/api/wallet/ethereum/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { sendEth } from "@/lib/privy/ethereum";
import { UserWallet } from "@/models/UserWallet";

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await verifyClerkJWT(request);
    const { to, amount } = await request.json();

    // Validate inputs
    if (!to || !amount) {
      throw new Error("Missing required fields");
    }

    // Get user's Ethereum wallet
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (!userWallet?.wallets.ethereum) {
      throw new Error("Ethereum wallet not found");
    }

    const walletId = userWallet.wallets.ethereum.walletId;

    // Send transaction
    const result = await sendEth(walletId, to, amount, token);

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      status: result.status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Key Concepts:**
- **Value**: Amount in wei (1 ETH = 10^18 wei)
- **Gas**: Maximum gas units for transaction
- **Gas Price**: Price per gas unit in wei
- **Nonce**: Transaction sequence number (auto-managed by Privy)
- **Data**: Contract call data (for smart contract interactions)

---

## 9. Sending Solana Transactions

### Solana Transaction Service

```typescript
// src/lib/privy/solana.ts
import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

export interface SolanaTransactionParams {
  to: string;
  lamports: number;
  instructions?: any[];
}

export async function sendSolanaTransaction(
  walletId: string,
  params: SolanaTransactionParams,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const transaction = await privyClient.wallets.solana(walletId).sendTransaction(
    params,
    { authorizationContext: authContext }
  );

  return {
    signature: transaction.signature,
    status: transaction.status
  };
}

export async function sendSol(
  walletId: string,
  toAddress: string,
  amountInSol: string,
  clerkJwt: string
) {

  // Convert SOL to lamports
  const lamports = Math.floor(parseFloat(amountInSol) * 1e9);

  return sendSolanaTransaction(
    walletId,
    {
      to: toAddress,
      lamports
    },
    clerkJwt
  );
}
```

### API Route: Send SOL

```typescript
// src/app/api/wallet/solana/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { sendSol } from "@/lib/privy/solana";
import { UserWallet } from "@/models/UserWallet";

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await verifyClerkJWT(request);
    const { to, amount } = await request.json();

    // Validate inputs
    if (!to || !amount) {
      throw new Error("Missing required fields");
    }

    // Get user's Solana wallet
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (!userWallet?.wallets.solana) {
      throw new Error("Solana wallet not found");
    }

    const walletId = userWallet.wallets.solana.walletId;

    // Send transaction
    const result = await sendSol(walletId, to, amount, token);

    return NextResponse.json({
      success: true,
      signature: result.signature,
      status: result.status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Key Concepts:**
- **Lamports**: Smallest unit of SOL (1 SOL = 10^9 lamports)
- **Instructions**: Array of Solana program instructions
- **Signature**: Transaction signature (similar to Ethereum hash)
- **Recent Blockhash**: Auto-managed by Privy

---

## 10. Full End-to-End Flow

### Signup Flow

```typescript
// 1. User signs up with Clerk
// Frontend automatically handled by Clerk

// 2. After signup, create Privy user and wallets
// src/app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { createPrivyUser } from "@/lib/privy/users";
import { createUserWallets } from "@/lib/privy/wallets";
import { UserWallet } from "@/models/UserWallet";

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await verifyClerkJWT(request);

    // Create Privy user
    const privyUserId = await createPrivyUser(userId);

    // Create wallets
    const wallets = await createUserWallets(privyUserId);

    // Save to database
    await UserWallet.create({
      clerkUserId: userId,
      privyUserId,
      wallets: {
        ethereum: {
          walletId: wallets.ethereum.id,
          address: wallets.ethereum.address
        },
        solana: {
          walletId: wallets.solana.id,
          address: wallets.solana.address
        }
      }
    });

    return NextResponse.json({
      success: true,
      wallets: {
        ethereum: wallets.ethereum.address,
        solana: wallets.solana.address
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Transaction Flow

```typescript
// Frontend: Initiate transaction

import { useAuth } from "@clerk/nextjs";

function SendTransaction() {
  const { getToken } = useAuth();

  async function sendEth() {
    const token = await getToken();

    const response = await fetch("/api/wallet/ethereum/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        amount: "0.01"
      })
    });

    const result = await response.json();
    console.log("Transaction hash:", result.transactionHash);
  }

  return <button onClick={sendEth}>Send 0.01 ETH</button>;
}
```

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SIGNUP FLOW                          │
└─────────────────────────────────────────────────────────┘

1. User → Clerk: Sign up with email/social
2. Clerk → Frontend: Return JWT
3. Frontend → Backend: POST /api/onboarding + JWT
4. Backend → Clerk: Verify JWT
5. Backend → Privy: Create user (custom_user_id = Clerk ID)
6. Backend → Privy: Create Ethereum wallet
7. Backend → Privy: Create Solana wallet
8. Backend → Database: Save wallet IDs
9. Backend → Frontend: Return wallet addresses

┌─────────────────────────────────────────────────────────┐
│                  TRANSACTION FLOW                       │
└─────────────────────────────────────────────────────────┘

1. User → Frontend: Click "Send ETH"
2. Frontend → Clerk: Get JWT token
3. Frontend → Backend: POST /api/wallet/ethereum/send + JWT
4. Backend → Clerk: Verify JWT
5. Backend → Database: Get wallet ID
6. Backend → Privy: Request user key (with JWT)
7. Privy → Clerk JWKS: Verify JWT
8. Privy → Backend: Return ephemeral key
9. Backend → Privy: Sign transaction
10. Privy → Ethereum: Broadcast transaction
11. Ethereum → Privy: Return transaction hash
12. Privy → Backend: Return result
13. Backend → Frontend: Return transaction hash
14. Frontend → User: Show confirmation
```

---

## 11. Security Best Practices

### 1. Never Store Private Keys

```typescript
// ❌ NEVER DO THIS
const privateKey = "0x1234...";
localStorage.setItem("privateKey", privateKey);

// ✅ DO THIS
// Let Privy manage keys, only store wallet IDs
const walletId = "wallet_abc123";
await database.save({ userId, walletId });
```

### 2. Always Verify JWT

```typescript
// ❌ NEVER DO THIS
const userId = request.headers.get("x-user-id");

// ✅ DO THIS
const { userId } = await verifyClerkJWT(request);
```

### 3. Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m")
});

export async function checkRateLimit(userId: string) {
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    throw new Error("Rate limit exceeded");
  }
}
```

### 4. Transaction Validation

```typescript
// src/lib/validation/transaction.ts
export function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < 1000000;
}

export function validateTransaction(to: string, amount: string) {
  if (!validateEthereumAddress(to)) {
    throw new Error("Invalid recipient address");
  }
  if (!validateAmount(amount)) {
    throw new Error("Invalid amount");
  }
}
```

### 5. Use Wallet Policies

Configure in Privy Dashboard:
- Maximum transaction amount per day
- Allowed recipient addresses (whitelist)
- Required confirmations
- Time-based restrictions

### 6. Audit Logging

```typescript
// src/lib/audit/logger.ts
import { AuditLog } from "@/models/AuditLog";

export async function logTransaction(data: {
  userId: string;
  walletId: string;
  action: string;
  amount?: string;
  recipient?: string;
  transactionHash?: string;
  status: string;
}) {
  await AuditLog.create({
    ...data,
    timestamp: new Date(),
    ipAddress: request.ip
  });
}
```

### 7. Environment Variables Security

```bash
# .env.local - NEVER commit to git
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTH_PRIVATE_KEY=
CLERK_SECRET_KEY=
```

```gitignore
# .gitignore
.env.local
.env
*.pem
```

---

## 12. Advanced Features

### Gasless Transactions (Ethereum)

```typescript
// src/lib/privy/gasless.ts

import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

export async function sendGaslessTransaction(
  walletId: string,
  to: string,
  data: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  // Use a relayer to sponsor gas
  const transaction = await privyClient.wallets.ethereum(walletId).sendTransaction(
    {
      to,
      data,
      gasPrice: "0" // Relayer pays gas
    },
    {
      authorizationContext: authContext,
      sponsorGas: true // Enable gas sponsorship
    }
  );

  return transaction;
}
```

### Wallet Policies

Configure transaction policies in Privy Dashboard:

```typescript
// Example policy configuration (set in dashboard)
{
  "maxTransactionAmount": "1000000000000000000", // 1 ETH in wei
  "dailyLimit": "5000000000000000000", // 5 ETH per day
  "allowedRecipients": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  ],
  "requireConfirmation": true,
  "cooldownPeriod": 300 // 5 minutes between transactions
}
```

### Batch Transactions

```typescript
// src/lib/privy/batch.ts
import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

export async function sendBatchTransactions(
  walletId: string,
  transactions: Array<{ to: string; value: string }>,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const results = await Promise.all(
    transactions.map(tx =>
      privyClient.wallets.ethereum(walletId).sendTransaction(
        tx,
        { authorizationContext: authContext }
      )
    )
  );

  return results.map(r => ({
    hash: r.hash,
    status: r.status
  }));
}
```

### Smart Accounts (Account Abstraction)

```typescript
// src/lib/privy/smartAccount.ts
import { privyClient } from "./client";

export async function createSmartAccount(
  privyUserId: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  // Create ERC-4337 smart account
  const smartAccount = await privyClient.wallets.create({
    chainType: "ethereum",
    owner: { userId: privyUserId },
    type: "smart_account", // Enable account abstraction
    config: {
      implementation: "safe", // Use Safe (Gnosis Safe)
      version: "1.3.0"
    }
  });

  return smartAccount;
}
```

### Wallet Pregeneration

Privy can pre-generate wallets before user signup:

```typescript
// src/lib/privy/pregeneration.ts
import { privyClient } from "./client";

export async function pregenerateWallet(email: string) {
  // Create user with email (before they sign up)
  const user = await privyClient.createUser({
    linkedAccounts: [{
      type: "email",
      address: email
    }]
  });

  // Create wallets
  const ethWallet = await privyClient.wallets.create({
    chainType: "ethereum",
    owner: { userId: user.id }
  });

  // Send assets to wallet address before user signs up
  return {
    userId: user.id,
    walletAddress: ethWallet.address
  };
}

// Later, when user signs up with Clerk
export async function linkPregeneratedWallet(
  privyUserId: string,
  clerkUserId: string
) {
  // Link Clerk account to existing Privy user
  await privyClient.linkAccount(privyUserId, {
    type: "custom_auth",
    customUserId: clerkUserId
  });
}
```

### Webhook Integration

```typescript
// src/app/api/webhooks/privy/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-privy-signature");

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.PRIVY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle different event types
  switch (event.type) {
    case "wallet.transaction.confirmed":
      // Update database with confirmed transaction
      await handleTransactionConfirmed(event.data);
      break;
    case "wallet.transaction.failed":
      // Handle failed transaction
      await handleTransactionFailed(event.data);
      break;
  }

  return NextResponse.json({ received: true });
}
```

---

## Recommended Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── onboarding/
│   │   │   └── route.ts
│   │   ├── wallet/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   ├── sign/
│   │   │   │   └── route.ts
│   │   │   ├── ethereum/
│   │   │   │   └── send/
│   │   │   │       └── route.ts
│   │   │   └── solana/
│   │   │       └── send/
│   │   │           └── route.ts
│   │   ├── privy/
│   │   │   └── user/
│   │   │       └── create/
│   │   │           └── route.ts
│   │   └── webhooks/
│   │       └── privy/
│   │           └── route.ts
│   └── (dashboard)/
│       └── wallet/
│           └── page.tsx
├── lib/
│   ├── auth/
│   │   └── clerk.ts
│   ├── privy/
│   │   ├── client.ts
│   │   ├── users.ts
│   │   ├── wallets.ts
│   │   ├── authorization.ts
│   │   ├── ethereum.ts
│   │   ├── solana.ts
│   │   ├── signing.ts
│   │   ├── gasless.ts
│   │   ├── batch.ts
│   │   └── smartAccount.ts
│   ├── validation/
│   │   └── transaction.ts
│   └── audit/
│       └── logger.ts
├── models/
│   ├── UserWallet.ts
│   └── AuditLog.ts
├── middleware/
│   └── rateLimit.ts
└── types/
    └── privy.ts
```

---

## Environment Variables Checklist

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Privy
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTH_PRIVATE_KEY=
PRIVY_WEBHOOK_SECRET=

# Database
MONGODB_URI=

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Quick Start Checklist

- [ ] Install dependencies: `npm install @privy-io/server-auth @clerk/nextjs`
- [ ] Configure Clerk authentication
- [ ] Set up Privy dashboard with JWT authentication
- [ ] Add Clerk JWKS endpoint to Privy
- [ ] Generate authorization key pair
- [ ] Add public key to Privy dashboard
- [ ] Set environment variables
- [ ] Create database models
- [ ] Implement Privy client initialization
- [ ] Create user onboarding API route
- [ ] Create wallet creation API routes
- [ ] Implement transaction API routes
- [ ] Add rate limiting
- [ ] Set up audit logging
- [ ] Configure wallet policies
- [ ] Test end-to-end flow

---

## Additional Resources

- [Privy Documentation](https://docs.privy.io)
- [Clerk Documentation](https://clerk.com/docs)
- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [ERC-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)

---

**Last Updated**: March 2026
