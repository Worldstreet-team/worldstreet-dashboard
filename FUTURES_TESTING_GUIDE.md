# Futures Trading - Testing Guide

## 🧪 Quick Testing Steps

### 1. Start the Application
```bash
npm run dev
```

Navigate to: `http://localhost:3000/futures`

### 2. First-Time Setup

#### Step 1: Wallet Creation
1. You should see a modal: "Generate Futures Trading Wallet"
2. Click "Create Wallet"
3. Wait for confirmation
4. Wallet address should appear in the header

**Expected Result:** Wallet created successfully, address displayed

#### Step 2: Select Chain
1. Use the chain dropdown (top of page)
2. Try switching between: Solana, Arbitrum, Ethereum
3. Markets should update for each chain

**Expected Result:** Markets list changes based on selected chain

### 3. Market Data Testing

#### View Markets
1. Check the market selector dropdown
2. Should see markets like: BTC-PERP, ETH-PERP, SOL-PERP
3. Select a market
4. Mark price and 24h change should display

**Expected Result:** Market data loads and displays correctly

### 4. Order Preview Testing

#### Test Preview Calculation
1. Select a market (e.g., SOL-PERP)
2. Choose side: Long or Short
3. Enter size: 1.0
4. Adjust leverage: 5x
5. Wait 300ms for preview

**Expected Preview Display:**
- Required Margin: $XX.XX
- Est. Liquidation Price: $XX.XX
- Est. Fee: $XX.XX
- Funding Impact: $XX.XXXX

**Test Cases:**
- [ ] Preview updates when size changes
- [ ] Preview updates when leverage changes
- [ ] Preview updates when side changes
- [ ] Preview shows error if insufficient margin

### 5. Position Opening Testing

#### Open a Long Position
1. Set parameters:
   - Market: SOL-PERP
   - Side: Long
   - Size: 0.5
   - Leverage: 3x
2. Review preview
3. Click "Open Long"
4. Wait for confirmation

**Expected Result:** 
- Success alert with message
- Position appears in positions table
- Collateral updates

#### Open a Short Position
1. Set parameters:
   - Market: BTC-PERP
   - Side: Short
   - Size: 0.01
   - Leverage: 5x
2. Click "Open Short"

**Expected Result:** Short position created

### 6. Position Management Testing

#### View Positions
Check the positions table shows:
- [ ] Market symbol
- [ ] Side (Long/Short) with color coding
- [ ] Size
- [ ] Entry price
- [ ] Mark price
- [ ] Unrealized PnL (green/red)
- [ ] Leverage
- [ ] Liquidation price
- [ ] Margin ratio
- [ ] Close button

#### Close a Position
1. Find an open position
2. Click "Close" button
3. Confirm the action
4. Wait for confirmation

**Expected Result:**
- Success message
- Position removed from table
- Collateral updates

### 7. Collateral Management Testing

#### Deposit Collateral
1. Click "Deposit" button in Risk Panel
2. Enter amount: 100
3. Click "Deposit"
4. Wait for transaction

**Expected Result:**
- Success message with TX hash
- Total collateral increases
- Free margin increases

#### Withdraw Collateral
1. Click "Withdraw" button in Risk Panel
2. Enter amount: 50
3. Or click "Max" for maximum available
4. Click "Withdraw"
5. Wait for transaction

**Expected Result:**
- Success message with TX hash
- Total collateral decreases
- Free margin decreases

**Test Cases:**
- [ ] Cannot withdraw more than free margin
- [ ] Max button sets correct amount
- [ ] Withdraw disabled if no free margin

### 8. Risk Panel Testing

#### Check Risk Metrics
Verify the Risk Panel displays:
- [ ] Total Collateral
- [ ] Used Margin
- [ ] Free Margin
- [ ] Margin Ratio
- [ ] Total Unrealized PnL
- [ ] Funding Accrued

#### High Risk Warning
1. Open positions until margin ratio < 20%
2. Check for red warning message

**Expected Result:** Warning appears when margin ratio is low

### 9. Multi-Chain Testing

#### Test Each Chain
For each chain (Solana, Arbitrum, Ethereum):
1. Switch to chain
2. Create wallet (if needed)
3. View markets
4. Open a position
5. Check collateral
6. Close position

**Expected Result:** All features work on all chains

### 10. Error Handling Testing

#### Test Error Scenarios

