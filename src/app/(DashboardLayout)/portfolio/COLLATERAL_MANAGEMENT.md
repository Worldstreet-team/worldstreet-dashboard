# Collateral Management - Portfolio Page

## Overview
The portfolio page now includes a comprehensive collateral management panel that allows users to deposit and withdraw USDC collateral between their main wallet and Drift trading account.

## Components Added

### 1. CollateralManagementPanel
**Location:** `src/components/futures/CollateralManagementPanel.tsx`

Main panel component that displays:
- Total collateral in Drift account
- Available balance for withdrawal (free collateral)
- Deposit and withdraw action buttons
- Informational guide about the process

### 2. CollateralDepositModal
**Location:** `src/components/futures/CollateralDepositModal.tsx` (already existed)

Modal for depositing USDC:
- Input field for deposit amount
- Shows platform fee breakdown (5% default)
- Displays net collateral after fees
- Real-time transaction status

### 3. CollateralWithdrawModal
**Location:** `src/components/futures/CollateralWithdrawModal.tsx` (newly created)

Modal for withdrawing USDC:
- Input field for withdrawal amount
- MAX button to withdraw all available balance
- Shows available balance
- Validates against free collateral
- Real-time transaction status

## Features

### Deposit Flow
1. User clicks "Deposit Collateral" button
2. Modal opens with amount input
3. Shows fee breakdown:
   - Total amount entered
   - Platform fee (5%)
   - Net collateral to be deposited
4. Submits to `/api/futures/collateral/deposit`
5. Shows success message and auto-closes after 3 seconds
6. Refreshes portfolio summary

### Withdraw Flow
1. User clicks "Withdraw Collateral" button (disabled if no free collateral)
2. Modal opens with amount input and MAX button
3. Validates amount against available balance
4. Submits to `/api/futures/collateral/withdraw`
5. Shows success message and auto-closes after 3 seconds
6. Refreshes portfolio summary

## API Endpoints

### Deposit
- **Endpoint:** `POST /api/futures/collateral/deposit`
- **Body:** `{ amount: number }`
- **Response:** `{ success: boolean, data: { feeAmount, collateralAmount } }`

### Withdraw
- **Endpoint:** `POST /api/futures/collateral/withdraw`
- **Body:** `{ chain: 'solana', amount: number }`
- **Response:** `{ success: boolean, message, amount, txHash }`

## UI/UX Details

### Styling
- Matches Binance-style dark theme (#181a20 background)
- Uses yellow (#fcd535) and green (#0ecb81) accent colors
- Responsive grid layout for mobile and desktop

### User Feedback
- Loading states with spinners
- Success messages in green
- Error messages in red
- Disabled states for invalid actions
- Real-time balance updates

### Validation
- Deposit: Amount must be > 0
- Withdraw: Amount must be > 0 and ≤ free collateral
- Both require sufficient SOL for transaction fees

## Integration

The collateral management panel is integrated into the portfolio page between the account summary cards and the account metrics section. It provides a clear, accessible way for users to manage their trading capital.

## Notes
- Platform fee is configurable (default 5%)
- Only free collateral (not used in positions) can be withdrawn
- All transactions require SOL for network fees
- Automatic refresh of portfolio data after successful operations
