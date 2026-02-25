# Futures Wallet Transfer System

## Overview
A complete system to transfer USDT between Spot and Futures wallets on Solana network, with balance monitoring and gas fee warnings.

## Features Implemented

### 1. Transfer Page Updates (`src/app/(DashboardLayout)/transfer/page.tsx`)
- Added two new transfer directions:
  - `spot-to-futures`: Transfer USDT or SOL from Spot wallet to Futures wallet
  - `futures-to-spot`: Transfer USDT or SOL from Futures wallet to Spot wallet
- **Restrictions**:
  - Only USDT and SOL are supported for futures transfers
  - Only Solana network is supported
  - Automatically sets chain to Solana when futures direction is selected
  - Keeps current asset if it's USDT or SOL, otherwise defaults to USDT
- **Validation**:
  - Checks if futures wallet exists before allowing transfer
  - Validates that only USDT or SOL on Solana is being transferred
  - Shows helpful error messages for invalid transfers

### 2. Futures Wallet Balance Component (`src/components/futures/FuturesWalletBalance.tsx`)
- Displays futures wallet balances:
  - USDT balance (for trading)
  - SOL balance (for gas fees)
- **Gas Fee Warning**:
  - Shows red warning if SOL balance < 0.01
  - Reminds users to keep SOL for transaction fees
- **Features**:
  - Refresh button to update balances
  - Copy wallet address to clipboard
  - Auto-refreshes when chain changes

### 3. API Routes

#### `/api/transfer` (`src/app/api/transfer/route.ts`)
- Handles transfers from spot wallet (backend-signed)
- **Supported Directions**:
  - `spot-to-main`: Transfer from spot to main wallet
  - `spot-to-futures`: Transfer from spot to futures wallet
- **Parameters**:
  - `userId`: User identifier (required)
  - `asset`: Asset to transfer (USDT, SOL, etc.)
  - `amount`: Transfer amount (number)
  - `direction`: Transfer direction
  - `destinationAddress`: Target wallet address
- **Backend Integration**:
  - Calls `https://trading.watchup.site/api/transfer`
  - Backend uses spot wallet private key to sign transaction

#### `/api/futures/transfer` (`src/app/api/futures/transfer/route.ts`)
- Handles transfers from futures wallet (backend-signed)
- **Use Case**: Transferring from futures back to spot or main wallet
- **Parameters**:
  - `destinationAddress`: Target wallet address (required)
  - `amount`: Transfer amount as number (required)
- **Backend Integration**:
  - Calls `https://trading.watchup.site/api/futures/wallet/transfer`
  - Passes userId from Clerk authentication
  - Backend uses futures wallet private key to sign transaction
  - Backend determines source automatically based on userId

#### `/api/futures/wallet/balance` (`src/app/api/futures/wallet/balance/route.ts`)
- Fetches futures wallet balance
- **Parameters**: None (uses authenticated userId, chain defaults to solana)
- **Backend Response**: Nested balances object with USDT and SOL
- **Returns** (flattened for frontend):
  - `balance`: USDT balance (primary)
  - `usdtBalance`: USDT balance (alias)
  - `solBalance`: SOL balance for gas fees
  - `walletAddress`: Futures wallet address
  - `tokenAccount`: USDT token account address
  - `exists`: Whether USDT account exists
  - `balances`: Full nested balances object

### 4. UI/UX Improvements

#### Transfer Direction Toggle
- Vertical layout showing all wallet types
- Click arrow to cycle through directions:
  1. Main Wallet ↓
  2. Spot Wallet ↓
  3. Futures Wallet (USDT Only)
- Clear labels indicating current direction

#### Information Alerts
- **Futures Transfer Requirements** (blue info box):
  - Only USDT and SOL on Solana supported
  - Keep at least 0.01 SOL for gas
  - SOL is needed for transaction fees when trading

#### Balance Display
- Shows available balance for source wallet
- Quick amount buttons (25%, 50%, 75%, Max)
- Real-time balance updates after transfers

### 5. Integration with Futures Page
- Added `FuturesWalletBalance` component to futures trading page
- Displays at top of right column (above OrderPanel)
- Shows current wallet balances and gas status
- Helps users monitor their trading capital

## User Flow

### Transferring to Futures Wallet (Spot → Futures)
1. Go to Transfer page
2. Click direction toggle until "Spot → Futures" is shown
3. Select USDT or SOL (system automatically uses Solana)
4. Enter amount (must have USDT/SOL in spot wallet)
5. Click "Transfer to Futures"
6. **Frontend calls `/api/transfer` with direction "spot-to-futures"**
7. Backend executes transfer using spot wallet private key
8. Success message shows transaction hash

