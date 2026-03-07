# Transfer Page - Unified Trading Wallet

## Overview
The transfer page provides a simple interface for depositing USDC into the unified trading wallet powered by Drift Protocol on Solana.

## Key Features

### 1. Unified Wallet System
- **Single Address**: One Solana address for both Spot and Futures trading
- **Drift Protocol**: Powered by Drift SDK for secure on-chain trading
- **Shared Balance**: USDC balance is accessible from both trading interfaces

### 2. USDC-Only Deposits
- Only USDC (SPL token) deposits are supported
- USDC Mint Address: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Transfers happen on Solana network

### 3. User Experience
- **Clear Address Display**: Shows the Drift wallet address with copy functionality
- **Balance Overview**: Displays both main wallet and trading wallet balances
- **Quick Amount Selection**: 25%, 50%, 75%, and Max buttons
- **PIN Protection**: Requires 6-digit PIN for transfer authorization
- **Real-time Updates**: Automatically refreshes balances after transfer

## Architecture

### Context Integration
```typescript
// Uses Drift Context for wallet info
const { 
  summary,           // Contains publicAddress and totalCollateral
  walletBalance,     // Native SOL balance
  isClientReady,     // Wallet initialization status
  refreshSummary,    // Refresh after transfer
} = useDrift();

// Uses Solana Context for transfers
const { 
  tokenBalances,              // Main wallet USDC balance
  sendTokenTransaction,       // Execute USDC transfer
} = useSolana();
```

### Transfer Flow
1. User enters amount and clicks "Transfer"
2. PIN modal appears for authorization
3. System fetches encrypted private key using PIN
4. USDC transfer executed to Drift wallet address
5. Drift summary refreshed to show updated balance
6. Success message displayed with transaction hash

## Components

### Main Sections
1. **Page Header**: Title and description
2. **Info Banner**: Explains unified wallet concept
3. **Wallet Address Card**: Shows Drift address with copy button
4. **Amount Input**: Transfer amount with quick selection buttons
5. **Balance Overview**: Side panel showing wallet balances
6. **PIN Modal**: Secure transfer authorization

### Balance Display
- **Main Wallet**: Shows USDC and SOL balances from Solana context
- **Trading Wallet**: Shows USDC collateral from Drift context
- **Real-time**: Updates automatically after transfers

## Security

### PIN Protection
- 6-digit PIN required for all transfers
- PIN used to decrypt private key client-side
- No private keys stored in plain text

### Validation
- Checks for sufficient USDC balance
- Validates Drift wallet initialization
- Ensures SOL available for gas fees

## User Guidance

### Info Messages
1. **Unified Wallet Notice**: Explains shared balance concept
2. **Network Warning**: Only send USDC on Solana
3. **Gas Fee Notice**: Requires small amount of SOL
4. **Transaction Fee**: ~0.00001 SOL per transfer

### Error Handling
- Invalid PIN detection
- Insufficient balance warnings
- Network error messages
- Transaction failure handling

## Integration Points

### API Endpoints
- `/api/wallet/keys` - Fetch encrypted private key with PIN

### Context Dependencies
- `driftContext` - Wallet address and balance
- `solanaContext` - USDC transfer execution
- `authContext` - User authentication

## Future Enhancements
- [ ] Support for withdrawals back to main wallet
- [ ] Transaction history display
- [ ] Multiple token support (if Drift adds support)
- [ ] QR code for wallet address
- [ ] Estimated gas fee display

## Notes
- This replaces the complex multi-wallet transfer system
- Simplified to focus on the Drift trading wallet
- Spot and Futures share the same underlying wallet
- All trading happens through Drift Protocol on Solana
