# WorldStreet Futures Trading System Architecture

This README defines the **complete futures (perpetuals) trading system** on Hyperliquid using Privy-managed wallets, with **ClerkUserId as wallet owner**, custom auth, and backend‑driven flows.

Hyperliquid is a high‑performance decentralized exchange with perpetual futures markets. Futures trading uses Hyperliquid’s perpetual markets (e.g., `BTC-USD-PERP`, `ETH-USD-PERP`). :contentReference[oaicite:0]{index=0}

---

## Table of Contents

1. [Design Overview](#design-overview)  
2. [Phase 1 — Setup & Prerequisites](#phase-1---setup--prerequisites)  
3. [Phase 2 — Wallet Management (Privy Backend)](#phase-2---wallet-management-privy-backend)  
4. [Phase 3 — Market Data & Orderbook](#phase-3---market-data--orderbook)  
5. [Phase 4 — Futures Orders & Positions](#phase-4---futures-orders--positions)  
6. [Phase 5 — Funding Flow (Deposits & Withdrawals)](#phase-5---funding-flow-deposits--withdrawals)  
7. [Phase 6 — Frontend Components](#phase-6---frontend-components)  
8. [Phase 7 — Order Automation & Matching](#phase-7---order-automation--matching)  
9. [Phase 8 — Security & Monitoring](#phase-8---security--monitoring)  
10. [API Summary](#api-summary)  
11. [Glossary](#glossary)

---

## DESIGN OVERVIEW

- **Backend only Privy**: Wallets are created and managed on your server. Private keys are **never exposed to frontend**.  
- **Clerk auth**: Each Privy wallet uses `clerkUserId` as the owner ID.  
- **Futures focus**: This system supports **perpetual futures markets**, balances, positions, and advanced orders.  
- **Automated funding**: Similar to spot, funding flows from user → treasury → trading wallet → Hyperliquid Bridge.  
- **Live data**: Real‑time market data and orderbook via Hyperliquid Info API. :contentReference[oaicite:1]{index=1}

---

## PHASE 1 - SETUP & PREREQUISITES

1. **Privy Setup**
   - Create a Privy App.
   - Enable **gas sponsorship** on Arbitrum One (for Hyperliquid transactions).  
   - Store `privyAppId` and `privyAppSecret` securely.

2. **Dependencies**
   ```bash
   npm install @privy-io/node @nktkas/hyperliquid viem

Initialize Privy Client (server code):

import { PrivyClient } from "@privy-io/node";

export const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

Hyperliquid Client
Use Privy wallet accounts to build the Hyperliquid client that supports Perpetual markets.

import * as hl from "@nktkas/hyperliquid";

const transport = new hl.HttpTransport({ isTestnet: false });
const futuresClient = new hl.ExchangeClient({ transport, wallet: viemAccount });

Clerk Integration

Use Clerk to authenticate users.

Link clerkUserId → Privy user and wallets.

PHASE 2 - WALLET MANAGEMENT (PRIVY BACKEND)
2.1 Backend API Routes
src/app/api/privy/
├── get-wallet/route.ts            # Create/get Privy user wallets
├── setup-futures-wallet/route.ts  # Create Arbitrum wallet (futures)
├── refresh-wallet/route.ts        # Sync wallet state
├── sign/route.ts                  # Sign Hyperliquid transactions
├── send/route.ts                  # Generic transaction endpoint
2.2 Wallet Creation Flow

On user signup with Clerk:

Clerk User → call /api/privy/get-wallet

Backend:

Create a Privy user if not exist.

Create an Arbitrum wallet.

Store the Privy walletId, address, and ClerkUserId as the owner.

Return wallet metadata.

Wallet Document:

interface UserWallet {
  clerkUserId: string;
  privyUserId: string;
  chains: {
    arbitrum: {
      walletId: string;
      address: string;
    }
  };
}
PHASE 3 - MARKET DATA & ORDERBOOK
3.1 Fetch Futures Markets

Use the Hyperliquid Info API to pull perpetual futures:

const [meta, mids] = await Promise.all([
  infoClient.meta(),
  infoClient.allMids()
]);
const futuresMarkets = meta.universe
  .filter(m => m.name.includes('-PERP'))
  .map(m => ({
    symbol: m.name,
    base: m.name.split('/')[0],
    quote: m.name.split('/')[1] ?? "USD",
    price: Number(mids[m.name] ?? 0)
  }));
3.2 Orderbook Snapshot

Use Hyperliquid Info API endpoint:

const orderbook = await infoClient.l2Book({ asset: perpAssetIndex });
3.3 Frontend Hook Example
// useFuturesMarkets.ts
const { markets, loading } = useHyperliquidFuturesMarkets();
PHASE 4 - FUTURES ORDERS & POSITIONS
4.1 Place Futures Orders

Hyperliquid trading uses an exchange endpoint with signed actions:

await futuresClient.order({
  orders: [{
    a: perpAssetIndex,
    b: true,        // Buy (false for sell)
    p: '55000',     // Price
    s: '0.01',      // Size
    r: false,       // Reduce-only
    t: { limit: { tif: "Gtc" } }
  }],
  grouping: 'na'
});
4.2 Get Open Positions
const accountState = await futuresClient.getAccount(walletAddress);
const positions = accountState.perpsState?.positions || [];
4.3 Cancel Order
await futuresClient.cancel({
  orderIds: [orderId],
});
PHASE 5 - FUNDING FLOW (DEPOSITS & WITHDRAWALS)

Hyperliquid perpetuals settle in USDC on Arbitrum. Margin funds must be deposited into your Perps wallet.

5.1 Deposit Flow
User funds (USDT/USDC anywhere) →
Treasury detect → Convert to Arb USDC →
Disburse to user Privy wallet →
Send to Hyperliquid Bridge2 contract →
Funds credited to Perps account

Each step can be automated by:

Admin backend watcher

Disbursement service

Internal Privy transfer + sponsor gas automatically executed.

5.2 Withdrawal

Withdraw USDC back to the user’s external wallet via Privy send endpoint.

PHASE 6 - FRONTEND COMPONENTS

Components should mirror your spot architecture but with positions & futures controls:

src/app/(dashboard)/futures/
├── futures-page.tsx
├── FuturesMarketList.tsx
├── FuturesOrderBook.tsx
├── FuturesOrderForm.tsx
├── FuturesPositions.tsx
├── FuturesOrdersHistory.tsx
UI Tabs

Markets

Chart

Orderbook

Positions

Orders

PHASE 7 - ORDER AUTOMATION & MATCHING

Implement server logic for:

Webhook triggers on order fills.

Matching automation to sync order status.

PnL tracking after fills and funding payments.

Use tools like:

Privy policies & signers (policies-and-offline-actions) for advanced auth.

Subaccounts to isolate strategies per user while keeping fee tiers consolidated.

PHASE 8 - SECURITY & MONITORING
Security

Validate order parameters server‑side.

Enforce position limits per user.

Only sign transactions after permission checks.

Monitoring

Track:

Order fills & rejects

Liquidations

Funding rate payments

Account balance changes

API SUMMARY
Privy Backend Endpoints
GET /api/privy/get-wallet
POST /api/privy/setup-futures-wallet
POST /api/privy/sign
POST /api/privy/send
GET /api/hyperliquid/futures/markets
GET /api/hyperliquid/futures/orderbook
GET /api/hyperliquid/futures/balance
POST /api/hyperliquid/futures/order
POST /api/hyperliquid/futures/cancel
GLOSSARY

Perpetuals: Futures contracts without expiry.

Asset Index: Numeric identifier for a market returned by Info API.

Sponsor Gas: Privy pays Arbitrum gas so users don’t need ETH.

Builder code: Revenue share mechanism on Hyperliquid orders.