### Transferring from Futures Wallet (Futures → Spot)
1. Go to Transfer page
2. Click direction toggle until "Futures → Spot" is shown
3. Select USDT or SOL
4. Enter amount (must have USDT/SOL in futures wallet)
5. Click "Transfer to Spot"
6. **Frontend calls `/api/futures/transfer` with destination address**
7. Backend executes transfer using futures wallet private key
8. Success message shows transaction hash

## Important Notes

### Gas Fees
- **Always keep at least 0.01 SOL in futures wallet**
- SOL is needed for:
  - Opening/closing positions
  - Transferring USDT
  - Any on-chain transactions
- Warning shown if SOL balance is low

### Supported Assets
- **Futures wallet transfers**: USDT and SOL only
- **Network**: Solana only
- **Trading collateral**: USDC (managed separately via collateral endpoints)
- **Why?**: 
  - USDT is held in the futures wallet for deposits/withdrawals
  - SOL is needed for transaction fees (gas)
  - USDC is used as collateral on Drift Protocol for trading

### If You Don't Have USDT or SOL
1. Go to Swap page
2. Swap any token to USDT or SOL on Solana
3. Transfer from main to spot wallet
4. Then transfer from spot to futures wallet

## Backend Requirements

The backend implements these endpoints:

### POST `/api/transfer`
**Used for**: Spot to Main and Spot to Futures transfers

**Request:**
```json
{
  "userId": "string",
  "asset": "string",
  "amount": number,
  "direction": "spot-to-main" | "spot-to-futures",
  "destinationAddress": "string"
}
```

**Response:**
```json
{
  "message": "Transfer completed successfully",
  "txHash": "string"
}
```

**Notes:**
- Backend uses spot wallet private key to sign transaction
- Supports both main wallet and futures wallet as destinations

### POST `/api/futures/wallet/transfer`
**Used for**: Futures to Spot (or any destination) transfers

**Request:**
```json
{
  "userId": "string",
  "destinationAddress": "string",
  "amount": "string"
}
```

**Response:**
```json
{
  "message": "Transfer completed successfully",
  "txHash": "string",
  "explorerUrl": "string",
  "amount": "string",
  "from": "string",
  "to": "string"
}
```

**Notes:**
- Backend uses futures wallet private key to sign transaction
- Amount is sent as string for precision
- Backend determines source wallet automatically based on userId

### GET `/api/futures/wallet/balance?userId={userId}&chain=solana`
**Response:**
```json
{
  "userId": "string",
  "chain": "solana",
  "walletAddress": "string",
  "balances": {
    "USDT": {
      "balance": number,
      "decimals": 6,
      "tokenAccount": "string",
      "exists": boolean
    },
    "SOL": {
      "balance": number,
      "decimals": 9,
      "exists": boolean
    }
  }
}
```

**Notes:**
- Uses userId and chain parameters
- Returns nested balances object with USDT and SOL
- Includes token account addresses and decimals
- Frontend API route flattens this for easier consumption

## Files Created/Modified

### New Files
- `src/app/api/futures/transfer/route.ts`
- `src/app/api/futures/wallet/balance/route.ts`
- `src/components/futures/FuturesWalletBalance.tsx`
- `FUTURES_WALLET_TRANSFER_GUIDE.md`

### Modified Files
- `src/app/(DashboardLayout)/transfer/page.tsx`
- `src/app/(DashboardLayout)/futures/page.tsx`
- `src/components/futures/index.ts`

## Testing Checklist

- [ ] Transfer USDT from spot to futures wallet
- [ ] Transfer SOL from spot to futures wallet
- [ ] Transfer USDT from futures to spot wallet
- [ ] Transfer SOL from futures to spot wallet
- [ ] Verify balances update after transfer
- [ ] Check gas warning appears when SOL < 0.01
- [ ] Verify only USDT and SOL can be selected for futures transfers
- [ ] Verify only Solana network is used
- [ ] Test error handling (insufficient balance, no wallet, etc.)
- [ ] Verify transaction hashes are displayed
- [ ] Check balance refresh button works
- [ ] Test copy address to clipboard

## Implementation Status

✅ **COMPLETED** - All components updated with proper routing logic:
- **Spot → Futures**: Uses `/api/transfer` route with spot wallet signing
- **Futures → Spot**: Uses `/api/futures/transfer` route with futures wallet signing
- API routes properly configured for their respective directions
- Balance endpoint uses userId instead of address
- Frontend components properly integrated with backend
- Error handling and validation in place

## Summary

The system provides a complete workflow for managing USDT and SOL between spot and futures wallets, with proper validation, gas fee monitoring, and user-friendly error messages. The implementation uses the correct API routes based on transfer direction:
- **Spot → Futures**: Uses `/api/transfer` (spot wallet signs the transaction)
- **Futures → Spot**: Uses `/api/futures/transfer` (futures wallet signs the transaction)

Both USDT (for trading collateral) and SOL (for gas fees) can be transferred to ensure users have everything they need for futures trading.
