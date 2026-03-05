# Spot LI.FI Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- MongoDB running and connected
- Wallet setup with PIN
- Small amount of tokens for testing
- Gas tokens available (ETH/SOL)

## 📝 Quick Test

### 1. Open Trading Page
Navigate to the spot trading page (desktop or mobile)

### 2. Execute First Trade
```
1. Select pair: SOL-USDT
2. Click BUY tab
3. Enter amount: 5 USDT
4. Click "Get Quote"
5. Review quote details
6. Click "Confirm Swap"
7. Enter PIN
8. Wait for confirmation
```

### 3. Verify Position Created
```typescript
// Check in database or use hook
const { positions } = useSpotPositions('SOL-USDT', 'OPEN');
console.log(positions); // Should show 1 open position
```

### 4. Execute Second Trade
```
1. Click BUY again
2. Enter amount: 10 USDT
3. Complete transaction
4. Verify position increased (not new position)
```

### 5. Close Position
```
1. Click SELL tab
2. Click "Max" button
3. Complete transaction
4. Verify position closed
```

## 🎯 Key Endpoints

### Frontend Hooks
```typescript
// Trading
import { useSpotSwap } from '@/hooks/useSpotSwap';
const { getQuote, executeSwap, quote } = useSpotSwap();

// Positions
import { useSpotPositions } from '@/hooks/useSpotPositions';
const { positions, updateTPSL, closePosition } = useSpotPositions();
```

### API Routes
```
POST   /api/spot/trades          - Save trade
GET    /api/spot/trades          - Get history
GET    /api/spot/positions       - Get positions
PATCH  /api/spot/positions       - Update TP/SL
DELETE /api/spot/positions/[id]  - Close position
POST   /api/spot/monitor         - Monitor TX
```

## 🔍 Quick Debug

### Check Trade Status
```typescript
const trade = await SpotTrade.findOne({ txHash: 'YOUR_TX' });
console.log('Status:', trade.status); // PENDING/CONFIRMED/FAILED
```

### Check Position
```typescript
const position = await SpotPosition.findOne({ 
  userId: 'YOUR_EMAIL',
  pair: 'SOL-USDT',
  status: 'OPEN'
});
console.log('Amount:', position.totalAmount);
console.log('Avg Price:', position.averageEntryPrice);
console.log('PnL:', position.realizedPnl);
```

### Check History
```typescript
const history = await PositionHistory.find({ 
  positionId: position._id 
}).sort({ createdAt: -1 });

history.forEach(h => {
  console.log(`${h.action}: ${h.amountBefore} → ${h.amountAfter}`);
});
```

## ⚠️ Common Issues

### Quote not fetching
- Check LI.FI API connection
- Verify token addresses correct
- Check network connection

### Transaction stuck
- Check blockchain explorer
- Verify gas price sufficient
- Wait for monitor to update (10s intervals)

### Position not updating
- Verify trade saved successfully
- Check pair format matches exactly
- Ensure status is CONFIRMED

## 📚 Full Documentation

- `SPOT_LIFI_COMPLETE_SUMMARY.md` - Complete overview
- `SPOT_LIFI_TESTING_GUIDE.md` - Detailed testing
- `SPOT_LIFI_INTEGRATION_PHASE1.md` - Foundation
- `SPOT_LIFI_INTEGRATION_PHASE2.md` - Quote & execution
- `SPOT_LIFI_INTEGRATION_PHASE3.md` - Position tracking

## ✅ Success Checklist

- [ ] First BUY creates position
- [ ] Second BUY increases position
- [ ] Average price calculates correctly
- [ ] SELL reduces position
- [ ] Full SELL closes position
- [ ] PnL calculates correctly
- [ ] Transaction monitoring works
- [ ] Status updates automatically

## 🎉 You're Ready!

Start testing with small amounts and verify each step works correctly.

**Remember:** Real blockchain transactions cannot be reversed. Test carefully!
