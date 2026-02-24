# Spot Trading Complete Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ MarketTicker │  │  LiveChart   │  │TradingPanel  │        │
│  │              │  │              │  │              │        │
│  │ CoinGecko    │  │ WebSocket    │  │ Quote/Trade  │        │
│  │ Real Prices  │  │ Updates      │  │ Execution    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │OrderHistory  │  │BalanceDisplay│                          │
│  │              │  │              │                          │
│  │ Trade List   │  │ Avail/Locked │                          │
│  └──────────────┘  └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                         │
│                        (Proxy Layer)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST   /api/quote              → Get swap quote               │
│  POST   /api/execute-trade      → Execute DEX trade            │
│  GET    /api/trades/:userId     → Get trade history            │
│  GET    /api/users/:userId/balances → Get balances             │
│                                                                 │
│  Features:                                                      │
│  • Input validation                                             │
│  • Error handling                                               │
│  • Request logging                                              │
│  • Future: Auth, rate limiting, caching                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND TRADING SERVICE                      │
│              https://trading.watchup.site                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trade Execution Flow:                                          │
│  1. Validate balance                                            │
│  2. Lock funds (available → locked)                             │
│  3. Deduct platform fee (0.3%)                                  │
│  4. Decrypt private key (in-memory only)                        │
│  5. Fetch 1inch swap calldata                                   │
│  6. Sign & broadcast transaction                                │
│  7. Wait for confirmation                                       │
│  8. Update ledger (unlock + credit output)                      │
│  9. Record trade (completed/failed)                             │
│                                                                 │
│  On failure: Funds automatically unlocked                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │   1inch DEX  │  → Best route aggregation                    │
│  │  Aggregator  │  → Multiple DEX sources                      │
│  └──────────────┘  → Optimal pricing                           │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  Ethereum    │  → On-chain execution                        │
│  │  Network     │  → Transaction confirmation                  │
│  └──────────────┘  → Gas payment                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. Get Quote Flow
```
User Input (TradingPanel)
  ↓
  Amount: 1000 USDT
  Pair: BTC-USDT
  Slippage: 0.5%
  ↓
POST /api/quote
  ↓
Next.js validates & forwards
  ↓
Backend calculates via 1inch
  ↓
Response:
  - Expected: 0.0234 BTC
  - Price Impact: 0.12%
  - Fee: 3 USDT
  - Gas: $2.50
  ↓
Display in TradingPanel
```

### 2. Execute Trade Flow
```
User clicks "Buy BTC"
  ↓
POST /api/execute-trade
  ↓
Next.js validates & forwards
  ↓
Backend:
  1. Lock 1000 USDT
  2. Deduct 3 USDT fee
  3. Get 1inch calldata
  4. Sign transaction
  5. Broadcast to Ethereum
  6. Wait for confirmation
  7. Credit 0.0234 BTC
  8. Unlock remaining USDT
  ↓
Response: { txHash: "0x..." }
  ↓
UI Updates:
  - Show success message
  - Refresh balances
  - Add to order history
```

### 3. View History Flow
```
Component mounts (OrderHistory)
  ↓
GET /api/trades/:userId
  ↓
Next.js forwards request
  ↓
Backend queries database
  ↓
Response: Array of trades
  ↓
Display in table with:
  - Timestamp
  - Pair
  - Side (Buy/Sell)
  - Amounts
  - Status
  - Tx link
```

### 4. Check Balances Flow
```
Component mounts (BalanceDisplay)
  ↓
GET /api/users/:userId/balances
  ↓
Next.js forwards request
  ↓
Backend queries ledger
  ↓
Response: Token balances
  ↓
Display for each token:
  - Available (green)
  - Locked (yellow)
  - Total
```

## Component Responsibilities

### Frontend Components
| Component | Responsibility |
|-----------|---------------|
| MarketTicker | Display real-time prices from CoinGecko |
| LiveChart | Show candlestick chart with WebSocket updates |
| TradingPanel | Handle quote requests and trade execution |
| OrderHistory | Display past trades with status |
| BalanceDisplay | Show available/locked balances |

### API Routes
| Route | Responsibility |
|-------|---------------|
| /api/quote | Proxy quote requests to backend |
| /api/execute-trade | Proxy trade execution to backend |
| /api/trades/:userId | Proxy trade history requests |
| /api/users/:userId/balances | Proxy balance requests |