**Insufficient Margin:**
1. Try to open position larger than available margin
2. Submit button should be disabled
3. Error message should display

**Invalid Input:**
1. Enter negative size
2. Enter zero size
3. Enter non-numeric values

**Expected Result:** Validation prevents submission

**Network Errors:**
1. Disconnect internet
2. Try to open position
3. Should show error message

**Expected Result:** Graceful error handling

### 11. Loading States Testing

#### Check Loading Indicators
- [ ] Initial page load shows loading
- [ ] Preview calculation shows debounce
- [ ] Position opening shows "Opening..."
- [ ] Position closing shows "Closing..."
- [ ] Deposit shows "Processing..."
- [ ] Withdraw shows "Processing..."

### 12. Responsive Design Testing

#### Desktop (1920x1080)
- [ ] All panels visible
- [ ] Chart area appropriate size
- [ ] Tables readable

#### Tablet (768x1024)
- [ ] Layout adjusts
- [ ] Panels stack correctly
- [ ] Touch targets adequate

#### Mobile (375x667)
- [ ] Mobile sidebar works
- [ ] Forms usable
- [ ] Tables scroll horizontally

## 🔍 API Testing

### Using cURL

#### Test Wallet Creation
```bash
curl -X POST http://localhost:3000/api/futures/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"chain":"solana"}'
```

#### Test Markets
```bash
curl "http://localhost:3000/api/futures/markets?chain=solana"
```

#### Test Preview
```bash
curl -X POST http://localhost:3000/api/futures/preview \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"solana",
    "market":"SOL-PERP",
    "side":"long",
    "size":1,
    "leverage":5
  }'
```

### Using Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Perform actions in UI
4. Check requests/responses

**Look for:**
- [ ] 200 status codes for success
- [ ] 401 for unauthorized
- [ ] 400 for bad requests
- [ ] 500 for server errors

## 📊 Performance Testing

### Load Time
- [ ] Initial page load < 2s
- [ ] Market data loads < 1s
- [ ] Preview updates < 500ms

### Polling
- [ ] Data refreshes every 5s
- [ ] No memory leaks
- [ ] CPU usage reasonable

### Network
- [ ] Requests are debounced
- [ ] No duplicate requests
- [ ] Proper caching

## 🐛 Common Issues & Solutions

### Issue: "Wallet not found" modal keeps appearing
**Solution:** Backend may not have wallet. Check backend logs.

### Issue: Markets not loading
**Solution:** Check backend API is running. Verify chain parameter.

### Issue: Preview not updating
**Solution:** Check console for errors. Verify market is selected.

### Issue: Position not opening
**Solution:** Check collateral balance. Verify wallet exists.

### Issue: Unauthorized errors
**Solution:** Ensure logged in with Clerk. Check auth token.

## ✅ Testing Checklist

### Functionality
- [ ] Wallet creation
- [ ] Chain switching
- [ ] Market selection
- [ ] Order preview
- [ ] Position opening (long)
- [ ] Position opening (short)
- [ ] Position closing
- [ ] Collateral deposit
- [ ] Collateral withdrawal
- [ ] Risk warnings

### UI/UX
- [ ] Loading states
- [ ] Error messages
- [ ] Success confirmations
- [ ] Responsive design
- [ ] Dark mode
- [ ] Accessibility

### Performance
- [ ] Fast load times
- [ ] Smooth interactions
- [ ] No lag
- [ ] Efficient polling

### Security
- [ ] Authentication required
- [ ] Validation working
- [ ] Error handling
- [ ] No sensitive data exposed

## 📝 Test Report Template

```markdown
## Test Session Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Development/Staging/Production
**Browser:** Chrome/Firefox/Safari

### Tests Performed
- [ ] Wallet creation
- [ ] Position opening
- [ ] Position closing
- [ ] Collateral management

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual

### Performance Notes
- Load time: Xs
- API response: Xms
- Memory usage: XMB

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Overall Status
✅ Pass / ❌ Fail / ⚠️ Pass with issues
```

## 🚀 Pre-Production Checklist

Before deploying to production:
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Backup plan ready
- [ ] Monitoring configured
- [ ] Team trained

## 📞 Support

If you encounter issues:
1. Check console for errors
2. Review network tab
3. Check backend logs
4. Consult documentation
5. Contact development team

---

**Happy Testing! 🎉**
