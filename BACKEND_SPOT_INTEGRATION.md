# Backend Spot Trading Integration

## Overview
Integrated the existing backend API (`https://trading.watchup.site`) for spot trading instead of using client-side wallet signing. The backend handles all wallet encryption/decryption, Li.Fi integration, and transaction signing.

## Architecture

### Backend API (https://trading.watchup.site)
The backend provides three main endpoints:

1. **GET /api/users/:userId/balances**
   - Returns real-time blockchain balances via RPC
   - Supports SOL, ETH, TRX, USDT, USDC across multiple chains
   - Handles ATA (Associated Token Account) resolution for Solana

2. **POST /api/quote**
   - Fetches Li.Fi quote for swap
   - Normalizes token addresses and amounts
   - Returns quote with transaction data

3. **POST /api/execute-trade**
   - Signs and submits transaction using encrypted private keys
   - Waits for on-chain confirmation
   - Stores trade in database and updates positions
   - Returns transaction hash and execution details

### Next.js API Routes (Proxy Layer)
Created proxy routes to communicate with backend:

1. **POST /api/spot/quote** → Proxies to backend `/api/quote`
2. **POST /api/spot/execute** → Proxies to backend `/api/execute-trade`
3. **GET /api/spot/balances** → Proxies to backend `/api/users/:userId/balances`

### Frontend Hook
Created `useBackendSpotTrading` hook that:
- Fetches quotes from backend
- Executes swaps via backend
- Handles token address resolution
- Manages loading and error states

## Implementation Details

### Token Address Resolution
The hook maintains TOKEN_META for address resolution:
```typescript
const TOKEN_META = {
  ethereum: {
    ETH: { address: '0x0000...', decimals: 18 },
    USDT: { address: '0xdAC1...', decimals: 6 },
    // ...
  },
  solana: {
    SOL: { address: '11111...', decimals: 9 },
    USDT: { address: 'Es9vM...', decimals: 6 },
    // ...
  },
};
```

### Amount Conversion
Converts human-readable amounts to smallest units:
```typescript
const decimals = fromTokenMeta.decimals;
const [intPart = '0', fracPart = ''] = amount.split('.');
const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
```

### Quote Flow
1. User enters amount and clicks trade button
2. Frontend calls `fetchQuote()` with pair, side, amount, chain
3. Hook resolves token addresses and converts amount
4. Sends request to `/api/spot/quote`
5. Backend fetches Li.Fi quote
6. Quote displayed in confirmation modal

### Execute Flow
1. User confirms trade and enters PIN (not used yet - backend has keys)
2. Frontend calls `executeSwap()` with same parameters
3. Hook sends request to `/api/spot/execute`
4. Backend:
   - Retrieves encrypted private key from database
   - Decrypts key
   - Signs transaction
   - Submits to blockchain
   - Waits for confirmation
   - Stores trade in database
5. Frontend receives transaction hash
6. Saves trade to MongoDB for frontend display
7. Refreshes balances

## Benefits

### Security
- ✅ Private keys never leave the backend
- ✅ All signing happens server-side
- ✅ Encrypted key storage in backend database
- ✅ No client-side key management

### Reliability
- ✅ Backend handles transaction confirmation
- ✅ Automatic retry logic
- ✅ Database transaction tracking
- ✅ Position management

### Simplicity
- ✅ No client-side wallet libraries needed
- ✅ No complex signing logic in frontend
- ✅ Consistent behavior across chains
- ✅ Centralized error handling

## Environment Variables

Add to `.env.local`:
```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=https://trading.watchup.site
```

## API Request/Response Examples

### Quote Request
```json
POST /api/spot/quote
{
  "userId": "user123",
  "fromChain": "SOL",
  "toChain": "SOL",
  "tokenIn": "11111111111111111111111111111111",
  "tokenOut": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "amountIn": "1000000000",
  "slippage": 0.005
}
```

### Quote Response
```json
{
  "toAmount": "100000000",
  "toAmountMin": "99500000",
  "priceImpact": 0.1,
  "gasEstimate": "5000",
  "tool": "jupiter",
  "route": "Jupiter V6",
  "transactionRequest": { ... }
}
```

### Execute Request
```json
POST /api/spot/execute
{
  "userId": "user123",
  "fromChain": "sol",
  "toChain": "sol",
  "tokenIn": "11111111111111111111111111111111",
  "tokenOut": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "amountIn": "1000000000"
}
```

### Execute Response
```json
{
  "status": "COMPLETED",
  "txHash": "5j7s...",
  "fromChain": "sol",
  "toChain": "sol",
  "tokenIn": "SOL",
  "tokenOut": "USDT",
  "amountIn": 1.0,
  "amountOut": 100.0,
  "executionPrice": 100.0,
  "routeProvider": "lifi",
  "tool": "jupiter"
}
```

## Components Updated

### BinanceOrderForm.tsx
- Removed client-side swap context
- Added `useBackendSpotTrading` hook
- Simplified quote and execute logic
- Backend handles all signing

### MobileTradingModal.tsx
- Same updates as BinanceOrderForm
- Mobile-optimized UI maintained

## Trade History

Backend stores trades in its own database (`spot_trades` table).
Frontend also saves to MongoDB (`SpotTrade` model) for display purposes.

Both systems track:
- Transaction hash
- Token addresses and symbols
- Amounts (in/out)
- Execution price
- Chain information
- Status

## Error Handling

### Backend Errors
- Wallet not found
- Insufficient balance
- Li.Fi quote failure
- Transaction failure
- Confirmation timeout

### Frontend Errors
- User not authenticated
- Invalid amount
- Token not supported
- Network errors

All errors are displayed in the UI with user-friendly messages.

## Testing

### Test Quote
```bash
curl -X POST https://trading.watchup.site/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "fromChain": "SOL",
    "tokenIn": "11111111111111111111111111111111",
    "tokenOut": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "amountIn": "1000000000"
  }'
```

### Test Execute
```bash
curl -X POST https://trading.watchup.site/api/execute-trade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "fromChain": "sol",
    "tokenIn": "11111111111111111111111111111111",
    "tokenOut": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "amountIn": "1000000000"
  }'
```

## Migration Notes

### From Client-Side to Backend
- No breaking changes for users
- Same UI and UX
- Improved security and reliability
- Faster execution (no client-side signing delays)

### Backward Compatibility
- Old swapContext still available for other features
- Can run both systems in parallel
- Gradual migration possible

## Future Improvements

1. **PIN Verification**: Add PIN verification in backend execute endpoint
2. **Rate Limiting**: Implement per-user rate limits
3. **Transaction Monitoring**: Real-time status updates via WebSocket
4. **Multi-Chain Support**: Add more chains (Polygon, Arbitrum, etc.)
5. **Advanced Orders**: Limit orders, stop-loss, take-profit
6. **Gas Optimization**: Dynamic gas price estimation
7. **Slippage Control**: User-configurable slippage tolerance

## Troubleshooting

### Quote Fails
- Check backend logs for Li.Fi errors
- Verify token addresses are correct
- Ensure sufficient liquidity

### Execute Fails
- Check user has wallet for the chain
- Verify sufficient balance (including gas)
- Check backend database for encrypted keys
- Review transaction on blockchain explorer

### Balance Not Updating
- Backend caches balances briefly
- Refresh may take a few seconds
- Check RPC endpoint is responding
