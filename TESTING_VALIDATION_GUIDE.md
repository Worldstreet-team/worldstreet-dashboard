# Testing & Validation Guide - Spot Trading

## Pre-Testing Checklist

Before testing the spot trading functionality, ensure:

- [ ] User is authenticated (logged in)
- [ ] User has created wallets (EVM wallet required)
- [ ] User has USDT balance in their wallet
- [ ] Backend service is running at `https://trading.watchup.site`
- [ ] Browser DevTools is open (F12) for monitoring

## Test Scenarios

### Scenario 1: Successful Quote Request

**Prerequisites:**
- User is logged in
- User has EVM wallet
- Valid token pair selected (e.g., BTC-USDT)

**Steps:**
1. Navigate to Spot Trading page
2. Select "Buy BTC" or "Sell BTC"
3. Enter amount (e.g., 1000 USDT)
4. Select slippage (e.g., 0.5%)
5. Click "Get Quote"

**Expected Result:**
- Loading spinner appears
- Quote displays with:
  - Expected output amount
  - Price impact (color-coded)
  - Platform fee
  - Gas estimate
- "Buy/Sell" button becomes enabled

**Console Logs to Check:**
```
[Quote API] Request: { userId: "...", fromChain: "EVM", ... }
[Quote API] Sending to backend: { ... }
[Quote API] Backend response: { status: 200, data: { ... } }
[Quote API] Transformed response: { expectedOutput: "...", ... }
```

**Network Tab:**
- Request to `/api/quote` with status 200
- Response contains quote data

---

### Scenario 2: Quote Request - No Wallet

**Prerequisites:**
- User is logged in
- User has NOT created wallets

**Steps:**
1. Navigate to Spot Trading page
2. Enter amount and click "Get Quote"

**Expected Result:**
- Error message: "No EVM wallet found. Create wallets first."
- Red error box displayed

**Console Logs:**
```
[Quote API] Backend error: No EVM wallet found. Create wallets first.
```

**Fix:** User needs to create wallet first (go to Assets page)

---

### Scenario 3: Quote Request - Missing Fields

**Prerequisites:**
- User is logged in

**Steps:**
1. Navigate to Spot Trading page
2. Click "Get Quote" without entering amount

**Expected Result:**
- Error message: "Please enter a valid amount"
- No API call made

---

### Scenario 4: Successful Trade Execution

**Prerequisites:**
- User has valid quote
- User has sufficient balance

**Steps:**
1. Get a quote (Scenario 1)
2. Review quote details
3. Click "Buy BTC" or "Sell BTC"

**Expected Result:**
- Loading spinner on button
- Button text: "Executing Trade..."
- Success message with transaction hash
- Balances refresh automatically
- Order history updates

**Console Logs:**
```
[Execute Trade API] Request: { userId: "...", ... }
[Execute Trade API] Sending to backend: { ... }
[Execute Trade API] Backend response: { status: 200, data: { txHash: "0x..." } }
[Execute Trade API] Success: { ... }
```

---

### Scenario 5: Trade Execution - Insufficient Balance

**Prerequisites:**
- User has valid quote
- User has insufficient balance

**Steps:**
1. Get a quote for large amount
2. Click "Buy/Sell"

**Expected Result:**
- Error message: "Insufficient balance"
- Funds not locked
- User can try again with smaller amount

---

### Scenario 6: High Price Impact Warning

**Prerequisites:**
- User enters large trade amount

**Steps:**
1. Enter very large amount (e.g., 100000 USDT)
2. Click "Get Quote"

**Expected Result:**
- Quote displays with high price impact (> 5%)
- Red warning box appears
- Warning text: "High price impact! Consider reducing your trade size."

---

### Scenario 7: Slippage Adjustment

**Steps:**
1. Select different slippage values (0.1%, 0.5%, 1.0%)
2. Enter custom slippage
3. Get quote for each

**Expected Result:**
- Slippage button highlights when selected
- Custom input accepts decimal values
- Quote reflects different slippage tolerance

**Verify in logs:**
```
[Quote API] Request: { ..., slippage: 0.001 }  // 0.1%
[Quote API] Request: { ..., slippage: 0.005 }  // 0.5%
[Quote API] Request: { ..., slippage: 0.01 }   // 1.0%
```

---

