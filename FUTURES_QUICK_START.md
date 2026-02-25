# Futures Trading - Quick Start Guide

## 🚀 What's Ready to Use

The futures trading interface is fully functional with mock data. You can:

1. **Navigate to Futures**
   - Click "Futures" in the sidebar under "Trading" section
   - Or visit: `http://localhost:3000/futures`

2. **Test the UI**
   - Switch between chains (Solana, Arbitrum, Ethereum)
   - Select different markets (BTC-PERP, ETH-PERP, SOL-PERP)
   - Adjust order parameters (size, leverage)
   - See live preview calculations
   - View mock positions and collateral data

## 📁 File Structure

```
src/
├── app/
│   ├── (DashboardLayout)/
│   │   └── futures/
│   │       ├── page.tsx              # Main futures page
│   │       └── README.md             # Detailed documentation
│   └── api/
│       └── futures/
│           ├── markets/route.ts      # GET markets
│           ├── positions/route.ts    # GET positions
│           ├── collateral/route.ts   # GET collateral
│           ├── preview/route.ts      # POST preview order
│           ├── open/route.ts         # POST open position
│           ├── close/route.ts        # POST close position
│           └── wallet/
│               ├── route.ts          # GET wallet
│               └── create/route.ts   # POST create wallet
├── components/
│   └── futures/
│       ├── ChainSelector.tsx         # Chain selection dropdown
│       ├── MarketSelector.tsx        # Market selection dropdown
│       ├── OrderPanel.tsx            # Order entry form
│       ├── PositionPanel.tsx         # Open positions table
│       ├── RiskPanel.tsx             # Risk metrics display
│       ├── WalletModal.tsx           # Wallet creation modal
│       └── index.ts                  # Component exports
├── store/
│   └── futuresStore.ts               # Zustand state management
└── hooks/
    └── useFuturesData.ts             # Data fetching hook
```

## 🔧 Next Steps for Production

### 1. Choose Your Protocols

**Solana:**
```bash
npm install @drift-labs/sdk
# or
npm install @blockworks-foundation/mango-client
```

**Arbitrum/Ethereum:**
```bash
npm install @gmx-io/sdk
# or
npm install @dydxprotocol/v3-client
```

### 2. Implement Wallet Creation

Update `/api/futures/wallet/create/route.ts`:
```typescript
import { Keypair } from '@solana/web3.js';
import { encrypt } from '@/lib/crypto';

// Generate keypair
const keypair = Keypair.generate();

// Encrypt and store private key
const encryptedKey = encrypt(keypair.secretKey);
await db.wallets.create({
  userId,
  chain,
  address: keypair.publicKey.toString(),
  encryptedKey,
});
```

### 3. Connect to Protocol

Update `/api/futures/markets/route.ts`:
```typescript
import { DriftClient } from '@drift-labs/sdk';

const client = new DriftClient({ connection, wallet });
const markets = await client.getPerpMarkets();
```

### 4. Implement Position Opening

Update `/api/futures/open/route.ts`:
```typescript
// Validate margin
const collateral = await getCollateral(userId, chain);
if (collateral.free < requiredMargin) {
  throw new Error('Insufficient margin');
}

// Execute trade
const tx = await protocol.openPosition({
  market,
  side,
  size,
  leverage,
});

// Store position
await db.positions.create({ userId, ...positionData });
```

## 🧪 Testing the UI

### Manual Testing Steps

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to futures:**
   ```
   http://localhost:3000/futures
   ```

3. **Test chain switching:**
   - Select different chains
   - Verify markets update
   - Check wallet modal appears

4. **Test order entry:**
   - Enter size (e.g., 0.1)
   - Adjust leverage slider
   - Watch preview update
   - Try to submit (will show success with mock data)

5. **Check responsive design:**
   - Resize browser window
   - Test on mobile viewport
   - Verify all components adapt

## 🎨 Customization

### Change Polling Interval
In `useFuturesData.ts`:
```typescript
const interval = setInterval(refreshData, 5000); // Change 5000 to desired ms
```

### Adjust Max Leverage
In `OrderPanel.tsx`:
```typescript
max={previewData?.maxLeverageAllowed || 20} // Change 20 to desired max
```

### Add New Chain
1. Update `futuresStore.ts`:
   ```typescript
   export type Chain = 'solana' | 'arbitrum' | 'ethereum' | 'polygon';
   ```

2. Update `ChainSelector.tsx`:
   ```typescript
   const chains = [
     // ... existing chains
     { value: 'polygon', label: 'Polygon', icon: 'cryptocurrency:matic' },
   ];
   ```

## 📊 Mock Data

Currently returns mock data for:
- 3 markets (BTC-PERP, ETH-PERP, SOL-PERP)
- $10,000 total collateral
- No open positions
- Placeholder wallet addresses

To modify mock data, edit the respective API route files in `src/app/api/futures/`.

## 🐛 Common Issues

**Issue: "Wallet not found" modal keeps appearing**
- This is expected behavior for first-time users
- Click "Create Wallet" to proceed
- Backend needs to be implemented to persist wallet

**Issue: Preview not updating**
- Check browser console for errors
- Verify API routes are responding
- Check network tab in DevTools

**Issue: Positions not showing**
- Mock data returns empty positions array
- Implement backend to return actual positions

## 📚 Documentation

- **Detailed docs:** `src/app/(DashboardLayout)/futures/README.md`
- **Implementation guide:** `FUTURES_IMPLEMENTATION_GUIDE.md`
- **API routes:** Check individual route files for inline comments

## 🎯 Production Checklist

Before going live:
- [ ] Implement real protocol integration
- [ ] Set up secure wallet management
- [ ] Add authentication/authorization
- [ ] Implement real-time WebSocket updates
- [ ] Add comprehensive error handling
- [ ] Set up monitoring and logging
- [ ] Perform security audit
- [ ] Load test the system
- [ ] Add rate limiting
- [ ] Implement backup strategy

## 💡 Tips

1. **Start with testnet:** Test with protocol testnets before mainnet
2. **Use small amounts:** Start with minimal position sizes
3. **Monitor closely:** Watch for liquidations and funding rates
4. **Log everything:** Comprehensive logging helps debugging
5. **Test edge cases:** Try invalid inputs, insufficient margin, etc.

## 🆘 Need Help?

1. Check the README files in each directory
2. Review the implementation guide
3. Check protocol-specific documentation
4. Review the mock API responses to understand data structure

## 🚀 Ready to Launch?

Once backend is implemented:
1. Test thoroughly on testnet
2. Perform security audit
3. Set up monitoring
4. Deploy to production
5. Monitor closely for first few days
6. Gather user feedback
7. Iterate and improve

---

**Current Status:** ✅ Frontend Complete | 🚧 Backend Integration Needed

The UI is production-ready and waiting for backend protocol integration!
