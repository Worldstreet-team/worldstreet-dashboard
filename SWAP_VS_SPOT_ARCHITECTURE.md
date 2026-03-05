# Swap vs Spot Trading Architecture

## Overview

Your application has **two distinct trading systems** that serve different purposes:

1. **Swap System** (`/swap` page) - Cross-chain token swaps
2. **Spot Trading System** (`/spot` page) - Same-chain trading pairs

Both systems use **Li.Fi** as the underlying execution engine, but they have different user interfaces, workflows, and use cases.

---

## 1. Swap System (`/swap`)

### Purpose
Cross-chain token swapping between Ethereum and Solana networks.

### Location
- **Page**: `src/app/(DashboardLayout)/swap/page.tsx`
- **Context**: `src/app/context/swapContext.tsx`
- **Components**: `src/components/swap/`

### Key Features
- ✅ Cross-chain swaps (ETH ↔ SOL)
- ✅ Same-chain swaps (ETH → USDT on Ethereum)
- ✅ Token-to-token swaps
- ✅ Network selection (Ethereum/Solana)
- ✅ Custom token support
- ✅ Swap history tracking
- ✅ Real-time status monitoring

### User Flow
```
1. Select FROM chain (Ethereum/Solana)
2. Select FROM token (ETH, SOL, USDT, etc.)
3. Select TO chain (Ethereum/Solana)
4. Select TO token
5. Enter amount
6. Get quote from Li.Fi
7. Review quote details
8. Enter PIN
9. Execute swap (client-side signing)
10. Track transaction status
```

### Technical Architecture

#### SwapContext (`swapContext.tsx`)
The swap context is the **core engine** for all swap operations:

```typescript
// Main functions:
- fetchTokens(chain)        // Get available tokens for a chain
- getQuote(params)          // Get swap quote from Li.Fi
- executeSwap(quote, pin)   // Execute swap with client-side signing
- pollSwapStatus(txHash)    // Track swap progress
- saveSwapToHistory(swap)   // Save to MongoDB
```

#### Client-Side Signing Flow
```typescript
executeSwap(quote, pin) {
  1. Decrypt private key using PIN
  2. For Solana:
     - Create ATA if needed
     - Deserialize transaction from Li.Fi
     - Sign with Keypair
     - Send to Solana RPC
     - Confirm on-chain
  3. For Ethereum:
     - Approve ERC20 if needed
     - Sign transaction with ethers.js
     - Send to Ethereum RPC
     - Wait for confirmation
  4. Return txHash
}
```

#### Key Components
- **SwapInterface.tsx** - Main swap UI with token selection
- **SwapQuoteCard.tsx** - Display quote details
- **SwapStatusTracker.tsx** - Real-time transaction monitoring
- **PinConfirmModal.tsx** - PIN entry for signing
- **TokenSelectModal.tsx** - Token picker with search

---

## 2. Spot Trading System (`/spot`)

### Purpose
Trading pairs (BTC-USDT, ETH-USDT, SOL-USDT) on the same blockchain network.

### Location
- **Page**: `src/app/(DashboardLayout)/spot/binance-page.tsx`
- **Hook**: `src/hooks/useSpotSwap.ts`
- **Components**: `src/components/spot/`

### Key Features
- ✅ Trading pairs (BTC-USDT, ETH-USDT, SOL-USDT)
- ✅ Buy/Sell interface
- ✅ Market orders
- ✅ Real-time price charts
- ✅ Order book display
- ✅ Market trades feed
- ✅ Position tracking
- ✅ Mobile-optimized UI

### User Flow
```
1. Select trading pair (BTC-USDT, ETH-USDT, SOL-USDT)
2. Choose Buy or Sell
3. Enter amount (in USDT for buy, in token for sell)
4. Get quote
5. Review quote details
6. Enter PIN
7. Execute trade
8. Track position
```

### Technical Architecture

#### useSpotSwap Hook
The spot trading hook **wraps the swapContext** for trading-specific logic:

```typescript
// Main functions:
- fetchQuote(params)           // Get quote via /api/quote
- executeSpotSwap(params, pin) // Execute via swapContext.executeSwap
```

#### How Spot Uses SwapContext

```typescript
// useSpotSwap.ts
const { executeSwap: contextExecuteSwap } = useSwap();

executeSpotSwap(params, pin) {
  1. Fetch quote from backend (/api/quote)
  2. Map spot quote to SwapQuote format
  3. Call contextExecuteSwap(mappedQuote, pin)
     ↓
     This uses the SAME client-side signing flow
     as the swap system!
  4. Save trade to history (/api/spot/trades)
  5. Return txHash
}
```

#### Key Components
- **BinanceOrderForm.tsx** - Desktop trading form
- **MobileTradingModal.tsx** - Mobile trading modal
- **SpotSwapConfirmModal.tsx** - Confirmation with PIN
- **SpotQuoteDetails.tsx** - Quote display
- **BinanceOrderBook.tsx** - Order book visualization
- **LiveChart.tsx** - TradingView chart integration

---

## Architecture Comparison

| Feature | Swap System | Spot Trading System |
|---------|-------------|---------------------|
| **Purpose** | Cross-chain swaps | Same-chain trading pairs |
| **UI Style** | Token selector interface | Trading terminal (Binance-style) |
| **Chains** | Ethereum ↔ Solana | Single chain per pair |
| **Token Selection** | Any token on chain | Fixed pairs (BTC-USDT, etc.) |
| **Execution** | Direct via swapContext | Via useSpotSwap → swapContext |
| **Quote Source** | Li.Fi API | Backend → Li.Fi API |
| **Signing** | Client-side (swapContext) | Client-side (swapContext) |
| **History** | Swap history | Trade history + positions |
| **Mobile UI** | Standard form | Trading modal |