### Scenario 8: Buy vs Sell Toggle

**Steps:**
1. Select "Buy BTC"
2. Enter amount
3. Get quote
4. Switch to "Sell BTC"
5. Get quote again

**Expected Result:**
- Token labels update correctly
- Amount label changes (USDT for buy, BTC for sell)
- Quote reflects correct direction
- Button text changes

---

### Scenario 9: Balance Display

**Steps:**
1. Navigate to Spot Trading page
2. Check Balance Display component

**Expected Result:**
- Shows all token balances
- Available balance (green)
- Locked balance (yellow)
- Total balance
- Refresh button works

**Console Logs:**
```
GET /api/users/:userId/balances
Response: { balances: [...] }
```

---

### Scenario 10: Order History

**Steps:**
1. Execute a trade
2. Check Order History component

**Expected Result:**
- New trade appears in history
- Shows: time, pair, side, amounts, fee, status
- Transaction link works (opens Etherscan)
- Refresh button works

**Console Logs:**
```
GET /api/trades/:userId
Response: { trades: [...] }
```

---

## API Testing with cURL

### Test Quote API
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "fromChain": "ETH",
    "toChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

**Expected Success Response:**
```json
{
  "expectedOutput": "0.234567",
  "priceImpact": 0.12,
  "platformFee": "0",
  "gasEstimate": "2.50",
  "route": "...",
  "toAmountMin": "0.233456"
}
```

**Expected Error Response (No Wallet):**
```json
{
  "message": "No EVM wallet found. Create wallets first."
}
```

### Test Execute Trade API
```bash
curl -X POST http://localhost:3000/api/execute-trade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "fromChain": "ETH",
    "toChain": "ETH",
    "tokenIn": "USDT",
    "tokenOut": "ETH",
    "amountIn": "1000",
    "slippage": 0.005
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "message": "Trade executed successfully"
}
```

---

## Browser DevTools Monitoring

### Console Tab

**What to Look For:**
1. Request logs: `[Quote API] Request:`
2. Backend payload: `[Quote API] Sending to backend:`
3. Response logs: `[Quote API] Backend response:`
4. Errors: `[Quote API] Backend error:`
5. Transformed data: `[Quote API] Transformed response:`

**Red Flags:**
- `undefined` values in request
- 400/404/500 status codes
- Error messages in response
- Missing required fields

### Network Tab

**Filter:** Fetch/XHR

**Requests to Monitor:**
1. `/api/quote` - Quote requests
2. `/api/execute-trade` - Trade execution
3. `/api/trades/:userId` - Order history
4. `/api/users/:userId/balances` - Balance updates

**For Each Request Check:**
- Status code (should be 200 for success)
- Request payload (all fields present)
- Response body (correct format)
- Response time (< 2 seconds)

### Application Tab

**Local Storage:**
- Check if user session is stored
- Verify authentication tokens

**Session Storage:**
- Check for any cached data

---

## Common Issues & Solutions

### Issue 1: "Quote failed" Error

**Symptoms:**
- Generic error message
- No specific details

**Debug Steps:**
1. Check console for `[Quote API] Backend error:`
2. Look at actual error message
3. Common causes:
   - No wallet created
   - Invalid token pair
   - Backend service down

**Solutions:**
- Create wallet if missing
- Verify token symbols are correct
- Check backend service status

---

### Issue 2: "Missing required fields"

**Symptoms:**
- 400 error immediately
- No backend call made

**Debug Steps:**
1. Check console for `[Quote API] Request:`
2. Look for `undefined` values
3. Verify user is logged in

**Solutions:**
- Ensure user is authenticated
- Check `user?.userId` is not undefined
- Verify all form fields are filled

---

### Issue 3: Slippage Too High/Low

**Symptoms:**
- Trade fails with slippage error
- Price moved too much

**Debug Steps:**
1. Check slippage value in logs
2. Verify conversion (% to decimal)

**Solutions:**
- Increase slippage tolerance
- Try trade again quickly
- Use market order instead

---

### Issue 4: Balance Not Updating

**Symptoms:**
- Trade succeeds but balance unchanged
- Old balance displayed

**Debug Steps:**
1. Check if refresh was triggered
2. Look for balance API call
3. Verify response data

**Solutions:**
- Click refresh button manually
- Check `onTradeExecuted` callback
- Verify `refreshKey` is updating

