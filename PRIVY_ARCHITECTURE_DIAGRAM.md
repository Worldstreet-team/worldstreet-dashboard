# Clerk + Privy Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                            │
│                         (Next.js + React)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Sign In    │  │   Wallet     │  │  Send ETH/   │            │
│  │   Component  │  │   Dashboard  │  │  SOL Button  │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                  │                     │
│         │ Clerk.useAuth() │                  │                     │
│         │ getToken()      │                  │ getToken()          │
│         ▼                 ▼                  ▼                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │           Clerk Authentication Provider              │         │
│  │         (JWT Token Management)                       │         │
│  └──────────────────────────────────────────────────────┘         │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │ Bearer Token
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND API LAYER                            │
│                      (Next.js API Routes)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  API Route: /api/privy/onboarding                            │ │
│  │  • Verify Clerk JWT                                          │ │
│  │  • Create Privy user                                         │ │
│  │  • Create ETH + SOL wallets                                  │ │
│  │  • Save to database                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  API Route: /api/privy/wallet/ethereum/send                  │ │
│  │  • Verify Clerk JWT                                          │ │
│  │  • Get wallet ID from database                               │ │
│  │  • Create authorization context                              │ │
│  │  • Send transaction via Privy                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  API Route: /api/privy/wallet/solana/send                    │ │
│  │  • Verify Clerk JWT                                          │ │
│  │  • Get wallet ID from database                               │ │
│  │  • Create authorization context                              │ │
│  │  • Send transaction via Privy                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│         │                        │                        │        │
│         ▼                        ▼                        ▼        │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐ │
│  │   Clerk     │         │   Privy     │         │  MongoDB    │ │
│  │   Verify    │         │   Client    │         │  Database   │ │
│  │   JWT       │         │   SDK       │         │             │ │
│  └─────────────┘         └──────┬──────┘         └─────────────┘ │
│                                 │                                  │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │ HTTPS API Call
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PRIVY PLATFORM                               │
│                    (Wallet Infrastructure)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  JWT Verification Service                                    │ │
│  │  • Fetch Clerk JWKS endpoint                                 │ │
│  │  • Verify JWT signature                                      │ │
│  │  • Extract user ID from 'sub' claim                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Authorization Quorum                                        │ │
│  │  • User JWT ✓                                                │ │
│  │  • Server Authorization Key ✓                                │ │
│  │  • Both required for transaction                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Wallet Key Management                                       │ │
│  │  • Encrypted private keys                                    │ │
│  │  • Ephemeral signing keys                                    │ │
│  │  • Transaction signing                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   ETHEREUM BLOCKCHAIN    │      │   SOLANA BLOCKCHAIN      │
│                          │      │                          │
│  • RPC Node              │      │  • RPC Node              │
│  • Transaction Pool      │      │  • Transaction Pool      │
│  • Block Confirmation    │      │  • Block Confirmation    │
└──────────────────────────┘      └──────────────────────────┘
```

## Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│  User   │                                    │  Clerk  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. Sign In (email/social)                  │
     ├─────────────────────────────────────────────▶
     │                                              │
     │  2. Return JWT Token                        │
     ◀─────────────────────────────────────────────┤
     │                                              │
     │                                              │
┌────┴────┐                                    ┌────┴────┐
│Frontend │                                    │ Backend │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  3. POST /api/privy/onboarding              │
     │     Authorization: Bearer <JWT>             │
     ├─────────────────────────────────────────────▶
     │                                              │
     │                                              │  4. Verify JWT
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                         ┌────┴────┐
     │                                         │  Privy  │
     │                                         └────┬────┘
     │                                              │
     │                                              │  5. Create User
     │                                              │     (custom_user_id)
     │                                              ├──────────▶
     │                                              │
     │                                              │  6. Create ETH Wallet
     │                                              ├──────────▶
     │                                              │
     │                                              │  7. Create SOL Wallet
     │                                              ├──────────▶
     │                                              │
     │  8. Return Wallet Addresses                 │
     ◀─────────────────────────────────────────────┤
     │                                              │
```

## Transaction Flow

```
┌─────────┐                                    ┌─────────┐
│  User   │                                    │Frontend │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. Click "Send ETH"                        │
     ├─────────────────────────────────────────────▶
     │                                              │
     │                                              │  2. Get JWT Token
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                         ┌────┴────┐
     │                                         │ Backend │
     │                                         └────┬────┘
     │                                              │
     │  3. POST /api/privy/wallet/ethereum/send    │
     │     Authorization: Bearer <JWT>             │
     │     Body: { to, amount }                    │
     ├─────────────────────────────────────────────▶
     │                                              │
     │                                              │  4. Verify JWT
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                              │  5. Get Wallet ID
     │                                              │     from Database
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                         ┌────┴────┐
     │                                         │  Privy  │
     │                                         └────┬────┘
     │                                              │
     │                                              │  6. Verify JWT
     │                                              │     (JWKS endpoint)
     │                                              ├──────────▶
     │                                              │
     │                                              │  7. Check Authorization
     │                                              │     Quorum (JWT + Key)
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                              │  8. Sign Transaction
     │                                              ├──────────┐
     │                                              │          │
     │                                              ◀──────────┘
     │                                              │
     │                                         ┌────┴────────┐
     │                                         │  Ethereum   │
     │                                         └────┬────────┘
     │                                              │
     │                                              │  9. Broadcast TX
     │                                              ├──────────▶
     │                                              │
     │                                              │  10. Return TX Hash
     │                                              ◀──────────┤
     │                                              │
     │  11. Return Transaction Hash                │
     ◀─────────────────────────────────────────────┤
     │                                              │
     │  12. Show Confirmation                      │
     ├─────────────────────────────────────────────▶
     │                                              │
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      USER IDENTITY                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Clerk User ID: "user_2abc123xyz"                           │
│         │                                                    │
│         │ Maps to                                            │
│         ▼                                                    │
│  Privy User ID: "privy_abc123"                               │
│         │                                                    │
│         │ Owns                                               │
│         ▼                                                    │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  Ethereum Wallet    │    │   Solana Wallet     │        │
│  │  ID: wallet_eth123  │    │   ID: wallet_sol456 │        │
│  │  Address: 0x742...  │    │   Address: 9xQm...  │        │
│  └─────────────────────┘    └─────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  UserWallet {                                                │
│    clerkUserId: "user_2abc123xyz"                            │
│    privyUserId: "privy_abc123"                               │
│    wallets: {                                                │
│      ethereum: {                                             │
│        walletId: "wallet_eth123"                             │
│        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" │
│      }                                                       │
│      solana: {                                               │
│        walletId: "wallet_sol456"                             │
│        address: "9xQm...xyz"                                 │
│      }                                                       │
│    }                                                         │
│    createdAt: 2026-03-12T10:00:00Z                           │
│  }                                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Security Model

```
┌──────────────────────────────────────────────────────────────┐
│                   AUTHORIZATION QUORUM                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Transaction requires BOTH:                                  │
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   User JWT Token   │   AND   │  Server Auth Key   │     │
│  │                    │         │                    │     │
│  │  • Proves user     │         │  • Proves server   │     │
│  │    identity        │         │    identity        │     │
│  │  • User must be    │         │  • Server must be  │     │
│  │    logged in       │         │    authorized      │     │
│  │  • Verified by     │         │  • Private key     │     │
│  │    Clerk JWKS      │         │    signature       │     │
│  └────────────────────┘         └────────────────────┘     │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          ▼                                  │
│              ┌────────────────────────┐                     │
│              │  Transaction Approved  │                     │
│              └────────────────────────┘                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
