# Spot LI.FI Integration - Testing Guide

## 🎯 Overview

This guide provides step-by-step testing procedures for the complete LI.FI spot trading integration with real blockchain transactions, position tracking, and transaction monitoring.

## ⚠️ CRITICAL: Start with Small Amounts

**ALWAYS test with minimal amounts first:**
- Use testnet if available
- Start with $1-5 USD equivalent
- Verify each step works before scaling up
- Check balances before and after each trade

## 📋 Pre-Testing Checklist

### 1. Environment Setup
- [ ] MongoDB connection configured
- [ ] LI.FI API accessible
- [ ] Wallet setup complete with PIN
- [ ] Test wallet has small amount of tokens
- [ ] Test wallet has gas tokens (ETH/SOL)

### 2. Database Verification
```bash
# Check MongoDB collections exist
- SpotTrade
- SpotPosition
- PositionHistory
```

### 3. API Endpoints Available
- [ ] POST /api/spot/trades
- [ ] GET /api/spot/trades
- [ ] GET /api/spot/positions
- [ ] PATCH /api/spot/positions
- [ ] GET /api/spot/positions/[id]
- [ ] DELETE /api/spot/positions/[id]
- [ ] POST /api/spot/monitor
- [ ] GET /api/spot/monitor

## 🧪 Testing Scenarios

### Test 1: First BUY Trade (Open Position)

**Objective:** Verify position creation on first buy

**Steps:**
1. Navigate to spot trading page
2. Select a trading pair (e.g., SOL-USDT)
3. Click BUY tab
4. Enter small amount (e.g., 5 USDT)
5. Click "Get Quote"
6. Review quote details:
   - [ ] From amount correct
   - [ ] To amount shown
   - [ ] Execution price displayed
   - [ ] Gas costs shown
   - [ ] Fees displayed
7. Click "Confirm Swap"
8. Enter PIN
9. Wait for transaction

**Expected Results:**
- ✅ Quote fetched successfully
- ✅ Transaction broadcast
- ✅ Trade saved to database (status: PENDING)
- ✅ Position created (status: OPEN)
- ✅ Position history recorded (action: OPEN)
- ✅ Transaction monitoring started
- ✅ Status updates to CONFIRMED
- ✅ Success message shown

**Verification:**
```typescript
// Check database
const trade = await SpotTrade.findOne({ txHash: 'YOUR_TX_HASH' });
console.log('Trade:', trade);
// Should show: status: 'CONFIRMED', side: 'BUY'

const position = await SpotPosition.findOne({ 
  userId: 'YOUR_EMAIL', 
  pair: 'SOL-USDT' 
});
console.log('Position:', position);
// Should show: status: 'OPEN', totalAmount > 0

const history = await PositionHistory.find({ positionId: position._id });
console.log('History:', history);
// Should show: action: 'OPEN'
```

### Test 2: Second BUY Trade (Increase Position)

**Objective:** Verify position increase and average price calculation

**Steps:**
1. With existing open position from Test 1
2. Execute another BUY trade (same pair)
3. Use different amount (e.g., 10 USDT)
4. Complete transaction

**Expected Results:**
- ✅ New trade created
- ✅ Existing position updated (not new position)
- ✅ Total amount increased
- ✅ Average entry price recalculated
- ✅ Position history shows INCREASE action

**Verification:**
```typescript
const position = await SpotPosition.findOne({ 
  userId: 'YOUR_EMAIL', 
  pair: 'SOL-USDT' 
});

// Check calculations
const trade1Amount = 5; // USDT
const trade1Price = 100; // Example: 1 SOL = 100 USDT
const trade2Amount = 10; // USDT
const trade2Price = 105; // Example: 1 SOL = 105 USDT

const expectedAvgPrice = (trade1Amount + trade2Amount) / 
  ((trade1Amount / trade1Price) + (trade2Amount / trade2Price));

console.log('Average Entry Price:', position.averageEntryPrice);
console.log('Expected:', expectedAvgPrice);
// Should match (within rounding)
```

### Test 3: Partial SELL Trade (Reduce Position)

**Objective:** Verify position reduction and PnL calculation

**Steps:**
1. With existing position from Tests 1-2
2. Click SELL tab
3. Enter amount less than total position (e.g., 50% of holdings)
4. Complete transaction

**Expected Results:**
- ✅ SELL trade created
- ✅ Position amount reduced
- ✅ Realized PnL calculated
- ✅ Position still OPEN
- ✅ Position history shows REDUCE action

