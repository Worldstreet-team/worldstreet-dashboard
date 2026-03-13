# Sui Balance Implementation

## Overview
This document outlines the implementation of Sui balance fetching and transaction sending functionality for the wallet system.

## Components Added/Updated

### 1. Sui Balance API Endpoint (`/api/sui/balance`)

**File:** `src/app/api/sui/balance/route.ts`

**Features:**
- Fetches SUI balance for any Sui address
- Validates Sui address format (0x + 64 hex characters)
- Uses Sui RPC to get balance information
- Converts MIST to SUI (1 SUI = 10^9 MIST)
- Comprehensive error handling

**Usage:**
```
GET /api/sui/balance?address=0x1234...
```

**Response:**
```json
{
  "success": true,
  "address": "0x1234...",
  "balance": 1.5,
  "balanceInMist": "1500000000",
  "coinType": "0x2::sui::SUI"
}
```

### 2. Updated Sui Context (`suiContext.tsx`)

**Changes:**
- Implemented `fetchBalance` function to call the balance API
- Added `sendTransaction` function for SUI transfers
- Added proper error handling and loading states
- Automatic balance fetching when address changes
- Logging for debugging

**Features:**
- Real-time balance updates
- SUI transaction sending via Privy API
- Loading state management
- Error handling with fallback to 0 balance
- Automatic refresh when address changes
- Balance refresh after successful transactions

### 3. Enhanced Sui Library (`src/lib/privy/sui.ts`)

**New Functions:**
- `getSuiBalance(address)` - Direct balance fetching by address
- `getSuiBalanceByWalletId(walletId)` - Balance fetching by Privy wallet ID

**Features:**
- Direct RPC communication
- Proper error handling
- MIST to SUI conversion
- Support for both address and wallet ID queries

### 4. Updated SendModal Component

**Changes:**
- Added SUI support to the send functionality
- Integrated with SUI context for transaction sending
- Proper error handling for SUI transactions
- Support for native SUI transfers (tokens not yet supported)

### 5. Environment Configuration

**Added:**
```env
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

**RPC Endpoints:**
- **Mainnet:** `https://fullnode.mainnet.sui.io:443`
- **Testnet:** `https://fullnode.testnet.sui.io:443`
- **Devnet:** `https://fullnode.devnet.sui.io:443`

## Sui RPC Methods Used

### `suix_getBalance`
- **Purpose:** Get balance for a specific coin type at an address
- **Parameters:** 
  - `address`: Sui address (0x + 64 hex chars)
  - `coin_type`: Coin type identifier (e.g., "0x2::sui::SUI")
- **Returns:** Balance information including total balance in MIST

## Technical Details

### Address Validation
```typescript
// Sui addresses are 0x followed by exactly 64 hexadecimal characters
const isValidSuiAddress = /^0x[a-fA-F0-9]{64}$/.test(address);
```

### Balance Conversion
```typescript
// Convert MIST to SUI (1 SUI = 10^9 MIST)
const balanceInSui = parseFloat(balanceInMist) / 1e9;
```

### Error Handling
- Network errors (RPC unavailable)
- Invalid address format
- RPC errors (invalid parameters, etc.)
- Parsing errors

## Usage Examples

### In React Components
```typescript
import { useSui } from '@/app/context/suiContext';

function MyComponent() {
  const { address, balance, loading, fetchBalance } = useSui();
  
  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {loading ? 'Loading...' : `${balance} SUI`}</p>
      <button onClick={() => fetchBalance()}>Refresh</button>
    </div>
  );
}
```

### Direct API Call
```typescript
const response = await fetch('/api/sui/balance?address=0x1234...');
const data = await response.json();
console.log('Balance:', data.balance, 'SUI');
```

### Using Sui Library
```typescript
import { getSuiBalance } from '@/lib/privy/sui';

const balanceInfo = await getSuiBalance('0x1234...');
console.log('Balance:', balanceInfo.balance, 'SUI');
```

## Security Considerations

1. **Address Validation:** All addresses are validated before RPC calls
2. **Error Handling:** Sensitive error information is not exposed to clients
3. **Rate Limiting:** Consider implementing rate limiting for the balance API
4. **RPC Security:** Use secure RPC endpoints and consider API keys for production

## Performance Optimizations

1. **Caching:** Consider implementing balance caching to reduce RPC calls
2. **Debouncing:** Implement debouncing for frequent balance requests
3. **Error Recovery:** Automatic retry logic for failed RPC calls
4. **Connection Pooling:** Reuse HTTP connections for RPC calls

## Future Enhancements

1. **Multi-Coin Support:** Extend to support other Sui tokens beyond native SUI
2. **Real-time Updates:** Implement WebSocket connections for real-time balance updates
3. **Historical Data:** Add support for balance history and transaction tracking
4. **Batch Requests:** Support fetching balances for multiple addresses in one call

## Troubleshooting

### Common Issues

1. **Invalid Address Format**
   - Ensure address starts with "0x" and has exactly 64 hex characters
   - Check for typos or missing characters

2. **RPC Connection Errors**
   - Verify `NEXT_PUBLIC_SUI_RPC_URL` is set correctly
   - Check network connectivity
   - Ensure RPC endpoint is accessible

3. **Balance Shows as 0**
   - Verify the address has SUI tokens
   - Check if using correct network (mainnet/testnet)
   - Ensure RPC is returning valid data

### Debug Steps

1. Check browser console for error messages
2. Verify environment variables are loaded
3. Test RPC endpoint directly with curl/Postman
4. Check network tab for failed API requests