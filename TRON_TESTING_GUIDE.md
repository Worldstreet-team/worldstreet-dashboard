# Tron Wallet Generation - Testing Guide

## Prerequisites
- TronWeb library loaded in browser (check `src/app/layout.tsx`)
- Alchemy Tron RPC URL configured in `.env.local`
- MongoDB connection working
- User authentication working

## Test Scenarios

### Scenario 1: New User (All 4 Wallets)
**Expected Behavior:** User gets SOL, ETH, BTC, and TRX wallets on first setup

1. Create a new user account
2. Navigate to Assets page
3. PIN setup modal should appear automatically
4. Enter a 6-digit PIN
5. Confirm the PIN
6. Wait for wallet generation (should show progress)
7. **Verify:** All 4 wallet addresses displayed (SOL, ETH, BTC, TRX)
8. **Verify:** Tron address starts with 'T' and is 34 characters
9. **Verify:** Can click on Tron address to see QR code

### Scenario 2: Existing User (Add Tron Wallet)
**Expected Behavior:** User with 3 wallets can generate Tron separately

1. Login as existing user (with only SOL/ETH/BTC)
2. Navigate to Assets page
3. **Verify:** "Generate Tron Wallet" button visible in wallet addresses section
4. **Verify:** Button has gradient background and dashed border
5. Click "Generate Tron Wallet" button
6. **Verify:** Modal opens with PIN entry
7. Enter correct PIN
8. **Verify:** Progress indicator shows during generation
9. **Verify:** Success message appears
10. **Verify:** Modal closes automatically
11. **Verify:** Tron address now displayed in wallet grid
12. **Verify:** "Generate Tron Wallet" button replaced with Tron address

### Scenario 3: Invalid PIN
**Expected Behavior:** Error shown for incorrect PIN

1. Click "Generate Tron Wallet"
2. Enter incorrect PIN
3. **Verify:** Error message displayed
4. **Verify:** Can try again with correct PIN

### Scenario 4: Tron Already Exists
**Expected Behavior:** Cannot generate duplicate Tron wallet

1. User already has Tron wallet
2. **Verify:** No "Generate Tron Wallet" button shown
3. **Verify:** Only Tron address displayed
4. Try calling `/api/wallet/add-tron` directly
5. **Verify:** API returns 409 error "Tron wallet already exists"

### Scenario 5: Send TRX
**Expected Behavior:** Can send native TRX to another address

1. Have some TRX balance
2. Click on TRX asset in Assets page
3. Send modal opens
4. Enter recipient Tron address (starts with 'T')
5. Enter amount (leave 1 TRX for fees)
6. Click Continue → Confirm → Enter PIN
7. **Verify:** Transaction processes
8. **Verify:** Success message with transaction hash
9. **Verify:** Explorer link points to Tronscan
10. **Verify:** Balance updates after transaction

### Scenario 6: Send TRC20 Token (USDT)
**Expected Behavior:** Can send TRC20 tokens

1. Have USDT (TRC20) balance
2. Click on USDT asset
3. Enter recipient and amount
4. Complete transaction with PIN
5. **Verify:** Token transfer succeeds
6. **Verify:** USDT balance updates
7. **Verify:** TRX balance decreases (gas fees)

### Scenario 7: Receive TRX
**Expected Behavior:** Can display QR code for receiving

1. Click on Tron address in wallet grid
2. **Verify:** Receive modal opens
3. **Verify:** QR code displayed with Tron address
4. **Verify:** Can copy address to clipboard
5. **Verify:** "Copied!" message appears

### Scenario 8: Backward Compatibility
**Expected Behavior:** Old users without Tron continue to work

1. User with only 3 wallets (SOL/ETH/BTC)
2. **Verify:** Assets page loads without errors
3. **Verify:** Can send/receive SOL, ETH, BTC
4. **Verify:** Transfer page works
5. **Verify:** Spot trading works
6. **Verify:** No crashes or TypeScript errors

## API Testing