**Verification:**
```typescript
const position = await SpotPosition.findOne({ 
  userId: 'YOUR_EMAIL', 
  pair: 'SOL-USDT' 
});

console.log('Status:', position.status); // Should be 'OPEN'
console.log('Realized PnL:', position.realizedPnl);

// PnL calculation
const sellPrice = 110; // Example current price
const avgEntryPrice = parseFloat(position.averageEntryPrice);
const soldAmount = 0.05; // Example: sold 0.05 SOL

const expectedPnL = (sellPrice - avgEntryPrice) * soldAmount;
console.log('Expected PnL:', expectedPnL);
// Should match position.realizedPnl
```

### Test 4: Full SELL Trade (Close Position)

**Objective:** Verify position closure

**Steps:**
1. With remaining position from Test 3
2. Click SELL tab
3. Click "Max" or enter full amount
4. Complete transaction

**Expected Results:**
- ✅ SELL trade created
- ✅ Position status changed to CLOSED
- ✅ Total amount set to 0
- ✅ Final realized PnL calculated
- ✅ Position history shows CLOSE action
- ✅ closedAt timestamp set

**Verification:**
```typescript
const position = await SpotPosition.findOne({ 
  userId: 'YOUR_EMAIL', 
  pair: 'SOL-USDT' 
});

console.log('Status:', position.status); // Should be 'CLOSED'
console.log('Total Amount:', position.totalAmount); // Should be '0'
console.log('Closed At:', position.closedAt); // Should have timestamp
console.log('Total Realized PnL:', position.realizedPnl);
```

### Test 5: Take Profit / Stop Loss

**Objective:** Verify TP/SL updates

**Steps:**
1. Open a new position (BUY trade)
2. Use `useSpotPositions` hook to update TP/SL
3. Set take profit above current price
4. Set stop loss below current price

**Expected Results:**
- ✅ Position updated with TP/SL prices
- ✅ Values stored correctly
- ✅ Can be retrieved and displayed

**Code Example:**
```typescript
const { updateTPSL } = useSpotPositions();

await updateTPSL(
  positionId,
  '120', // Take profit at $120
  '95'   // Stop loss at $95
);

// Verify
const position = await SpotPosition.findById(positionId);
console.log('TP:', position.takeProfitPrice); // '120'
console.log('SL:', position.stopLossPrice);   // '95'
```

### Test 6: Manual Position Close

**Objective:** Verify manual close functionality

**Steps:**
1. Open a position
2. Use `closePosition()` from hook
3. Verify position closed without executing trade

**Expected Results:**
- ✅ Position status set to CLOSED
- ✅ Total amount set to 0
- ✅ No new trade created
- ✅ closedAt timestamp set

**Code Example:**
```typescript
const { closePosition } = useSpotPositions();

await closePosition(positionId);

// Verify
const position = await SpotPosition.findById(positionId);
console.log('Status:', position.status); // 'CLOSED'
console.log('Amount:', position.totalAmount); // '0'
```

### Test 7: Transaction Monitoring

**Objective:** Verify automatic status updates

**Steps:**
1. Execute any trade
2. Immediately check trade status (should be PENDING)
3. Wait 10-30 seconds
4. Check status again (should update to CONFIRMED)

**Expected Results:**
- ✅ Trade starts as PENDING
- ✅ Monitor service polls LI.FI
- ✅ Status updates automatically
- ✅ confirmedAt timestamp set
- ✅ Monitor stops after completion

**Verification:**
```typescript
// Right after trade
const trade1 = await SpotTrade.findOne({ txHash: 'YOUR_TX_HASH' });
console.log('Initial Status:', trade1.status); // 'PENDING'

// Wait 30 seconds
await new Promise(resolve => setTimeout(resolve, 30000));

const trade2 = await SpotTrade.findOne({ txHash: 'YOUR_TX_HASH' });
console.log('Updated Status:', trade2.status); // 'CONFIRMED'
console.log('Confirmed At:', trade2.confirmedAt); // Should have timestamp
```

### Test 8: Multiple Concurrent Trades

**Objective:** Verify system handles multiple trades

**Steps:**
1. Execute trade on pair A (e.g., SOL-USDT)
2. Immediately execute trade on pair B (e.g., BTC-USDT)
3. Verify both process correctly

**Expected Results:**
- ✅ Both trades saved
- ✅ Both positions created/updated
- ✅ Both monitored independently
- ✅ No conflicts or race conditions