---

### Issue 5: Transaction Hash Not Showing

**Symptoms:**
- Success message but no tx hash
- "undefined" in message

**Debug Steps:**
1. Check backend response format
2. Look for `txHash` field
3. Verify response transformation

**Solutions:**
- Check backend returns `txHash`
- Update response handling if needed
- Add fallback for missing hash

---

## Performance Benchmarks

### Expected Response Times

| Operation | Expected Time | Alert Threshold |
|-----------|--------------|-----------------|
| Get Quote | < 1 second | > 3 seconds |
| Execute Trade | < 5 seconds | > 10 seconds |
| Load History | < 500ms | > 2 seconds |
| Load Balances | < 500ms | > 2 seconds |

### Load Testing

**Test 1: Rapid Quote Requests**
- Get 10 quotes in quick succession
- All should succeed
- No rate limiting errors

**Test 2: Concurrent Users**
- Multiple users getting quotes
- No conflicts or errors
- Each gets correct data

**Test 3: Large Amounts**
- Test with very large amounts
- Check price impact calculation
- Verify gas estimates scale

---

## Security Testing

### Test 1: Authentication Required

**Steps:**
1. Log out
2. Try to access spot trading
3. Try to call API directly

**Expected:**
- Redirect to login
- API returns 401 Unauthorized

### Test 2: User Isolation

**Steps:**
1. User A gets quote
2. User B gets quote
3. Verify separate data

**Expected:**
- Each user sees only their data
- No data leakage between users

### Test 3: Input Validation

**Test Invalid Inputs:**
- Negative amounts
- Zero amounts
- Non-numeric values
- SQL injection attempts
- XSS attempts

**Expected:**
- All rejected with proper errors
- No crashes or security issues

---

## Regression Testing

After any code changes, verify:

- [ ] Quote requests still work
- [ ] Trade execution still works
- [ ] Balance display updates
- [ ] Order history loads
- [ ] Error messages display correctly
- [ ] Loading states show properly
- [ ] Mobile layout works
- [ ] Dark mode works
- [ ] All buttons functional
- [ ] No console errors

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Error messages are user-friendly
- [ ] Loading states work correctly
- [ ] Mobile responsive
- [ ] Dark mode tested
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Logging is comprehensive
- [ ] Error tracking configured
- [ ] Rate limiting tested
- [ ] Backend integration verified
- [ ] Transaction links work
- [ ] Balance updates work
- [ ] Order history accurate

---

## Monitoring in Production

### Key Metrics

1. **Success Rate**
   - Quote success rate > 95%
   - Trade success rate > 90%

2. **Response Times**
   - p50 < 1 second
   - p95 < 3 seconds
   - p99 < 5 seconds

3. **Error Rates**
   - 4xx errors < 5%
   - 5xx errors < 1%

4. **User Actions**
   - Quotes per day
   - Trades per day
   - Average trade size

### Alerts to Set Up

1. **High Error Rate**
   - Alert if error rate > 10%
   - Check backend status

2. **Slow Response**
   - Alert if p95 > 5 seconds
   - Check backend performance

3. **No Trades**
   - Alert if no trades for 1 hour
   - Check if service is down

4. **Failed Trades**
   - Alert if trade failure rate > 20%
   - Check blockchain status

---

## Support & Troubleshooting

### User Reports Issue

**Step 1: Gather Information**
- User ID
- Timestamp
- Error message
- Browser/device
- Steps to reproduce

**Step 2: Check Logs**
```bash
# Search for user's requests
grep "userId.*USER_ID" logs.txt

# Check for errors
grep "Backend error" logs.txt | grep "USER_ID"
```

**Step 3: Reproduce**
- Try same action with test account
- Check if issue is user-specific
- Verify backend is working

**Step 4: Fix & Verify**
- Apply fix
- Test with user's scenario
- Verify issue resolved

---

## Summary

This guide covers:
- ✅ 10 test scenarios
- ✅ API testing with cURL
- ✅ Browser DevTools monitoring
- ✅ Common issues & solutions
- ✅ Performance benchmarks
- ✅ Security testing
- ✅ Production readiness
- ✅ Monitoring & alerts

Use this guide to ensure the spot trading feature works correctly before and after deployment! 🚀
