# Spot Trading Flow — Full Investigation & Fix Plan

**Date:** March 15, 2026  
**Status:** Investigation complete, ready for implementation  
**Repos:** `worldstreet-dashboard` (Next.js) + `worldstreet-admin` (Express backend)

---

## 1. THE INTENDED FLOW (User's Words)

> "The user gets USDC Arb to trade by sending USDT Solana or USDT Ethereum. They are basically swapping their USDT Sol or Ethereum for USDC Arb, and it is the treasury that delivers the Arb USDC for them."

> "For withdrawal: withdraw from the spot wallet to the recommended wallet that they hold." (Option B — USDC stays in Privy Arb wallet, no conversion back to USDT)

---

## 2. DEPOSIT PIPELINE (End-to-End)

### Intended Flow

```
User's Privy Sol/Eth wallet (USDT)
  → [server-side Privy send] → Treasury receive wallet (USDT)
  → [admin watcher detects] → auto-verify
  → [admin disburse] → USDC Arb → User's Privy trading wallet (Arb)
  → [dashboard bridge.ts] → HL Bridge2 (USDC lands in Perps)
  → [dashboard usdTransfer.ts] → usdClassTransfer(toPerp:false) → Spot wallet
  → Ready to trade
```

### Current Code Reality

| Step | File (Dashboard) | File (Admin) | Status |
|------|-------------------|--------------|--------|
| 1. User clicks Deposit | `SpotDepositModal.tsx` | — | **EXISTS but wrong** — sends Privy wallet address as `depositFromAddress`, but user isn't sending from that wallet manually |
| 2. Dashboard calls admin to register deposit | `api/spot/deposit/initiate/route.ts` | `controllers/depositController.js → createDeposit()` | **EXISTS but field mismatch** |
| 3. User sends USDT to treasury | — | — | **MISSING** — no server-side Privy send. UI shows treasury address for manual send, but Privy wallets are server-managed (user can't "manually" send from them) |
| 4. Watcher detects USDT on treasury | — | `services/depositWatcherService.js` | **EXISTS** — polls ETH + SOL, matches by `userWalletAddress` + amount |
| 5. Auto-disburse USDC Arb | — | `services/disbursementService.js` | **EXISTS** — sends `requestedToken` on `chain` to `userWalletAddress` |
| 6. Dashboard detects disbursement | `api/spot/deposit/status/route.ts` | `GET /api/deposits/:id` | **EXISTS but broken** — GET route requires JWT auth, dashboard calls with API key format that won't work |
| 7. Bridge to HL | `api/spot/deposit/complete/route.ts` | — | **EXISTS but broken** — internal fetch lacks auth cookies |
| 8. usdClassTransfer | `lib/hyperliquid/usdTransfer.ts` | — | **EXISTS** |

### CRITICAL BUGS IN DEPOSIT FLOW

#### BUG D1: No server-side USDT send (THE MISSING STEP)
**Impact:** The entire deposit is broken at step 3.

The user's USDT is in their **Privy server-managed** Sol/Eth wallet. The current UI shows a treasury address and says "send USDT here" — but the user has no way to manually send from a Privy server wallet. They don't have MetaMask/Phantom holding these keys.

**Fix needed:** After initiating the deposit, the dashboard should **immediately execute a server-side Privy transfer** of USDT from the user's Privy Sol/Eth wallet → the treasury receive wallet. The send service exists in the admin backend (`sendService.js`), but the dashboard needs to do this itself (or call an admin endpoint to do it).

#### BUG D2: `depositFromAddress` not in admin backend model
**Impact:** Dashboard sends `depositFromAddress` to admin, but admin's `createDepositSchema` validation and `DepositRequest` model don't have that field. It gets silently ignored.

The admin watcher matches deposits by `candidate.userWalletAddress === fromAddress`. The dashboard sends `userWalletAddress: userWallet.tradingWallet.address` (an **Arbitrum** address), but the USDT transfer comes **from** a Solana or Ethereum address. These will never match.

**Fix needed:** The watcher should match by `depositFromAddress` (the source wallet on the deposit chain), NOT `userWalletAddress` (the Arb trading wallet). Both the admin model and the watcher need updating.

#### BUG D3: Admin `GET /api/deposits/:id` requires JWT, not API key
**Impact:** Dashboard status polling fails.

The admin route `GET /api/deposits/:id` is behind `authenticateJWT` (admin login session). The dashboard calls it with `x-api-key` header. This returns 401.

**Fix needed:** Either add an API-key-authenticated GET route, or have the dashboard poll its own local SpotDeposit model without calling admin (just wait for the watcher to trigger disbursement, then detect arrival of USDC in trading wallet on-chain).

#### BUG D4: Auto-complete internal fetch lacks auth
**Impact:** The status route's auto-trigger of `/api/spot/deposit/complete` uses an internal `fetch()` that doesn't carry Clerk cookies → always 401.

**Fix needed:** Instead of an internal HTTP fetch, call the complete logic directly as a function, or propagate the auth headers.

#### BUG D5: 5-second bridge delay too short
**Impact:** HL Bridge2 takes 30-60 seconds to credit. The `usdClassTransfer` will fail with "insufficient funds."

**Fix needed:** Decouple bridge and transfer into separate polling steps. After bridge tx confirms, poll HL balance until credit appears, then transfer.

#### BUG D6: Disbursement sends to wrong destination
**Impact:** The admin disburse sends `requestedToken` (USDC) to `userWalletAddress` on `chain` (arbitrum). But `userWalletAddress` is set to `userWallet.tradingWallet.address` — which is correct for getting USDC Arb to the trading wallet. However, the `chain` field is set to `arbitrum` (mapped from `ethereum`). The disburse wallet must be an Arbitrum disburse wallet. This **may work** if admin has created Arbitrum disburse wallets with USDC Arb balance.

**Verify:** Does the admin have active `purpose: "disburse"` wallets on `chain: "arbitrum"` with USDC balance?

---

## 3. WITHDRAWAL PIPELINE (Option B: Spot → Privy Arb Wallet)

### Intended Flow

```
HL Spot wallet (USDC)
  → usdClassTransfer(toPerp: true) → HL Perps
  → exchange.withdraw3() → Arb USDC back to trading wallet on Arbitrum
  → Done (USDC stays in Privy Arb wallet for user)
```

### Current Status: **NOTHING EXISTS**

No withdrawal routes, hooks, components, or SDK wrappers for HL withdrawal. Need to build:

1. `src/lib/hyperliquid/withdraw.ts` — wrapper around `exchange.withdraw3()`
2. `src/app/api/spot/withdraw/route.ts` — orchestrates Spot→Perps + HL withdrawal
3. `src/hooks/useSpotWithdraw.ts` — client-side hook
4. `src/components/spot/SpotWithdrawModal.tsx` — UI
5. Wire into `binance-page.tsx`

---

## 4. TRADING FLOW BUGS (Order Placement)

#### BUG T1: Mobile buy order wrong balance check
**File:** `MobileTradingModal.tsx`

For buy orders, checks `parseFloat(amount) > quoteBalance` — but `amount` is in base units (e.g., 0.5 BTC) while `quoteBalance` is in USDC. Should compare `total` (= amount × price) against `quoteBalance`.

#### BUG T2: Desktop order form uses `alert()` for success
**File:** `BinanceOrderForm.tsx`

Should use a proper modal/toast like MobileTradingModal does with `SpotOrderProcessingModal`.

#### BUG T3: `useSpotBalances` has no polling
**File:** `useSpotBalances.ts`

Balance only fetches on mount. Goes stale after trades.

#### BUG T4: `HyperliquidBalanceDisplay` shows Perps equity, not Spot
**File:** `HyperliquidBalanceDisplay.tsx`

Shows `crossMarginSummary.accountValue` (Perps). After depositing to Spot, this shows 0 if user has no Perps positions.

#### BUG T5: PositionsPanel is completely non-functional
**File:** `PositionsPanel.tsx`

Hardcoded empty arrays. No API calls to HL for open orders/positions.

#### BUG T6: BinanceBottomPanel — Open Orders tab is placeholder
**File:** `BinanceBottomPanel.tsx`

Shows "You have no open orders" always. Cancel All button has no handler.

---

## 5. SECURITY ISSUES

#### SEC1: `/api/withdraw/verify` — no authentication
Anyone who guesses a withdrawal ObjectId can trigger verification.

#### SEC2: `/api/hyperliquid/balance` — IDOR via userId param
Authenticated users can pass any userId to view other users' balances.

---

## 6. ADMIN BACKEND STATE

| Item | Status |
|------|--------|
| Admin running on port | 3006 |
| DASHBOARD_API_KEY | `dapikey` (matches dashboard .env) |
| Auto-disburse enabled | YES (`AUTO_DISBURSE_ENABLED=true`) |
| Poll interval | 3 seconds |
| ETH receive wallets | **Need to verify** — must exist in DB |
| SOL receive wallets | **Need to verify** — must exist in DB |
| Arb disburse wallets | **Need to verify** — must have USDC balance |
| Privy credentials | Set (same App ID as dashboard) |

### Admin API Routes Summary

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/deposits` | API Key | Create deposit request (from dashboard) |
| GET | `/api/deposits` | JWT | List deposits (admin) |
| GET | `/api/deposits/:id` | JWT | Get single deposit (admin) |
| PATCH | `/api/deposits/:id/verify` | JWT | Manually verify deposit |
| PATCH | `/api/deposits/:id/approve` | JWT | Approve + trigger disburse |
| PATCH | `/api/deposits/:id/reject` | JWT | Reject deposit |

---

## 7. FIX PLAN (Prioritized)

### Phase 1: Make Deposit Actually Work

1. **Add server-side USDT send** — After user clicks "Generate Deposit Address", the dashboard should immediately send USDT from the user's Privy Sol/Eth wallet to the treasury address. This replaces the "show address + wait for manual send" flow.

2. **Fix admin model for matching** — Add `depositFromAddress` to admin's `DepositRequest` schema and `createDepositSchema`. Update watcher's `matchAndDisburse` to match on `depositFromAddress` instead of `userWalletAddress`.

3. **Fix admin GET deposit route** — Add API-key-authenticated GET route so dashboard can poll deposit status.

4. **Fix auto-complete auth** — Replace internal HTTP fetch with direct function call to avoid auth propagation issue.

5. **Fix bridge timing** — Decouple bridge and transfer. Add polling for HL balance credit before attempting usdClassTransfer.

### Phase 2: Build Withdrawal

6. **Build `withdraw.ts`** — HL `exchange.withdraw3()` wrapper
7. **Build withdrawal API route** — Spot→Perps→Withdraw orchestration
8. **Build withdrawal UI** — Modal + hook

### Phase 3: Polish Trading UX

9. Fix mobile buy balance check
10. Fix balance display to show Spot balance
11. Add balance polling after trades
12. Fix open orders / positions panels (fetch from HL)

---

## 8. QUESTIONS STILL OPEN

**ALL ANSWERED** — No remaining questions. Ready to implement.

Key decisions confirmed:
- Server-side USDT send from Privy wallet (not manual)
- Withdrawal = Option B (USDC stays in Privy Arb wallet)
- Auto-disburse already enabled on admin
- Treasury delivers USDC Arb

---

## 9. KEY FILE REFERENCES

### Dashboard (worldstreet-dashboard)
| File | Purpose |
|------|---------|
| `src/components/spot/SpotDepositModal.tsx` | Deposit UI |
| `src/hooks/useSpotDeposit.ts` | Deposit client hook |
| `src/app/api/spot/deposit/initiate/route.ts` | Initiate deposit |
| `src/app/api/spot/deposit/status/route.ts` | Poll deposit status |
| `src/app/api/spot/deposit/complete/route.ts` | Bridge + transfer |
| `src/lib/hyperliquid/bridge.ts` | Bridge USDC to HL |
| `src/lib/hyperliquid/usdTransfer.ts` | Perps ↔ Spot transfer |
| `src/models/SpotDeposit.ts` | Deposit record |
| `src/app/context/walletContext.tsx` | Privy wallet addresses |
| `src/app/context/solanaContext.tsx` | Solana balances + send |
| `src/app/context/evmContext.tsx` | Ethereum balances + send |
| `src/components/spot/BinanceOrderForm.tsx` | Desktop order form |
| `src/components/spot/MobileTradingModal.tsx` | Mobile order form |
| `src/hooks/useSpotBalances.ts` | Spot balance hook |
| `src/app/api/hyperliquid/order/route.ts` | Order submission API |

### Admin Backend (worldstreet-admin)
| File | Purpose |
|------|---------|
| `src/controllers/depositController.js` | Deposit CRUD + approve/reject |
| `src/services/depositWatcherService.js` | Polls ETH + SOL for incoming USDT |
| `src/services/disbursementService.js` | Sends USDC Arb from treasury disburse wallet → user |
| `src/services/walletService.js` | Manages treasury wallets |
| `src/services/sendService.js` | Generic send (EVM + Solana) |
| `src/models/DepositRequest.js` | Deposit record (needs `depositFromAddress` field) |
| `src/utils/constants.js` | Chain configs, token addresses |
| `src/routes/depositRoutes.js` | Route definitions + auth |
| `src/jobs/startJobs.js` | Cron polling (every 3s) |
