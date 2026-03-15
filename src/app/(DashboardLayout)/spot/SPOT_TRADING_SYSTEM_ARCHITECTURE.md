# WorldStreet Spot Trading System Architecture

## Overview

This document provides a comprehensive analysis of how the WorldStreet spot trading system works, including the integration between the frontend spot page, Privy wallet management system, and the proposed automated deposit flow.

## Table of Contents

1. [Spot Page Architecture](#spot-page-architecture)
2. [Privy Integration](#privy-integration)
3. [Hyperliquid Integration](#hyperliquid-integration)
4. [Current Trading Flow](#current-trading-flow)
5. [Deposit Architecture Plan](#deposit-architecture-plan)
6. [Implementation Status](#implementation-status)

---

## 1. Spot Page Architecture

### 1.1 Main Component: `binance-page.tsx`

The spot trading page is implemented as a responsive trading interface with both mobile and desktop layouts.

**Key Features:**
- **Responsive Design**: Separate mobile and desktop layouts
- **Real-time Market Data**: Integration with Hyperliquid markets
- **Dynamic Pair Selection**: URL-based pair routing
- **Live Balance Display**: Real-time USDC balance from Hyperliquid
- **Trading Interface**: Order book, charts, and trading forms

**State Management:**
```typescript
// Core trading state
const [selectedPair, setSelectedPair] = useState<string>('BTC');
const [pairData, setPairData] = useState<PairData>({
  name: 'BTC',
  price: 0,
  change24h: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0
});

// Mobile-specific states
const [showMobileTradingModal, setShowMobileTradingModal] = useState(false);
const [mobileOrderSide, setMobileOrderSide] = useState<'buy' | 'sell'>('buy');
const [showTokenSearchModal, setShowTokenSearchModal] = useState(false);
const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'orderbook' | 'trades' | 'positions'>('chart');
```

### 1.2 Layout Structure

**Desktop Layout (Grid-based):**
```
┌─────────────────────────────────────────────────────────────┐
│                    Header (60px)                            │
│  Logo + Nav    │    Pair Info    │    Balance Display       │
├─────────────────────────────────────────────────────────────┤
│ Market │        Chart         │ Order │    Trading         │
│ List   │       (46.5%)        │ Book  │    Panel           │
│(19.5%) │                      │ (14%) │    (20%)           │
│        │                      │       │                    │
├─────────────────────────────────────────────────────────────┤
│                 Bottom Panel (200px)                        │
│              Positions & Order History                      │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Layout (Stacked):**
```
┌─────────────────────┐
│      Header         │
├─────────────────────┤
│    Pair Header      │
├─────────────────────┤
│   Tab Navigation    │
├─────────────────────┤
│                     │
│   Content Area      │
│  (Chart/Book/etc)   │
│                     │
├─────────────────────┤
│  Trading Buttons    │
└─────────────────────┘
```
### 1.3 Key Components Integration

**Market Data Flow:**
```typescript
// Hyperliquid markets integration
const {
  markets: hyperliquidMarkets,
  loading: marketsLoading
} = useHyperliquidMarkets({
  includeStats: true,
  enabled: true
});

// Dynamic pair generation
const AVAILABLE_PAIRS = React.useMemo(() => {
  const defaultPairs = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'LINK'];
  
  if (hyperliquidMarkets.length > 0) {
    const hyperliquidPairs = hyperliquidMarkets
      .map(market => market.baseAsset)
      .filter(asset => asset && asset !== 'USD');
    
    return [...new Set([...defaultPairs, ...hyperliquidPairs])];
  }
  
  return defaultPairs;
}, [hyperliquidMarkets]);
```

**Balance Display Integration:**
```typescript
// Clerk authentication for user identification
const { user, isLoaded } = useUser();

// Balance display with backend-only Privy integration
{isLoaded && user ? (
  <HyperliquidBalanceDisplay
    userId={user.id}
    className="text-[12px]"
  />
) : (
  <div className="flex items-center gap-3 text-[12px]">
    <div className="flex flex-col items-end">
      <span className="text-[11px] text-[#848e9c]">WorldStreet</span>
      <span className="text-white font-medium">
        {isLoaded ? 'No Wallet' : 'Loading...'}
      </span>
    </div>
  </div>
)}
```

---

## 2. Privy Integration

### 2.1 Backend-Only Architecture

**Design Philosophy:**
- **No Frontend Privy SDK**: All Privy interactions happen on the server side
- **Clerk Authentication**: Frontend uses Clerk for user identification
- **API-Based Wallet Management**: All wallet operations go through Next.js API routes
- **Security First**: Private keys never exposed to frontend

### 2.2 Privy API Routes Structure

```
src/app/api/privy/
├── get-wallet/route.ts          # Get or create multi-chain wallets
├── setup-trading-wallet/route.ts # Setup Arbitrum trading wallet
├── pregenerate-wallet/route.ts  # Pre-generate wallets for users
├── refresh-wallet/route.ts      # Refresh wallet data
├── link-clerk/route.ts          # Link Clerk user to Privy
├── debug-wallets/route.ts       # Debug wallet information
├── test-authorization/route.ts  # Test Privy authorization
├── onboarding/route.ts          # User onboarding flow
└── wallet/
    ├── sign/route.ts            # Sign transactions
    ├── send/route.ts            # Generic send endpoint
    ├── ethereum/send/route.ts   # Ethereum transactions
    ├── solana/send/route.ts     # Solana transactions
    ├── tron/send/route.ts       # Tron transactions
    ├── sui/send/route.ts        # Sui transactions
    └── ton/send/route.ts        # TON transactions
```

### 2.3 Wallet Management Flow

**User Wallet Creation:**
```typescript
// 1. User signs up with Clerk
// 2. Dashboard calls /api/privy/get-wallet
// 3. Backend creates Privy user with multi-chain wallets
// 4. Wallets stored in MongoDB (UserWallet model)

interface UserWallet {
  email: string;
  clerkUserId: string;
  privyUserId: string;
  wallets: {
    ethereum: { walletId: string; address: string; publicKey?: string };
    solana: { walletId: string; address: string; publicKey?: string };
    sui: { walletId: string; address: string; publicKey?: string };
    ton: { walletId: string; address: string; publicKey?: string };
    tron: { walletId: string; address: string; publicKey?: string };
  };
}
```

**Trading Wallet Setup:**
```typescript
// For Hyperliquid trading, users need an Arbitrum wallet
// /api/privy/setup-trading-wallet creates:
// 1. Arbitrum wallet via Privy
// 2. Links to user's account
// 3. Enables gas sponsorship (sponsor: true)
```
### 2.4 Balance Fetching Architecture

**Backend Flow:**
```typescript
// 1. Frontend: HyperliquidBalanceDisplay component
// 2. Hook: useHyperliquidBalance(userId)
// 3. API: /api/hyperliquid/balance?userId={clerkUserId}
// 4. Backend: Get user's Ethereum wallet via Privy Node SDK
// 5. Backend: Fetch balance from Hyperliquid using wallet address
// 6. Frontend: Display balance in UI

// API Route Implementation
export async function GET(request: NextRequest) {
  const userId = searchParams.get('userId');
  
  // Get user's Ethereum wallet from Privy
  const user = await (privyClient as any).users().get(userId);
  const accounts = (user as any).linked_accounts || [];
  const ethereumWallet = accounts.find(
    (account: any) => account.type === 'wallet' && account.chain_type === 'ethereum'
  );
  
  const address = (ethereumWallet as any).address;
  
  // Get account state from Hyperliquid
  const accountState = await hyperliquid.getAccount(address) as any;
  
  // Extract and return balance data
  return NextResponse.json({
    success: true,
    data: {
      address,
      balances: spotBalances,
      usdcBalance: { total, available, hold },
      accountValue: parseFloat(accountValue),
      withdrawable: parseFloat(withdrawable)
    }
  });
}
```

---

## 3. Hyperliquid Integration

### 3.1 Simple Client Architecture

**Design Principles:**
- **Rate Limit Friendly**: Only 2 API calls total (`meta()` and `allMids()`)
- **No Statistics**: Avoids 229 candleSnapshot requests that caused 429 errors
- **Minimal Data**: Focus on essential trading information only

```typescript
// src/lib/hyperliquid/simple.ts
class HyperliquidClient {
  private info = new InfoClient({
    transport: new HttpTransport()
  });

  async getMarkets() {
    const [meta, mids] = await Promise.all([
      this.info.meta(),
      this.info.allMids()
    ]);

    return meta.universe
      .filter((a: any) => !a.name.includes('-PERP')) // Only spot markets
      .map((a: any) => ({
        symbol: a.name,
        baseAsset: a.name.split('/')[0] || a.name,
        quoteAsset: a.name.split('/')[1] || 'USD',
        price: Number(mids[a.name] ?? 0),
        change24h: 0, // No stats to avoid rate limiting
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        chain: 'ethereum' as const
      }));
  }

  async getAccount(address: string) {
    return this.info.clearinghouseState({ user: address });
  }
}
```

### 3.2 Balance Integration

**Key Insight: Spot Reads from Perps**
```typescript
// useSpotBalances.ts reads accountValue from Perps wallet
// This means HL bridge deposits are immediately usable for spot trading
// No Perps → Spot transfer needed

const spotBalances = accountState?.spotState?.balances || [];
const accountValue = accountState?.clearinghouseState?.crossMarginSummary?.accountValue || "0";

// USDC balance structure
const usdcBalance = {
  total: parseFloat(usdcBalance?.total || "0"),
  available: parseFloat(usdcBalance?.total || "0") - parseFloat(usdcBalance?.hold || "0"),
  hold: parseFloat(usdcBalance?.hold || "0")
};
```

### 3.3 Bridge Integration

**Hyperliquid Bridge2 Specifications:**
- **Contract**: `0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7`
- **Chain**: Arbitrum One only
- **Token**: Native USDC (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`)
- **Minimum**: 5 USDC (below = lost forever)
- **Speed**: Credited in < 1 minute
- **Credit Rule**: Credits the sender's address on Hyperliquid
- **Destination**: Deposits land in Perps wallet by default

---

## 4. Current Trading Flow

### 4.1 User Journey

**Step 1: Authentication & Wallet Setup**
```
User Signs Up → Clerk Authentication → Privy Wallet Creation → Trading Wallet Setup
```

**Step 2: Balance Display**
```
Page Load → useHyperliquidBalance(userId) → API Call → Privy Wallet Lookup → Hyperliquid Balance Fetch → UI Update
```

**Step 3: Market Data**
```
Page Load → useHyperliquidMarkets() → Simple Client → meta() + allMids() → Market List Update
```

**Step 4: Trading (Current Manual Process)**
```
User Funds Ethereum Wallet → Manual USDT→USDC Swap → Manual Bridge to Arbitrum → Manual Transfer to Hyperliquid → Trading Ready
```

### 4.2 Component Hierarchy

```
BinanceSpotPage
├── HyperliquidBalanceDisplay
│   └── useHyperliquidBalance
│       └── /api/hyperliquid/balance
├── BinanceMarketList
│   └── useHyperliquidMarkets
│       └── /api/hyperliquid/markets
├── BinanceOrderBook
├── BinanceOrderForm
├── LiveChart
├── MarketTrades
├── PositionsPanel
└── Modals
    ├── MobileTradingModal
    └── MobileTokenSearchModal
```
---

## 5. Deposit Architecture Plan

### 5.1 Problem Statement

The current spot deposit journey requires **4 manual steps**:

1. **Fund Ethereum wallet** — User acquires ETH + USDT on Ethereum mainnet
2. **Swap & Bridge** — User swaps USDT → USDC, then bridges from Ethereum → Arbitrum
3. **Internal Transfer** — Transfer Arb USDC from user's trading wallet to Hyperliquid via Bridge2
4. **Trade** — Funds appear in HL Perps wallet (which the spot page reads from)

**Core Problems:**
- Too many manual steps for the user
- Token mismatch (USDT in, but HL only accepts native USDC on Arbitrum)
- Chain mismatch (user may fund on Ethereum or Solana, but HL bridge is on Arbitrum)
- Wallet mismatch (HL credits the sender's address, not a recipient)
- No automation — every step requires user action

### 5.2 Proposed Automated Solution

**User-Facing Flow (2 actions only):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER-FACING FLOW (2 actions)                     │
│                                                                     │
│  ① User clicks "Deposit" on Spot page                              │
│  ② User sends USDT to displayed treasury address                    │
│     (from any wallet on Ethereum or Solana)                         │
│                                                                     │
│  ─── Everything below is automated ───                              │
│                                                                     │
│  ③ Admin backend detects USDT on-chain (30s polling)                │
│  ④ matchAndDisburse() matches tx → DepositRequest                  │
│  ⑤ Treasury disburses Arb USDC to user's trading wallet            │
│  ⑥ Dashboard auto-triggers: trading wallet → HL Bridge2            │
│  ⑦ Funds credited to user's HL Perps account (< 1 min)             │
│  ⑧ Spot page shows updated balance via useSpotBalances              │
│                                                                     │
│  Total user actions: 2 (click deposit + send USDT)                  │
│  Total wait time: ~2-5 minutes                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Infrastructure Analysis

**Admin Backend (worldstreet-admin) - ✅ Built:**
- **On-chain Polling**: `depositWatcherService.js` polls Ethereum/Solana every 30s
- **Auto-detect & Match**: `matchAndDisburse()` atomically matches transactions
- **Disbursement**: `disbursementService.js` sends tokens via Privy
- **Treasury Wallets**: Privy server-managed wallets per chain
- **Deposit CRUD**: API-key-authenticated endpoints
- **Token Registry**: USDC/USDT addresses on all chains

**Dashboard (worldstreet-dashboard) - ✅ Built:**
- **HL Bridge Transfer**: `/api/privy/transfer/route.ts` with `sponsor: true`
- **HL Balance**: `useHyperliquidBalance.ts` fetches Perps account value
- **Spot Balances**: `useSpotBalances.ts` uses `accountValue` as `quoteBalance`
- **Trading Wallet**: Privy server-managed wallet on Arbitrum
- **Gas Sponsorship**: Users don't need ETH on Arbitrum

### 5.4 Token Flow Diagram

```
User's External Wallet (ETH/SOL)
│
│  USDT (Ethereum or Solana)
▼
Treasury Receive Wallet (ETH/SOL)
│
│  [Admin backend detects + matches]
│  Arb USDC (Arbitrum)
▼
Treasury Disburse Wallet (Arbitrum)
│
│  Arb USDC (Arbitrum)
▼
User's Trading Wallet (Arbitrum, Privy-managed)
│
│  Arb USDC → HL Bridge2 contract (sponsor: true, gas-free)
▼
Hyperliquid Perps Account
│
│  [useSpotBalances reads accountValue]
▼
Spot Trading Page — Balance Ready
```

### 5.5 Critical Issue: Matching Problem

**Current Bug:**
```javascript
// Current matching logic in depositWatcherService.js
candidate.userWalletAddress === fromAddress  // on-chain sender
```

**Problem:** 
- `userWalletAddress` = user's Arbitrum trading wallet (destination)
- `fromAddress` = user's Ethereum/Solana wallet (source)
- These are on different chains and will never match

**Proposed Fix (Approach A):**
```javascript
// Add new field to DepositRequest model
depositFromAddress: {
  type: String,  // The address user will send from
  required: true
}

// Updated matching logic
candidate.depositFromAddress === fromAddress  // match against SENDING address
// candidate.userWalletAddress remains the DESTINATION for disbursement
```

### 5.6 Implementation Requirements

**Priority P0 (Critical):**
1. **Admin Model Fix**: Add `depositFromAddress` field to DepositRequest
2. **Dashboard Deposit API**: `POST /api/spot/deposit/initiate`
3. **HL Bridge Utility**: Extract bridge logic into reusable function

**Priority P1 (High):**
4. **Auto-Bridge Trigger**: Detect USDC arrival, trigger HL bridge
5. **Deposit UI Component**: Network picker, amount input, treasury address

**Priority P2 (Medium):**
6. **Status Polling API**: `GET /api/spot/deposit/status`
7. **Status Tracker Component**: Real-time progress tracking
8. **Admin Notification**: Post-disbursement webhook/callback

### 5.7 Gas & Cost Analysis

| Step | Who Pays Gas | Chain | Estimated Cost |
|------|--------------|-------|----------------|
| User sends USDT | User | Ethereum (~$2-5) or Solana (~$0.001) | User's responsibility |
| Treasury disburses Arb USDC | Treasury (Privy) | Arbitrum | ~$0.01-0.05 |
| Trading wallet → HL Bridge | Privy sponsor | Arbitrum | ~$0.01-0.05 (free for user) |

**Total user cost:** Only the initial USDT send gas fee. Everything else is sponsored.

### 5.8 Security Considerations

1. **Minimum Deposit**: Must enforce ≥ 5 USDC equivalent (HL minimum)
2. **Deposit Expiry**: 24h expiry on DepositRequest
3. **Amount Validation**: `depositFromAddress` matching prevents collision
4. **API Authentication**: Dashboard → Admin backend uses `x-api-key`
5. **Rate Limiting**: Prevent deposit initiation abuse
6. **Balance Verification**: Verify USDC arrival before triggering HL bridge
---

## 6. Implementation Status

### 6.1 Completed Components

**✅ Spot Page Frontend:**
- Responsive trading interface (mobile + desktop)
- Real-time market data integration
- Dynamic pair selection with URL routing
- Balance display with backend-only Privy integration

**✅ Privy Backend Integration:**
- Multi-chain wallet creation and management
- Backend-only architecture (no frontend SDK)
- Clerk authentication integration
- Gas sponsorship for Arbitrum transactions

**✅ Hyperliquid Integration:**
- Simple client with rate-limit-friendly API calls
- Balance fetching from Perps wallet
- Bridge transfer functionality
- Account state monitoring

**✅ Infrastructure Foundation:**
- Admin backend with deposit watching
- Treasury wallet management
- Token registry and disbursement system
- MongoDB integration for user data

### 6.2 Pending Implementation

**🔄 Automated Deposit System:**
- Deposit initiation API routes
- Status tracking and polling
- Auto-bridge trigger mechanism
- Frontend deposit UI components

**🔄 Admin Backend Updates:**
- `depositFromAddress` field addition
- Matching logic fixes
- Post-disbursement notifications

### 6.3 API Routes Summary

**Implemented:**
```
/api/hyperliquid/balance     # Get user's HL balance
/api/hyperliquid/markets     # Get market data
/api/privy/get-wallet        # Get/create user wallets
/api/privy/transfer          # Bridge to Hyperliquid
```

**Pending:**
```
/api/spot/deposit/initiate   # Start deposit process
/api/spot/deposit/status     # Check deposit status
/api/spot/deposit/bridge     # Auto-bridge trigger
```

### 6.4 Component Architecture

**Current Structure:**
```
src/app/(DashboardLayout)/spot/
├── binance-page.tsx                    # Main trading page
├── SPOT_TRADING_SYSTEM_ARCHITECTURE.md # This documentation
└── components/
    ├── HyperliquidBalanceDisplay.tsx   # Balance widget
    ├── BinanceMarketList.tsx          # Market selector
    ├── BinanceOrderBook.tsx           # Order book
    ├── BinanceOrderForm.tsx           # Trading form
    └── [other trading components]
```

**Planned Additions:**
```
src/components/spot/
├── DepositModal.tsx           # Deposit initiation UI
├── DepositStatusTracker.tsx   # Real-time status tracking
└── [deposit-related components]
```

---

## 7. Development Guidelines

### 7.1 Code Standards

**Backend API Routes:**
- Use TypeScript with proper error handling
- Implement rate limiting and authentication
- Follow RESTful conventions
- Include comprehensive logging

**Frontend Components:**
- Use React hooks for state management
- Implement proper loading and error states
- Follow responsive design patterns
- Include accessibility features

**Database Operations:**
- Use MongoDB with Mongoose ODM
- Implement proper connection pooling
- Include data validation and sanitization
- Follow GDPR compliance for user data

### 7.2 Testing Strategy

**Unit Tests:**
- API route functionality
- Component rendering and interactions
- Utility function behavior
- Error handling scenarios

**Integration Tests:**
- End-to-end deposit flow
- Privy wallet operations
- Hyperliquid API interactions
- Database operations

**Security Tests:**
- Authentication and authorization
- Input validation and sanitization
- Rate limiting effectiveness
- Private key protection

---

## 8. Monitoring and Maintenance

### 8.1 Key Metrics

**Performance Metrics:**
- API response times
- Database query performance
- Frontend load times
- Error rates and types

**Business Metrics:**
- Deposit success rates
- User conversion rates
- Trading volume
- Balance accuracy

**Security Metrics:**
- Failed authentication attempts
- Rate limit violations
- Suspicious transaction patterns
- Wallet security events

### 8.2 Operational Procedures

**Daily Operations:**
- Monitor deposit processing
- Check treasury wallet balances
- Review error logs and alerts
- Verify Hyperliquid connectivity

**Weekly Operations:**
- Analyze user behavior patterns
- Review security incidents
- Update market data accuracy
- Performance optimization review

**Monthly Operations:**
- Security audit and review
- Infrastructure cost analysis
- User feedback integration
- Feature usage analytics

---

*This document serves as the comprehensive guide for understanding and maintaining the WorldStreet spot trading system. It should be updated as new features are implemented and architectural changes are made.*