### Test `/api/wallet/setup` (POST)
```bash
# With all 4 wallets (new behavior)
curl -X POST http://localhost:3000/api/wallet/setup \
  -H "Content-Type: application/json" \
  -d '{
    "pinHash": "...",
    "wallets": {
      "solana": { "address": "...", "encryptedPrivateKey": "..." },
      "ethereum": { "address": "...", "encryptedPrivateKey": "..." },
      "bitcoin": { "address": "...", "encryptedPrivateKey": "..." },
      "tron": { "address": "...", "encryptedPrivateKey": "..." }
    }
  }'

# With 3 wallets (backward compatibility)
curl -X POST http://localhost:3000/api/wallet/setup \
  -H "Content-Type: application/json" \
  -d '{
    "pinHash": "...",
    "wallets": {
      "solana": { "address": "...", "encryptedPrivateKey": "..." },
      "ethereum": { "address": "...", "encryptedPrivateKey": "..." },
      "bitcoin": { "address": "...", "encryptedPrivateKey": "..." }
    }
  }'
```

### Test `/api/wallet/add-tron` (POST)
```bash
# Add Tron wallet
curl -X POST http://localhost:3000/api/wallet/add-tron \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "123456",
    "tronWallet": {
      "address": "T...",
      "encryptedPrivateKey": "..."
    }
  }'
```

## Database Verification

### Check MongoDB Document
```javascript
// Should have optional tron field
{
  wallets: {
    solana: { address: "...", encryptedPrivateKey: "..." },
    ethereum: { address: "...", encryptedPrivateKey: "..." },
    bitcoin: { address: "...", encryptedPrivateKey: "..." },
    tron: { address: "...", encryptedPrivateKey: "..." } // Optional
  }
}
```

## UI/UX Checks

### Visual Verification
- [ ] "Generate Tron Wallet" button has gradient background
- [ ] Button has dashed border and hover effect
- [ ] Modal has smooth animations
- [ ] PIN input has proper styling
- [ ] Progress indicator animates smoothly
- [ ] Success checkmark appears
- [ ] Tron logo displays correctly
- [ ] 4-column grid layout maintained
- [ ] Mobile responsive

### Accessibility
- [ ] Modal can be closed with Escape key
- [ ] PIN inputs are keyboard navigable
- [ ] Focus states visible
- [ ] Error messages readable
- [ ] Color contrast sufficient

## Error Scenarios

### Test Error Handling
1. **No TronWeb:** Disable TronWeb script
   - **Expected:** Error message about TronWeb not available
   
2. **Network Error:** Disconnect internet during generation
   - **Expected:** Error message, can retry
   
3. **API Error:** Server returns 500
   - **Expected:** Error step shown, can try again
   
4. **Invalid Address:** Try sending to invalid Tron address
   - **Expected:** Validation error before PIN entry

## Performance Checks
- [ ] Wallet generation completes in < 5 seconds
- [ ] No memory leaks in modal
- [ ] Balance fetching doesn't slow down page
- [ ] Multiple rapid clicks don't cause issues

## Security Checks
- [ ] PIN never logged to console
- [ ] Private keys never exposed in network tab
- [ ] Encrypted keys stored in database
- [ ] PIN verification required for generation
- [ ] Cannot bypass PIN entry

## Browser Compatibility
Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Common Issues & Solutions

### Issue: "TronWeb not available"
**Solution:** Ensure TronWeb script loaded in `src/app/layout.tsx`

### Issue: "Invalid PIN"
**Solution:** Check PIN hash matches in database

### Issue: Tron address not showing
**Solution:** Check wallet context refresh after generation

### Issue: Transaction fails
**Solution:** Ensure sufficient TRX for gas fees

### Issue: Balance not updating
**Solution:** Check TronWeb RPC URL in `.env.local`

## Success Criteria
✅ New users get 4 wallets automatically
✅ Existing users can add Tron wallet separately
✅ PIN verification works correctly
✅ Tron transactions succeed
✅ No TypeScript errors
✅ Backward compatibility maintained
✅ UI is responsive and accessible
✅ Error handling is robust
