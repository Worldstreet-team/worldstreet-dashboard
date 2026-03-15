# Spot Deposit Architecture Plan

## Comprehensive Analysis: USDT → Arb USDC → Hyperliquid Spot Wallet

---

## 1. Current Flow (Problem)

The existing spot deposit journey requires **4 manual steps**:

1. **Fund Ethereum wallet** — User acquires ETH + USDT on Ethereum mainnet
2. **Swap & Bridge** — User swaps USDT → USDC, then bridges from Ethereum → Arbitrum
3. **Internal Transfer** — Transfer Arb USDC from user's trading wallet to Hyperliquid via Bridge2
4. **Trade** — Funds appear in HL Perps wallet (which the spot page reads from)

**Core problems:**
- Too many manual steps for the user
- Token mismatch (USDT in, but HL only accepts native USDC on Arbitrum)
- Chain mismatch (user may fund on Ethereum or Solana, but HL bridge is on Arbitrum)
- Wallet mismatch (HL credits the *sender* address, not a recipient)
- No automation — every step requires user action

---

## 2. Hyperliquid Bridge2 Mechanics (Confirmed via Docs)

| Property | Value |
|---|---|
| **Contract** | `0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7` |
| **Chain** | Arbitrum One only |
| **Token** | Native USDC (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`) only |
| **Minimum** | 5 USDC (below = **lost forever**) |
| **Speed** | Credited in < 1 minute |
| **Credit rule** | Credits the **sender's** address on Hyperliquid |
| **Destination** | Deposits land in **Perps wallet** by default |

**Critical implication:** The treasury wallet CANNOT send directly to the HL bridge on behalf of the user — the funds would be credited to the treasury's HL account, not the user's. This means a **two-hop** flow is required:

```
Treasury Wallet → User's Trading Wallet → HL Bridge2
```

---

## 3. Existing Infrastructure Analysis

### 3.1 Admin Backend (`worldstreet-admin`)

| Component | File | Status | Capability |
|---|---|---|---|
| **On-chain Polling** | `depositWatcherService.js` | ✅ Built | Polls Ethereum (eth_getLogs) and Solana (getSignaturesForAddress) every 30s via node-cron |
| **Auto-detect & Match** | `depositWatcherService.js` → `matchAndDisburse()` | ✅ Built | Atomically matches on-chain tx to pending DepositRequest, triggers auto-disburse |
| **Disbursement** | `disbursementService.js` | ✅ Built | Sends ERC-20 tokens via Privy `sendTransaction` (EVM) or `signAndSendTransaction` (Solana) |
| **Treasury Wallets** | `walletService.js` | ✅ Built | Privy server-managed wallets with `receive` and `disburse` purposes per chain |
| **Deposit CRUD** | `depositController.js` | ✅ Built | API-key-authenticated endpoints for creating, verifying, approving deposits |
| **Token Registry** | `constants.js` | ✅ Built | USDC and USDT addresses on Ethereum, Arbitrum, Solana (all 6 decimals) |
| **Cron Jobs** | `startJobs.js` | ✅ Built | Controlled by `AUTO_DISBURSE_ENABLED` env flag + `POLL_INTERVAL_SECONDS` (default 30s) |

### 3.2 Dashboard (`worldstreet-dashboard`)

| Component | File | Status | Capability |
|---|---|---|---|
| **HL Bridge Transfer** | `/api/privy/transfer/route.ts` | ✅ Built | Sends Arb USDC from trading wallet to HL Bridge2 with `sponsor: true` (gas-free) |
| **HL Balance** | `useHyperliquidBalance.ts` | ✅ Built | Fetches Perps account value via `/api/hyperliquid/balance` |
| **Spot Balances** | `useSpotBalances.ts` | ✅ Built | Uses `accountValue` (Perps total equity) as `quoteBalance` — bridge deposits immediately visible |
| **Trading Wallet** | `walletContext.tsx` + `UserWallet` model | ✅ Built | Privy server-managed wallet on Arbitrum with `walletId` + `address` |
| **Gas Sponsorship** | Privy `sponsor: true` | ✅ Confirmed | Users do NOT need ETH on Arbitrum for bridge transfers |

### 3.3 Key Confirmation: Spot Reads from Perps

The `useSpotBalances` hook reads `accountValue` from the Perps wallet. This means:
- HL bridge deposits (which go to Perps by default) are **immediately usable** for spot trading
- **No `usdClassTransfer` step is needed** (no Perps → Spot transfer required)
- The pipeline ends at the bridge deposit — no additional HL API calls necessary

---

## 4. Critical Issue: Matching Problem

### The Bug

In `depositWatcherService.js`, `matchAndDisburse()` compares:

```javascript
// Current matching logic
candidate.userWalletAddress === fromAddress  // on-chain sender
```

**Problem:** In the proposed flow:
- `userWalletAddress` = user's **Arbitrum trading wallet** (where disburse should go)
- `fromAddress` = user's **Ethereum or Solana wallet** (where they sent USDT from)

These are on **different chains** and will **never match**.

### Proposed Fix: Approach A (Recommended)

Add a `depositFromAddress` field to the `DepositRequest` model:

```javascript
// New field in DepositRequest schema
depositFromAddress: {
  type: String,  // The address user will send from (e.g., their MetaMask ETH address)
  required: true
}
```

Updated matching logic:
```javascript
// Fixed matching
candidate.depositFromAddress === fromAddress  // match against the SENDING address
// candidate.userWalletAddress remains the DESTINATION for disbursement (Arb trading wallet)
```

### Alternative: Approach B

Match by amount + treasury wallet only (no address comparison). Simpler but less secure — concurrent deposits of the same amount would be ambiguous.

---

## 5. Proposed Pipeline (4 Stages, Fully Automated)

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

### Stage Detail

| Stage | Actor | Action | Where |
|---|---|---|---|
| ① Initiate | User (dashboard) | Clicks deposit, picks network + amount | Dashboard frontend |
| ② Send | User (external wallet) | Sends USDT to treasury address | On-chain (ETH/SOL) |
| ③ Detect | Admin backend (cron) | `pollEthereum()` or `pollSolana()` finds the USDT transfer | Admin backend |
| ④ Match | Admin backend | `matchAndDisburse()` matches tx to pending DepositRequest | Admin backend |
| ⑤ Disburse | Admin backend | Sends Arb USDC from `disburse` wallet to `userWalletAddress` (trading wallet) | Admin backend → Arbitrum |
| ⑥ Bridge | Dashboard API or webhook | Calls `/api/privy/transfer` logic: trading wallet → HL Bridge2 (`sponsor: true`) | Dashboard API |
| ⑦ Credit | Hyperliquid | USDC credited to trading wallet's HL account | Hyperliquid L1 |
| ⑧ Display | Dashboard | `useSpotBalances` polls and shows updated `accountValue` | Dashboard frontend |

---

## 6. What Needs To Be Built

### Item 1: Admin Model — Add `depositFromAddress`

**File:** `src/models/DepositRequest.js` (admin backend)

Add `depositFromAddress` field to schema. Update `matchAndDisburse()` in `depositWatcherService.js` to compare against `depositFromAddress` instead of `userWalletAddress`.

### Item 2: Admin — Post-Disbursement Webhook/Callback

**File:** `src/services/disbursementService.js` (admin backend)

After successful disbursement, notify the dashboard that Arb USDC has arrived in the trading wallet. Options:
- **Option A:** HTTP webhook POST to dashboard API
- **Option B:** Dashboard polls admin `/api/deposits/:id/status`
- **Option C:** Admin backend directly triggers HL bridge (requires dashboard Privy credentials)

### Item 3: Dashboard API — `POST /api/spot/deposit/initiate`

**New route** in dashboard.

Responsibilities:
- Authenticate user via Clerk
- Look up user's trading wallet address (Arbitrum)
- Call admin backend `POST /api/deposits` with: `userId`, `userWalletAddress` (Arb trading wallet), `depositFromAddress` (user's external wallet), `chain` (arbitrum), `requestedToken` (USDC), `requestedAmount`, `depositChain` (ethereum/solana), `depositToken` (USDT)
- Return the treasury address for user to send USDT to

### Item 4: Dashboard API — HL Bridge Trigger

**New route or webhook handler** in dashboard.

After disbursement notification:
1. Verify Arb USDC arrived in trading wallet (balance check)
2. Call existing HL bridge logic (`/api/privy/transfer` internals) with `sponsor: true`
3. Update deposit status to "bridging" → "completed"

### Item 5: Shared HL Bridge Utility

**Refactor** existing `/api/privy/transfer/route.ts`.

Extract the core bridge logic (ERC-20 transfer to `0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7`) into a shared utility function that both the existing transfer route and the new auto-bridge handler can call.

### Item 6: Dashboard API — `GET /api/spot/deposit/status`

**New route** in dashboard.

Polls admin backend for deposit status. Returns current stage for real-time UI updates.

### Item 7: Dashboard Frontend — Deposit UI

**New component** for the spot trading page.

- Network picker (Ethereum / Solana)
- Amount input (minimum 5 USDC equivalent)
- "Generate Address" button → displays treasury address with copy button
- QR code for mobile convenience
- Clear instructions: "Send exactly X USDT to this address"

### Item 8: Dashboard Frontend — Status Tracker

**New component** for real-time deposit tracking.

States:
```
Initiated → Waiting for USDT → Detected → Disbursing Arb USDC → Bridging to HL → Ready to Trade
```

Poll every 5-10 seconds. Show estimated time remaining per stage. Auto-refresh spot balance on completion.

---

## 7. Token Flow Diagram

```
User's External Wallet (ETH/SOL)
    │
    │  USDT (Ethereum or Solana)
    ▼
Treasury Receive Wallet (ETH/SOL)
    │
    │  [Admin backend detects + matches]
    │
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

**Token conversion note:** The treasury implicitly handles the USDT → USDC conversion. The receive wallet accumulates USDT, while the disburse wallet is pre-funded with Arb USDC. Treasury operators are responsible for periodically converting/rebalancing.

---

## 8. Gas & Cost Analysis

| Step | Who Pays Gas | Chain | Estimated Cost |
|---|---|---|---|
| User sends USDT | User | Ethereum (~$2-5) or Solana (~$0.001) | User's responsibility |
| Treasury disburses Arb USDC | Treasury (Privy `authorization_private_keys`) | Arbitrum | ~$0.01-0.05 |
| Trading wallet → HL Bridge | Privy sponsor (`sponsor: true`) | Arbitrum | ~$0.01-0.05 (free for user) |

**Total user cost:** Only the initial USDT send gas fee. Everything else is sponsored.

---

## 9. Security Considerations

1. **Minimum deposit enforcement:** Must enforce ≥ 5 USDC equivalent (HL minimum). Below 5 USDC = funds lost forever on HL bridge.
2. **Deposit expiry:** Current 24h expiry on DepositRequest is good. Unmatched deposits should be flagged for manual review.
3. **Amount validation:** If matching by amount, concurrent same-amount deposits from different users could collide. `depositFromAddress` matching (Approach A) prevents this.
4. **API key authentication:** Dashboard → Admin backend calls use `x-api-key` header. Keep this secret.
5. **Rate limiting:** Add rate limits to deposit initiation endpoint to prevent abuse.
6. **Balance verification:** Before triggering HL bridge, verify the trading wallet actually received the USDC (don't trust the webhook alone).

---

## 10. Remaining Questions Before Implementation

### Question 1: Matching Approach
Do you prefer **Approach A** (add `depositFromAddress` to the admin model for precise matching) or **Approach B** (match by amount + treasury wallet only)?

**Recommendation:** Approach A — more secure, prevents ambiguity with concurrent deposits.

### Question 2: HL Bridge Trigger Location
Where should Stage ⑥ (HL bridge transfer) live?

- **Option A:** Admin backend triggers it directly (requires sharing dashboard Privy credentials)
- **Option B:** Dashboard webhook handler (admin POSTs to dashboard after disbursement)
- **Option C:** Dashboard polling (dashboard polls admin for status, triggers bridge when status = "completed")

**Recommendation:** Option C (polling) — simplest to implement, no webhook infrastructure needed, works with existing patterns.

### Question 3: Admin Backend Webhook Capability
Does the admin backend currently have any webhook/event dispatch mechanism, or would this need to be built from scratch?

### Question 4: Amount Tolerance
Should deposit matching allow a small tolerance (e.g., ±0.01 USDC for rounding/fee differences), or require an exact match?

---

## 11. Implementation Priority

| Priority | Item | Effort | Dependency |
|---|---|---|---|
| 🔴 P0 | Item 1: Admin model + matching fix | Small | None |
| 🔴 P0 | Item 3: Dashboard deposit initiation API | Medium | Item 1 |
| 🔴 P0 | Item 5: Extract HL bridge utility | Small | None |
| 🟠 P1 | Item 4: HL bridge auto-trigger | Medium | Items 1, 5 |
| 🟠 P1 | Item 7: Deposit UI component | Medium | Item 3 |
| 🟡 P2 | Item 6: Status polling API | Small | Item 3 |
| 🟡 P2 | Item 8: Status tracker component | Medium | Items 6, 7 |
| 🟡 P2 | Item 2: Admin post-disburse notification | Small | Answer to Q2 |

---

*Generated from codebase analysis of `worldstreet-dashboard` and `worldstreet-admin`. No code edits were made — this is a READ-ONLY architecture plan.*