### Test 9: Error Handling

**Objective:** Verify error scenarios handled gracefully

**Test Cases:**

#### 9a. Insufficient Balance
- Try to buy with more USDT than available
- Expected: Error message shown, no trade created

#### 9b. Invalid Amount
- Enter 0 or negative amount
- Expected: Validation error, button disabled

#### 9c. Network Error
- Disconnect internet during quote fetch
- Expected: Error message, can retry

#### 9d. Transaction Failure
- Transaction rejected by blockchain
- Expected: Status set to FAILED, error logged

### Test 10: Mobile vs Desktop

**Objective:** Verify both interfaces work identically

**Steps:**
1. Execute trade on desktop (BinanceOrderForm)
2. Execute trade on mobile (MobileTradingModal)
3. Compare results

**Expected Results:**
- ✅ Both use same backend logic
- ✅ Both create trades correctly
- ✅ Both update positions correctly
- ✅ UI differences only (modal vs scrollable)

## 📊 Monitoring & Debugging

### Check Transaction Monitor Status
```typescript
// GET /api/spot/monitor
const response = await fetch('/api/spot/monitor');
const { monitoring } = await response.json();

console.log('Currently Monitoring:', monitoring);
// Shows list of active TX monitors
```

### Check Position History
```typescript
const history = await PositionHistory.find({ positionId: 'YOUR_ID' })
  .sort({ createdAt: -1 });

history.forEach(h => {
  console.log(`${h.action}: ${h.amountBefore} → ${h.amountAfter}`);
  if (h.realizedPnl) {
    console.log(`  PnL: ${h.realizedPnl}`);
  }
});
```

### Check Trade History
```typescript
const trades = await SpotTrade.find({ userId: 'YOUR_EMAIL' })
  .sort({ createdAt: -1 })
  .limit(10);

trades.forEach(t => {
  console.log(`${t.side} ${t.pair}: ${t.status}`);
  console.log(`  From: ${t.fromAmount} ${t.fromTokenSymbol}`);
  console.log(`  To: ${t.toAmount} ${t.toTokenSymbol}`);
  console.log(`  Price: ${t.executionPrice}`);
});
```

## 🐛 Common Issues & Solutions

### Issue: Quote not fetching
**Solution:** Check LI.FI API key and network connection

### Issue: Transaction stuck in PENDING
**Solution:** 
- Check blockchain explorer for TX status
- Verify monitor service is running
- Check LI.FI status API manually

### Issue: Position not updating
**Solution:**
- Verify trade was saved successfully
- Check position logic in `/api/spot/trades`
- Ensure pair format matches exactly

### Issue: PnL calculation incorrect
**Solution:**
- Verify average entry price calculation
- Check decimal precision (use bigint)
- Review position history for all trades

### Issue: Multiple positions for same pair
**Solution:**
- Should not happen (constraint in place)
- Check database for duplicate positions
- Verify position query logic

## ✅ Success Criteria

All tests pass when:
- [ ] Positions open correctly on first BUY
- [ ] Positions increase on subsequent BUYs
- [ ] Average price calculates correctly
- [ ] Partial sells reduce position
- [ ] Full sells close position
- [ ] PnL calculations accurate
- [ ] TP/SL updates work
- [ ] Manual close works
- [ ] Transaction monitoring updates status
- [ ] Multiple trades handled correctly
- [ ] Errors handled gracefully
- [ ] Mobile and desktop work identically

## 🚀 Production Readiness

Before going live:
- [ ] All tests passed with small amounts
- [ ] Tested on testnet (if available)
- [ ] Error handling verified
- [ ] Database backups configured
- [ ] Monitoring/alerting set up
- [ ] Gas price limits configured
- [ ] Slippage limits appropriate
- [ ] User documentation prepared

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Test 1: First BUY Trade
- Status: ✅ PASS / ❌ FAIL
- Notes: 

### Test 2: Second BUY Trade
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 3: Partial SELL Trade
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 4: Full SELL Trade
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 5: TP/SL Update
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 6: Manual Close
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 7: Transaction Monitoring
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 8: Multiple Concurrent Trades
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 9: Error Handling
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Test 10: Mobile vs Desktop
- Status: ✅ PASS / ❌ FAIL
- Notes:

### Overall Status: ✅ READY / ⚠️ NEEDS WORK / ❌ NOT READY
```

---

**Remember:** Always test with small amounts first. Real blockchain transactions cannot be reversed!