---

## Shared Infrastructure

Both systems share the following:

### 1. SwapContext (`swapContext.tsx`)
- **Used by**: Both swap and spot
- **Purpose**: Core execution engine
- **Functions**: Quote fetching, transaction signing, status tracking

### 2. Li.Fi Integration
- **Used by**: Both systems
- **Purpose**: DEX aggregation and routing
- **API**: `https://li.quest/v1`

### 3. Client-Side Signing
- **Used by**: Both systems
- **Purpose**: Secure transaction signing with PIN
- **Libraries**: 
  - Solana: `@solana/web3.js`, `@solana/spl-token`
  - Ethereum: `ethers.js`

### 4. Wallet System
- **Used by**: Both systems
- **Purpose**: Encrypted key storage
- **Context**: `walletContext.tsx`

---

## Data Flow Diagrams

### Swap System Flow
```
User (SwapInterface)
  ↓
swapContext.getQuote()
  ↓
Li.Fi API (quote)
  ↓
swapContext.executeSwap(quote, pin)
  ↓
Decrypt private key
  ↓
Sign transaction (Solana/Ethereum)
  ↓
Send to blockchain RPC
  ↓
Return txHash
  ↓
swapContext.pollSwapStatus()
  ↓
Li.Fi status API
```

### Spot Trading Flow
```
User (BinanceOrderForm/MobileTradingModal)
  ↓
useSpotSwap.fetchQuote()
  ↓
Backend /api/quote
  ↓
Li.Fi API (quote)
  ↓
useSpotSwap.executeSpotSwap(params, pin)
  ↓
Map to SwapQuote format
  ↓
swapContext.executeSwap(mappedQuote, pin)
  ↓
[Same signing flow as swap system]
  ↓
Return txHash
  ↓
Save to /api/spot/trades
```

---

## Key Differences Explained

### 1. Quote Fetching

**Swap System:**
```typescript
// Direct Li.Fi call from swapContext
const quote = await fetch(`${LIFI_API}/quote?${params}`);
```

**Spot Trading:**
```typescript
// Backend proxy call
const quote = await fetch('/api/quote', {
  method: 'POST',
  body: JSON.stringify(params)
});
// Backend then calls Li.Fi
```

### 2. Token Selection

**Swap System:**
- User selects any token from Li.Fi's token list
- Supports 100+ tokens per chain
- Dynamic token loading

**Spot Trading:**
- Fixed trading pairs (BTC-USDT, ETH-USDT, SOL-USDT)
- Hardcoded token addresses
- Pair-based selection

### 3. UI/UX

**Swap System:**
- Clean, simple swap interface
- Focus on token selection
- Network switching
- Swap history sidebar

**Spot Trading:**
- Trading terminal layout
- Order book, charts, market trades
- Buy/Sell tabs
- Position tracking
- Mobile trading modal

### 4. History Tracking

**Swap System:**
```typescript
// Saves to swap history
saveSwapToHistory({
  txHash,
  fromChain,
  toChain,
  fromToken,
  toToken,
  status
});
```

**Spot Trading:**
```typescript
// Saves to trade history + positions
fetch('/api/spot/trades', {
  method: 'POST',
  body: JSON.stringify({
    pair,
    side,
    txHash,
    status
  })
});
```

---

## Why Two Systems?

### Swap System
- **Use Case**: "I want to move my ETH to Solana"
- **User Type**: Cross-chain users, portfolio rebalancing
- **Focus**: Network bridging, token conversion

### Spot Trading System
- **Use Case**: "I want to trade BTC/USDT"
- **User Type**: Active traders, price speculation
- **Focus**: Trading pairs, market analysis, positions

---

## Important Notes

### 1. SwapContext is NOT Modified
As you requested, `swapContext.tsx` remains unchanged. It serves as the **core execution engine** for both systems.

### 2. Spot Trading Wraps SwapContext
The `useSpotSwap` hook is a **wrapper** that:
- Translates trading pairs to token addresses
- Handles buy/sell logic
- Maps spot quotes to swap quotes
- Delegates execution to swapContext

### 3. Both Use Client-Side Signing
Neither system sends private keys to the backend. All signing happens in the browser using the PIN-encrypted keys.

### 4. Li.Fi Powers Both
Both systems use Li.Fi for:
- Best route finding
- DEX aggregation
- Transaction building
- Cross-chain bridging

---

## File Structure

```
src/
├── app/
│   ├── context/
│   │   └── swapContext.tsx          # Core swap engine (SHARED)
│   └── (DashboardLayout)/
│       ├── swap/
│       │   └── page.tsx             # Swap page
│       └── spot/
│           └── binance-page.tsx     # Spot trading page
├── components/
│   ├── swap/                        # Swap UI components
│   │   ├── SwapInterface.tsx
│   │   ├── SwapQuoteCard.tsx
│   │   └── SwapStatusTracker.tsx
│   └── spot/                        # Spot trading UI components
│       ├── BinanceOrderForm.tsx
│       ├── MobileTradingModal.tsx
│       ├── SpotSwapConfirmModal.tsx
│       └── SpotQuoteDetails.tsx
└── hooks/
    └── useSpotSwap.ts               # Spot trading hook (wraps swapContext)
```

---

## Summary

- **Swap System** = Cross-chain token swaps with flexible token selection
- **Spot Trading System** = Same-chain trading pairs with trading terminal UI
- **SwapContext** = Shared execution engine for both systems
- **useSpotSwap** = Spot-specific wrapper around swapContext
- **Both use client-side signing** with PIN-encrypted keys
- **Both use Li.Fi** for routing and execution

The separation allows each system to have its own optimized UX while sharing the robust execution infrastructure.
