# Futures Trading SOL Requirement

## Overview
Before users can access futures trading features, they must have at least 0.5 SOL in their futures wallet to cover Drift subaccount initialization fees.

## Why SOL is Required

### Drift Subaccount Initialization
- Each user needs a Drift subaccount to trade futures
- Subaccounts must be initialized on the Solana blockchain
- Initialization requires:
  - **Rent-exempt balance**: ~0.035 SOL (~$5-6 at $200/SOL)
  - **Transaction fees**: ~0.000005 SOL (negligible)
  - **Buffer for safety**: Additional SOL for multiple transactions

### Total Requirement
- **Minimum**: 0.5 SOL per user
- **One-time cost**: Only paid during first initialization
- **No recurring fees**: Once initialized, no additional SOL needed

## Implementation

### 1. API Route: `/api/futures/check-sol-balance`

**Purpose**: Check if user's futures wallet has sufficient SOL

**Response**:
```json
{
  "hasWallet": true,
  "hasSufficientSol": false,
  "requiredSol": 0.5,
  "currentSol": 0.0234,
  "shortfall": 0.4766,
  "walletAddress": "ABC123...",
  "message": "Need 0.4766 more SOL for initialization fees"
}
```

### 2. Component: `SolRequirementModal`

**Features**:
- Displays SOL requirement explanation
- Shows current balance vs required
- Provides wallet address for deposits
- Copy-to-clipboard functionality
- Step-by-step instructions
- Refresh button to recheck balance

**UI Elements**:
- Warning icon and header
- Balance comparison table
- Wallet address with copy button
- Numbered instructions
- One-time fee notice
- Action buttons (Check Again, Cancel)

### 3. Futures Page Integration

**Flow**:
1. User navigates to futures page
2. System checks if wallet exists
3. If wallet exists, checks SOL balance
4. If insufficient SOL:
   - Shows warning banner at top
   - Displays modal with instructions
   - Blocks access to trading features
5. User deposits SOL
6. User clicks "Check Balance Again"
7. If sufficient, trading features unlock

## User Experience

### Warning Banner
```
⚠️ SOL Required for Initialization
You need at least 0.5 SOL in your futures wallet to initialize your Drift account.
Current balance: 0.0234 SOL

[Add SOL to Continue]
```

### Modal Display
```
┌─────────────────────────────────────┐
│ ⚠️  SOL Required                    │
│     Initialization Fee              │
├─────────────────────────────────────┤
│                                     │
│ ℹ️  Why do I need SOL?              │
│ Before you can start futures        │
│ trading, your Drift subaccount      │
│ needs to be initialized...          │
│                                     │
│ Required SOL:    0.5000 SOL         │
│ Your Balance:    0.0234 SOL         │
│ Shortfall:       0.4766 SOL         │
│                                     │
│ Send SOL to this address:           │
│ ┌─────────────────────────────┐    │
│ │ ABC123...XYZ789             │ 📋 │
│ └─────────────────────────────┘    │
│                                     │
│ How to send SOL:                    │
│ 1️⃣ Copy the wallet address above    │
│ 2️⃣ Open your Phantom/Solflare       │
│ 3️⃣ Send at least 0.4766 SOL         │
│ 4️⃣ Wait for confirmation            │
│ 5️⃣ Refresh this page                │
│                                     │
│ ⚠️ This is a one-time fee           │
│                                     │
│ [🔄 Check Balance Again]  [Cancel] │
└─────────────────────────────────────┘
```

## Security Considerations

### SOL Storage
- SOL is stored in user's futures wallet
- User controls the private keys (via backend)
- SOL is used only for initialization fees
- Excess SOL remains in wallet for future transactions

### Validation
- Balance checked before any futures operation
- Real-time blockchain query (not cached)
- Prevents failed transactions due to insufficient fees

## Cost Breakdown

### Per User (One-time)
- Subaccount rent: ~0.035 SOL
- Transaction fees: ~0.000005 SOL
- Buffer: ~0.465 SOL (for safety)
- **Total**: 0.5 SOL (~$100 at $200/SOL)

### For Platform
- 100 users: 50 SOL (~$10,000)
- 1,000 users: 500 SOL (~$100,000)
- 10,000 users: 5,000 SOL (~$1,000,000)

## Error Handling

### Insufficient SOL
```typescript
{
  type: 'insufficient_sol',
  message: 'Need 0.4766 more SOL for initialization',
  details: {
    required: 0.5,
    current: 0.0234,
    shortfall: 0.4766
  }
}
```

### Wallet Not Found
```typescript
{
  hasWallet: false,
  message: 'Futures wallet not found. Please create one first.'
}
```

## Testing Checklist

- [ ] Check SOL balance API works
- [ ] Modal displays correctly
- [ ] Warning banner shows when SOL insufficient
- [ ] Copy address button works
- [ ] Refresh button rechecks balance
- [ ] Trading features blocked when SOL insufficient
- [ ] Trading features unlock when SOL sufficient
- [ ] Error messages display properly
- [ ] Works on mobile devices

## Future Enhancements

1. **Auto-refresh**: Automatically recheck balance every 10 seconds
2. **QR Code**: Generate QR code for wallet address
3. **Wallet Connect**: Direct integration with Phantom/Solflare
4. **SOL Purchase**: Link to buy SOL directly
5. **Email Notification**: Alert when SOL received
6. **Progress Indicator**: Show initialization progress
7. **Refund Option**: Return unused SOL to user

## Support

### Common Issues

**Q: Why do I need 0.5 SOL if initialization only costs 0.035 SOL?**
A: The extra SOL provides a buffer for transaction fees and ensures smooth operation. Unused SOL remains in your wallet.

**Q: Is this a recurring fee?**
A: No, this is a one-time initialization fee. Once your account is set up, you won't need to pay again.

**Q: What happens to the SOL after initialization?**
A: The rent (0.035 SOL) is locked in your subaccount. The remaining SOL stays in your wallet for future transaction fees.

**Q: Can I withdraw the SOL later?**
A: Yes, any SOL not used for rent can be withdrawn from your futures wallet at any time.

## Related Files

- `/api/futures/check-sol-balance/route.ts` - Balance check API
- `/components/futures/SolRequirementModal.tsx` - Modal component
- `/app/(DashboardLayout)/futures/page.tsx` - Main futures page
- `DRIFT_INTEGRATION_COMPLETE.md` - Drift integration docs
- `FUTURES_ERROR_HANDLING.md` - Error handling guide
