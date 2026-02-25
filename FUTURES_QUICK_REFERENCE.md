# Futures Trading - Quick Reference Card

## 🚀 Quick Start

```bash
# Start the app
npm run dev

# Navigate to
http://localhost:3000/futures
```

## 🔗 API Endpoints

### Base URL
```
https://trading.watchup.site
```

### Quick Reference
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/futures/wallet` | GET | Get wallet |
| `/api/futures/wallet/create` | POST | Create wallet |
| `/api/futures/markets` | GET | Get markets |
| `/api/futures/positions` | GET | Get positions |
| `/api/futures/preview` | POST | Preview trade |
| `/api/futures/open` | POST | Open position |
| `/api/futures/close` | POST | Close position |
| `/api/futures/collateral` | GET | Get collateral |
| `/api/futures/collateral/deposit` | POST | Deposit |
| `/api/futures/collateral/withdraw` | POST | Withdraw |

## 📁 File Locations

### API Routes
```
src/app/api/futures/
```

### Components
```
src/components/futures/
```

### State
```
src/store/futuresStore.ts
src/hooks/useFuturesData.ts
```

### Page
```
src/app/(DashboardLayout)/futures/page.tsx
```

## 🎨 Components

| Component | Purpose |
|-----------|---------|
| `ChainSelector` | Select blockchain |
| `MarketSelector` | Select trading pair |
| `OrderPanel` | Enter trade details |
| `PositionPanel` | View/close positions |
| `RiskPanel` | Monitor risk + deposit/withdraw |
| `WalletModal` | Create wallet |

## 🔐 Authentication

All routes use Clerk auth:
```typescript
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();
```

## 📊 State Structure

```typescript
{
  selectedChain: 'solana' | 'arbitrum' | 'ethereum',
  selectedMarket: Market | null,
  markets: Market[],
  positions: Position[],
  collateral: Collateral | null,
  walletAddresses: { [chain]: address },
  previewData: PreviewData | null,
  isLoading: boolean,
  error: string | null
}
```

## 🎯 Common Tasks

### Access State
```typescript
import { useFuturesStore } from '@/store/futuresStore';
const { selectedChain, positions } = useFuturesStore();
```

### Refresh Data
```typescript
import { useFuturesData } from '@/hooks/useFuturesData';
const { refreshData } = useFuturesData();
await refreshData();
```

### Make API Call
```typescript
const response = await fetch('/api/futures/markets?chain=solana');
const data = await response.json();
```

## 🧪 Testing

### Quick Test
1. Go to `/futures`
2. Create wallet
3. Select market
4. Enter trade
5. Check preview
6. Open position

### Check Logs
```bash
# Browser console
F12 → Console

# Network requests
F12 → Network
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Wallet modal appears | Create wallet for chain |
| Markets not loading | Check backend API |
| Preview not updating | Check console errors |
| Unauthorized | Login with Clerk |
| Position not opening | Check collateral |

## 📈 Performance

- Initial load: < 2s
- Preview: 300ms debounce
- Polling: 5s interval
- API response: < 500ms

## 🔄 Data Flow

```
User → Component → API Route → Backend → Protocol → Blockchain
```

## 💡 Tips

1. **Preview before trading** - Always check preview
2. **Monitor margin ratio** - Keep above 20%
3. **Use stop losses** - Protect your capital
4. **Start small** - Test with small positions
5. **Check TX hashes** - Verify on blockchain

## 📚 Documentation

- `FUTURES_IMPLEMENTATION_GUIDE.md` - Full guide
- `FUTURES_TESTING_GUIDE.md` - Testing steps
- `FUTURES_BACKEND_INTEGRATION_COMPLETE.md` - API docs
- `FUTURES_QUICK_START.md` - Getting started

## 🆘 Need Help?

1. Check console for errors
2. Review documentation
3. Check network tab
4. Verify authentication
5. Contact dev team

## ✅ Pre-Launch Checklist

- [ ] Backend API running
- [ ] User logged in
- [ ] Wallet created
- [ ] Markets loading
- [ ] Preview working
- [ ] Positions displaying
- [ ] Collateral accurate

## 🎉 Quick Wins

### Open Your First Position
```
1. Select chain: Solana
2. Select market: SOL-PERP
3. Side: Long
4. Size: 0.5
5. Leverage: 3x
6. Click "Open Long"
```

### Deposit Collateral
```
1. Click "Deposit" in Risk Panel
2. Enter amount: 100
3. Click "Deposit"
4. Wait for confirmation
```

### Close a Position
```
1. Find position in table
2. Click "Close"
3. Confirm
4. Done!
```

---

**Keep this card handy for quick reference!** 📌
