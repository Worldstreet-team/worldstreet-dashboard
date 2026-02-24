# Quick Reference - Spot Trading

## 🚀 Quick Start

### Run Development Server
```bash
npm run dev
```

### Access Spot Trading
```
http://localhost:3000/spot
```

### Open DevTools
Press `F12` or `Cmd+Option+I` (Mac)

---

## 📡 API Endpoints

### Local Next.js Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/quote` | Get swap quote |
| POST | `/api/execute-trade` | Execute trade |
| GET | `/api/trades/:userId` | Get trade history |
| GET | `/api/users/:userId/balances` | Get balances |

### Backend Service

**Base URL:** `https://trading.watchup.site`

All local routes proxy to backend.

---

## 🔍 Quick Debug

### Check Console Logs
```javascript
// Look for these patterns:
[Quote API] Request: { ... }
[Quote API] Backend response: { ... }
[Quote API] Backend error: ...
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Quote failed" | Check console for actual error | See logs |
| "Missing required fields" | User not logged in | Login first |
| "No EVM wallet found" | Wallet not created | Create wallet |
| "Insufficient balance" | Not enough funds | Add funds |

---

## 📝 Request Format

### Quote Request
```json
{
  "userId": "user123",
  "fromChain": "ETH",
  "toChain": "ETH",
  "tokenIn": "USDT",
  "tokenOut": "ETH",
  "amountIn": "1000",
  "slippage": 0.005
}
```

### Quote Response
```json
{
  "expectedOutput": "0.234567",
  "priceImpact": 0.12,
  "platformFee": "0",
  "gasEstimate": "2.50",
  "route": "..."
}
```

---

## 🎯 Key Components

### TradingPanel
- Location: `src/components/spot/TradingPanel.tsx`
- Purpose: Quote & trade execution
- Props: `selectedPair`, `onTradeExecuted`

### OrderHistory
- Location: `src/components/spot/OrderHistory.tsx`
- Purpose: Display trade history
- Auto-refreshes after trades

### BalanceDisplay
- Location: `src/components/spot/BalanceDisplay.tsx`
- Purpose: Show available/locked balances
- Auto-refreshes after trades

### MarketTicker
- Location: `src/components/spot/MarketTicker.tsx`
- Purpose: Real-time prices from CoinGecko
- Updates every 20 seconds

### LiveChart
- Location: `src/components/spot/LiveChart.tsx`
- Purpose: Candlestick chart with WebSocket
- Shows stop-loss/take-profit levels

---

## 🧪 Quick Test

### Test Quote
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "fromChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

### Expected Success
```json
{
  "expectedOutput": "0.234567",
  "priceImpact": 0.12,
  ...
}
```

### Expected Error
```json
{
  "message": "No EVM wallet found. Create wallets first."
}
```

---

## 🔧 Common Fixes

### Fix 1: Clear Console Errors
```bash
# Restart dev server
npm run dev
```

### Fix 2: Check User Auth
```typescript
console.log('User:', user);
console.log('User ID:', user?.userId);
```

### Fix 3: Verify Backend
```bash
curl https://trading.watchup.site/health
```

### Fix 4: Check Wallet
```sql
SELECT * FROM user_wallets 
WHERE user_id = 'user123' AND asset = 'ETH';
```

---

## 📊 Slippage Conversion

| User Input | Sent to API |
|------------|-------------|
| 0.1% | 0.001 |
| 0.5% | 0.005 |
| 1.0% | 0.01 |
| 2.0% | 0.02 |
| 5.0% | 0.05 |

**Formula:** `slippage / 100`

---

## 🎨 Component Props

### TradingPanel
```typescript
interface TradingPanelProps {
  selectedPair: string;        // e.g., "BTC-USDT"
  onTradeExecuted?: () => void; // Callback after trade
}
```

### MarketTicker
```typescript
interface MarketTickerProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}
```

### LiveChart
```typescript
interface LiveChartProps {
  symbol: string;              // e.g., "BTC-USDT"
  stopLoss?: string;
  takeProfit?: string;
  onUpdateLevels?: (sl: string, tp: string) => void;
}
```

---

## 🔐 Environment Variables

```env
# Optional - defaults to production URL
TRADING_BACKEND_URL=https://trading.watchup.site
```

---

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | < 640px | Stacked |
| Tablet | 640px - 1024px | 2 columns |
| Desktop | > 1024px | 3 columns |

---

## 🎯 Trading Pairs

Currently supported:
- BTC-USDT
- ETH-USDT
- BNB-USDT
- SOL-USDT
- XRP-USDT
- ADA-USDT

---

## 🚨 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login required |
| 404 | Not Found | Create wallet |
| 500 | Server Error | Check backend |

---

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| Quote Response | < 1s |
| Trade Execution | < 5s |
| Page Load | < 2s |
| Chart Update | Real-time |

---

## 🔄 State Management

### TradingPanel State
```typescript
side: 'buy' | 'sell'
amount: string
slippage: string
quote: QuoteResponse | null
loadingQuote: boolean
executing: boolean
error: string | null
success: string | null
```

### Auto-Refresh Triggers
- After trade execution
- Manual refresh button
- Component mount

---

## 🎨 Theme Colors

```css
Primary: #3b82f6 (blue)
Success: #10b981 (green)
Error: #ef4444 (red)
Warning: #f59e0b (yellow)
Muted: #6b7280 (gray)
```

---

## 📚 Documentation Files

1. **API_ROUTES_ARCHITECTURE.md** - API details
2. **SPOT_TRADING_COMPLETE_ARCHITECTURE.md** - System overview
3. **DEBUGGING_GUIDE.md** - Debug help
4. **TESTING_VALIDATION_GUIDE.md** - Testing guide
5. **QUICK_REFERENCE.md** - This file

---

## 🆘 Need Help?

### Check Logs
```bash
# Console logs
[Quote API] ...
[Execute Trade API] ...

# Network tab
Filter: Fetch/XHR
Look for: /api/quote, /api/execute-trade
```

### Common Commands
```bash
# Restart server
npm run dev

# Check TypeScript
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build
```

### Debug Checklist
- [ ] User logged in?
- [ ] Wallet created?
- [ ] Backend running?
- [ ] Console errors?
- [ ] Network errors?
- [ ] Correct request format?

---

## 🎯 Quick Links

- **Spot Trading Page:** `/spot`
- **Assets Page:** `/assets`
- **Backend API:** `https://trading.watchup.site`
- **Etherscan:** `https://etherscan.io`

---

## 💡 Pro Tips

1. **Always check console first** - Most issues show there
2. **Use Network tab** - See actual requests/responses
3. **Test with small amounts** - Avoid losing funds
4. **Check wallet balance** - Ensure sufficient funds
5. **Monitor gas prices** - High gas = expensive trades
6. **Use appropriate slippage** - Too low = failed trades
7. **Refresh after trades** - Ensure balances update
8. **Check transaction hash** - Verify on blockchain

---

## 🔥 Hot Reload

Changes to these files trigger hot reload:
- `src/components/spot/*.tsx`
- `src/app/(DashboardLayout)/spot/page.tsx`

Changes to these require restart:
- `src/app/api/**/*.ts`
- `.env.local`

---

## ✅ Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Error messages clear
- [ ] Loading states work
- [ ] Backend integration verified
- [ ] Documentation updated

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready
