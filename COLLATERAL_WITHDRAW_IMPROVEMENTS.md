# Collateral Withdrawal Improvements

## Overview
Enhanced the CollateralPanel component to properly consume the Drift collateral withdrawal API with improved UX, detailed transaction tracking, and better error handling.

## Key Improvements

### 1. Two-Step Transaction Tracking
The withdrawal process involves two blockchain transactions:
1. **Drift Withdrawal**: Withdraws USDC from Drift subaccount to master wallet
2. **Transfer to User**: Transfers USDC from master wallet to user's futures wallet

**Implementation:**
```typescript
const driftTx = data.driftWithdrawTx?.slice(0, 8) || 'N/A';
const transferTx = data.transferToUserTx?.slice(0, 8) || 'N/A';

setSuccess(
  `Withdrawing ${amount} USDC...\n` +
  `Step 1: Drift withdrawal (${driftTx}...)\n` +
  `Step 2: Transfer to wallet (${transferTx}...)`
);
```

**User sees:**
```
Withdrawing 10.5 USDC...
Step 1: Drift withdrawal (5x7Hy...)
Step 2: Transfer to wallet (3yKp...)
```

### 2. Post-Action Polling for Confirmation
Automatically polls the Drift account to confirm the withdrawal was successful.

**Features:**
- Checks balance every 1 second for up to 20 seconds
- Confirms when balance decreases by the withdrawal amount
- Shows success message when confirmed
- Shows timeout message if confirmation takes too long
- Allows 1% tolerance for rounding differences

**Implementation:**
```typescript
startPostActionPolling({
  checkCondition: async () => {
    await fetchCollateral();
    const newTotal = collateral?.total || 0;
    return newTotal <= previousTotal - withdrawAmount * 0.99;
  },
  onSuccess: () => {
    setSuccess(`Successfully withdrew ${amount} USDC!`);
    setAmount('');
    setAction(null);
    setProcessing(false);
  },
  onTimeout: () => {
    setSuccess('Withdrawal submitted but taking longer to confirm.');
    setAmount('');
    setAction(null);
    setProcessing(false);
  },
  maxAttempts: 20,
  interval: 1000,
});
```

### 3. Enhanced Error Handling
Specific error messages for different failure scenarios:

**Error Cases:**

#### Insufficient Balance
```typescript
if (collateral && parseFloat(amount) > collateral.available) {
  setError(`Insufficient available collateral. Available: ${collateral.available.toFixed(2)} USDC`);
  return;
}
```
**User sees:** "Insufficient available collateral. Available: 5.00 USDC"

#### No Futures Wallet (404)
```typescript
if (response.status === 404) {
  setError('Futures wallet not found. Please create a futures wallet first.');
}
```

#### Drift Synchronization Issue
```typescript
if (data.error?.includes('not properly loaded')) {
  setError('Temporary synchronization issue. Please try again in a few seconds.');
}
```

#### Network Error
```typescript
catch (err) {
  setError('Network error. Please try again.');
}
```

### 4. Quick Amount Buttons
Added percentage buttons for quick withdrawal amounts:

**Buttons:**
- 25% - Withdraw quarter of available balance
- 50% - Withdraw half of available balance
- 75% - Withdraw three-quarters of available balance
- Max - Withdraw all available balance

**Implementation:**
```tsx
<div className="flex gap-2 mt-2">
  <button onClick={() => setAmount((collateral.available * 0.25).toFixed(2))}>
    25%
  </button>
  <button onClick={() => setAmount((collateral.available * 0.5).toFixed(2))}>
    50%
  </button>
  <button onClick={() => setAmount((collateral.available * 0.75).toFixed(2))}>
    75%
  </button>
  <button onClick={() => setAmount(collateral.available.toFixed(2))}>
    Max
  </button>
</div>
```

### 5. Multi-Line Success Messages
Success messages now support multiple lines for better readability:

**CSS Update:**
```tsx
<p className="text-sm text-success whitespace-pre-line">{success}</p>
```

**Example Message:**
```
Successfully withdrew 10.5 USDC!
Funds transferred to your futures wallet.
Drift TX: 5x7Hy... | Transfer TX: 3yKp...
```

### 6. Contextual Information
Shows helpful info based on current action:

**During Withdrawal:**
```tsx
{action === 'withdraw' && (
  <p className="text-blue-600 dark:text-blue-400 mt-2">
    Withdrawal is a 2-step process: (1) Withdraw from Drift account, (2) Transfer to your futures wallet.
  </p>
)}
```

## API Integration

### Request Format
```typescript
POST /api/drift/collateral/withdraw
Content-Type: application/json

{
  "amount": 10.5
}
```

**Note:** `userId` is automatically added from authentication context.

### Response Format
```typescript
{
  "success": true,
  "driftWithdrawTx": "5x7Hy...abc123",
  "transferToUserTx": "3yKp...def456",
  "subaccountId": 2,
  "amount": 10.5,
  "asset": "USDC",
  "userWallet": "BJ6eSwzef6mHaXf6WvB5bHK6B4fZP4xPf5ky5ZVaE7e8",
  "status": "withdrawn"
}
```

### Error Response Format
```typescript
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## User Experience Flow

### Successful Withdrawal
1. User clicks "Withdraw" button
2. User enters amount or clicks quick amount button (25%, 50%, 75%, Max)
3. User clicks "Withdraw" button in form
4. UI shows "Processing..." state
5. API returns with transaction hashes
6. UI shows "Withdrawing..." with both transaction hashes
7. Background polling starts checking balance
8. Balance decreases (confirmed)
9. UI shows "Successfully withdrew!" with full details
10. Form closes automatically after 8 seconds

### Failed Withdrawal
1. User clicks "Withdraw" button
2. User enters amount
3. User clicks "Withdraw" button in form
4. UI shows "Processing..." state
5. API returns error
6. UI shows specific error message
7. User can correct issue and retry

### Timeout Scenario
1. Withdrawal submitted successfully
2. Polling starts
3. 20 seconds pass without confirmation
4. UI shows "Withdrawal submitted but taking longer to confirm"
5. User can check futures wallet balance manually
6. Form closes automatically after 8 seconds

## Technical Details

### State Management
```typescript
const [processing, setProcessing] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const { isPolling: isConfirmingAction, startPostActionPolling } = usePostActionPolling();
```

### Validation
- Amount must be positive number
- Amount must not exceed available collateral
- Futures wallet must exist
- User must be authenticated

### Polling Configuration
- **Interval**: 1000ms (1 second)
- **Max Attempts**: 20 (20 seconds total)
- **Tolerance**: 1% (allows for rounding differences)
- **Success Condition**: Balance decreased by withdrawal amount

### Transaction Verification
Both transaction hashes can be verified on Solana explorers:
- Solscan: `https://solscan.io/tx/{txHash}`
- Solana Explorer: `https://explorer.solana.com/tx/{txHash}`

## Benefits

1. **Transparency**: Users see both transaction hashes
2. **Confidence**: Auto-confirmation gives users peace of mind
3. **Clarity**: Specific error messages help users resolve issues
4. **Convenience**: Quick amount buttons speed up withdrawals
5. **Reliability**: Polling ensures withdrawal is confirmed
6. **User-Friendly**: Multi-line messages are easier to read

## Testing Checklist

- [x] Withdraw with valid amount
- [x] Withdraw with amount exceeding available balance
- [x] Withdraw with quick amount buttons (25%, 50%, 75%, Max)
- [x] Withdraw shows both transaction hashes
- [x] Post-action polling confirms withdrawal
- [x] Error handling for no futures wallet
- [x] Error handling for insufficient balance
- [x] Error handling for network errors
- [x] Error handling for Drift sync issues
- [x] Success message displays correctly
- [x] Multi-line messages render properly
- [x] Form closes after successful withdrawal
- [x] Timeout scenario handled gracefully

## Files Modified

- `src/components/futures/CollateralPanel.tsx`
  - Updated `handleWithdraw` function
  - Added post-action polling
  - Enhanced error handling
  - Added quick amount buttons
  - Added multi-line success message support
  - Added contextual info for withdrawal process

## Related Documentation

- `DRIFT_IMPLEMENTATION_SUMMARY.md` - Overall Drift integration
- `FUTURES_UX_IMPROVEMENTS.md` - General futures UX improvements
- `LOADING_STATE_FIX.md` - Background polling improvements
- API Guide (provided) - Detailed API specification

## Future Enhancements

1. **Transaction Links**: Make transaction hashes clickable links to Solscan
2. **Withdrawal History**: Show recent withdrawal transactions
3. **Estimated Time**: Show estimated time for withdrawal completion
4. **Gas Fee Display**: Show estimated gas fees before withdrawal
5. **Batch Withdrawals**: Allow withdrawing multiple amounts at once