### Backend Service
| Function | Responsibility |
|----------|---------------|
| Quote Engine | Calculate swap quotes via 1inch |
| Trade Executor | Sign and broadcast transactions |
| Ledger Manager | Track available/locked balances |
| History Recorder | Store completed/failed trades |

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  Frontend:                              │
│  • No private keys                      │
│  • Input validation                     │
│  • HTTPS only                           │
│                                         │
│  API Routes:                            │
│  • Request validation                   │
│  • Error sanitization                   │
│  • Rate limiting (future)               │
│  • Authentication (future)              │
│                                         │
│  Backend:                               │
│  • Private key encryption               │
│  • In-memory decryption only            │
│  • Balance locking                      │
│  • Transaction signing                  │
│  • Automatic unlock on failure          │
│                                         │
│  Blockchain:                            │
│  • Slippage protection                  │
│  • Gas estimation                       │
│  • Transaction confirmation             │
│                                         │
└─────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────┐
│         Component State                 │
├─────────────────────────────────────────┤
│                                         │
│  TradingPanel:                          │
│  • side (buy/sell)                      │
│  • amount                               │
│  • slippage                             │
│  • quote (QuoteResponse | null)         │
│  • loadingQuote (boolean)               │
│  • executing (boolean)                  │
│  • error (string | null)                │
│  • success (string | null)              │
│                                         │
│  OrderHistory:                          │
│  • trades (Trade[])                     │
│  • loading (boolean)                    │
│  • error (string | null)                │
│                                         │
│  BalanceDisplay:                        │
│  • balances (Balance[])                 │
│  • loading (boolean)                    │
│  • error (string | null)                │
│                                         │
└─────────────────────────────────────────┘
```

## Error Handling Strategy

```
┌─────────────────────────────────────────┐
│         Error Flow                      │
├─────────────────────────────────────────┤
│                                         │
│  Frontend Validation:                   │
│  • Empty amount → "Enter valid amount"  │
│  • Invalid slippage → "Invalid %"       │
│                                         │
│  API Route Errors:                      │
│  • 400 → Missing fields                 │
│  • 401 → Unauthorized                   │
│  • 500 → Internal error                 │
│                                         │
│  Backend Errors:                        │
│  • Insufficient balance                 │
│  • Trade execution failed               │
│  • 1inch unavailable                    │
│                                         │
│  Network Errors:                        │
│  • Connection timeout                   │
│  • Service unavailable                  │
│                                         │
│  All errors displayed in UI with:       │
│  • Clear message                        │
│  • Red error box                        │
│  • Retry option                         │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Optimizations

1. **Debounced Quote Requests**: Prevent excessive API calls
2. **Cached Prices**: Reduce CoinGecko API usage
3. **Lazy Loading**: Paginate trade history
4. **WebSocket**: Real-time chart updates
5. **Optimistic Updates**: Show pending state immediately
6. **Request Batching**: Combine multiple requests (future)

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Backend URL set correctly
- [ ] API routes tested
- [ ] Error handling verified
- [ ] Loading states working
- [ ] Mobile responsive
- [ ] Dark mode tested
- [ ] WebSocket connection stable
- [ ] Transaction links correct
- [ ] Security headers configured
- [ ] Rate limiting enabled (future)
- [ ] Monitoring setup (future)

## Monitoring & Logging

### What to Monitor
- API response times
- Error rates per endpoint
- Trade success/failure rates
- User activity patterns
- Backend availability

### What to Log
- All API requests (userId, endpoint, timestamp)
- All errors (with stack traces)
- Trade executions (userId, pair, amount, status)
- Performance metrics (response times)

## Future Enhancements

1. **Advanced Orders**: Limit orders, stop-loss orders
2. **Multi-chain**: Support Solana, BSC, Polygon
3. **Analytics**: P&L tracking, portfolio analytics
4. **Notifications**: Trade alerts, price alerts
5. **Social**: Copy trading, leaderboards
6. **Advanced Charts**: Indicators, drawing tools
7. **API Keys**: Allow programmatic trading
8. **Webhooks**: Real-time trade notifications
