# Tron Chain Swap

A production-ready swap interface for exchanging TRX ⇄ USDT on the Tron network using JustSwap liquidity pools.

## Overview

This feature allows users to swap between native TRX and TRC20 USDT tokens directly on the Tron blockchain. All swaps are executed through a hardcoded JustSwap liquidity pool contract for security and reliability.

## Architecture

### Components

- **Page**: `/tron-swap/page.tsx` - Main swap interface
- **Services**:
  - `quote.service.ts` - Fetches swap quotes from JustSwap pool
  - `swap.service.ts` - Executes swap transactions
  - `wallet.service.ts` - Handles private key decryption

### Key Features

1. **Hardcoded Pool Address**: `TPavNqt8xhoBp4NNBSdEx3FBP24NBfVRxU`
   - No dynamic pool fetching
   - Guaranteed consistency
   - Reduced attack surface

2. **Supported Pairs**:
   - TRX → USDT
   - USDT → TRX
   - Automatic token switching

3. **Security**:
   - Client-side signing only
   - PIN-encrypted private keys
   - Keys cleared from memory after use
   - No backend signing

4. **User Experience**:
   - Real-time quote updates (500ms debounce)
   - Configurable slippage (0.5%, 1%, 2%, 5%)
   - Balance validation
   - Transaction status tracking
   - TronScan explorer links

## Technical Implementation

### Quote Fetching

Quotes are fetched using JustSwap pool contract methods:

```typescript
// TRX → USDT
getTrxToTokenInputPrice(uint256 trx_sold) → uint256 usdt_out

// USDT → TRX
getTokenToTrxInputPrice(uint256 tokens_sold) → uint256 trx_out
```

These are read-only calls that don't require signing.

### Swap Execution

#### TRX → USDT

```typescript
trxToTokenSwapInput(min_tokens, deadline)
```

- Includes `callValue` (TRX amount)
- Fee limit: 100 TRX
- Deadline: 10 minutes from execution

#### USDT → TRX

```typescript
tokenToTrxSwapInput(tokens_sold, min_trx, deadline)
```

- Requires USDT approval first
- Checks allowance before swap
- Auto-approves if insufficient
- Fee limit: 100 TRX (50 TRX for approval)

### Decimal Handling

Both TRX and USDT use 6 decimals on Tron:

```typescript
// Convert to base units
const baseUnits = amount * 1_000_000;

// Convert from base units
const displayAmount = baseUnits / 1_000_000;
```

### Slippage Protection

Minimum output is calculated with slippage tolerance:

```typescript
const minimumOutput = expectedOutput * (1 - slippage / 100);
```

Default slippage: 1%

### Validation Rules

Before swap execution:

1. **Wallet Check**: Tron wallet must be generated
2. **Balance Check**: Sufficient token balance
3. **Fee Check**: Sufficient TRX for transaction fees
4. **Amount Check**: Amount > 0 and ≤ balance
5. **PIN Check**: Valid PIN format (4-20 characters)

### Error Handling

User-friendly error messages for:

- Insufficient balance
- Insufficient energy
- Slippage exceeded
- Network failures
- Invalid PIN
- Transaction reverts

## Usage Flow

1. **Select Direction**: Choose TRX → USDT or USDT → TRX
2. **Enter Amount**: Input swap amount (or click "Max")
3. **Review Quote**: Check estimated output and slippage
4. **Adjust Slippage** (optional): Change tolerance if needed
5. **Click Swap**: Opens PIN confirmation modal
6. **Enter PIN**: Confirm transaction with wallet PIN
7. **Wait for Confirmation**: Transaction processes on-chain
8. **View Result**: Success message with TronScan link

## Security Considerations

### Private Key Handling

- Keys are encrypted with user's PIN
- Decryption happens in memory only
- Keys are cleared after transaction
- No logging of sensitive data
- No backend storage of decrypted keys

### Transaction Safety

- Slippage protection on all swaps
- Deadline enforcement (10 minutes)
- Balance validation before execution
- Fee limit caps to prevent excessive costs

### Network Configuration

Uses environment variable for RPC:

```env
NEXT_PUBLIC_TRON_RPC=https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN  # Testnet
# or
NEXT_PUBLIC_TRON_RPC=https://api.trongrid.io  # Mainnet
```

## Contract Addresses

### JustSwap Pool
- **Address**: `TPavNqt8xhoBp4NNBSdEx3FBP24NBfVRxU`
- **Network**: Tron Mainnet
- **Pair**: TRX/USDT

### USDT Token
- **Address**: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- **Decimals**: 6
- **Standard**: TRC20

## Performance

- **Quote Refresh**: 500ms debounce
- **Balance Refresh**: After successful swap (3s delay)
- **Transaction Timeout**: None (waits for confirmation)
- **Fee Limit**: 100 TRX max per transaction

## Future Enhancements

Potential improvements:

1. Multi-pool support
2. Price impact warnings for large trades
3. Transaction history
4. Advanced order types (limit orders)
5. Gas optimization suggestions
6. Multi-hop routing for better prices

## Troubleshooting

### "Insufficient energy" Error

User needs more TRX for transaction fees. Recommend:
- Keep at least 50-100 TRX for fees
- Consider staking TRX for energy

### "Swap reverted" Error

Possible causes:
- Slippage too low (increase tolerance)
- Pool liquidity changed
- Price moved significantly

### "Tron wallet not found" Error

User needs to generate a Tron wallet first:
1. Go to Assets page
2. Click "Generate Tron Wallet"
3. Set up PIN
4. Return to swap page

## Testing

### Testnet Testing

1. Set `NEXT_PUBLIC_TRON_RPC` to Shasta testnet
2. Get test TRX from faucet
3. Test swaps with small amounts
4. Verify transactions on Shasta TronScan

### Mainnet Testing

1. Start with small amounts
2. Verify quotes match expected rates
3. Check transaction fees
4. Confirm balances update correctly

## Support

For issues or questions:
- Check transaction on TronScan
- Verify wallet has sufficient TRX for fees
- Ensure network connection is stable
- Contact support with transaction hash if needed
