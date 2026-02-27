# Transfer Page Improvements - Main to Futures & Balance Fix

## Overview
Enhanced the transfer page to support direct transfers from main wallet to futures wallet and fixed the futures balance display to show accurate real-time balances.

## New Features

### 1. Main Wallet → Futures Wallet Direct Transfer
Users can now transfer USDT and SOL directly from their main wallet to futures wallet without going through spot wallet first.

**Supported Transfer Directions:**
1. Main Wallet → Spot Wallet (existing)
2. Spot Wallet → Main Wallet (existing)
3. **Main Wallet → Futures Wallet (NEW)**
4. Spot Wallet → Futures Wallet (existing)
5. Futures Wallet → Spot Wallet (existing)
6. **Futures Wallet → Main Wallet (NEW)**

**Transfer Flow:**
- Main → Futures: Uses PIN authentication, sends directly from main wallet to futures wallet address
- Futures → Main: Uses backend API to transfer from futures wallet to main wallet
- Only USDT and SOL supported on Solana network for futures transfers

### 2. Futures Balance Display
Added real-time futures wallet balance display in the transfer page sidebar.

**Features:**
- Shows USDT balance (USDC token on Solana)
- Shows SOL balance (for gas fees)
- Auto-fetches balance when futures wallet is loaded
- Manual refresh button
- Low SOL warning (< 0.01 SOL)
- Displays futures wallet address

**Balance Source:**
- Fetches directly from Solana RPC via `/api/futures/wallet/balance`
- Shows actual on-chain balances, not cached values
- Updates after successful transfers

## Implementation Details

### State Management
```typescript
const [direction, setDirection] = useState<
  'main-to-spot' | 'spot-to-main' | 
  'main-to-futures' | 'spot-to-futures' | 
  'futures-to-spot' | 'futures-to-main'
>('main-to-spot');

const [futuresBalance, setFuturesBalance] = useState<{
  usdc: number;
  sol: number;
} | null>(null);
```

### Balance Fetching
```typescript
const fetchFuturesBalance = async (address?: string) => {
  const walletAddress = address || futuresWalletAddress;
  if (!walletAddress) return;

  const response = await fetch(
    `/api/futures/wallet/balance?address=${encodeURIComponent(walletAddress)}`
  );
  if (response.ok) {
    const data = await response.json();
    setFuturesBalance({
      usdc: data.usdcBalance || 0,
      sol: data.solBalance || 0,
    });
  }
};
```

### Transfer Execution

#### Main → Futures
```typescript
// Uses PIN modal for authentication
// Sends transaction directly from main wallet to futures wallet
// Supports SOL and USDT (USDC token)
// Validates Solana address format
// Refreshes futures balance after transfer
```

#### Futures → Main
```typescript
// Uses backend API endpoint
// Transfers from futures wallet to main wallet
// Supports SOL and USDT
// Refreshes all balances after transfer
```

### UI Components

#### Direction Toggle
- Visual indicator showing current transfer direction
- Click arrows to cycle through all 6 directions
- Auto-adjusts asset selection for futures transfers
- Clear labels: "Main Wallet → Futures Wallet"

#### Futures Balance Card
```tsx
<div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
  <h3>Futures Wallet</h3>
  <p>Solana Only</p>
  
  {/* USDT Balance */}
  <div>USDT: {futuresBalance.usdc.toFixed(6)}</div>
  
  {/* SOL Balance with warning */}
  <div>
    SOL: {futuresBalance.sol.toFixed(6)}
    {futuresBalance.sol < 0.01 && (
      <p>⚠️ Low balance - keep at least 0.01 SOL for gas</p>
    )}
  </div>
</div>
```

## Balance Accuracy Fix

### Problem
The futures balance was showing incorrect values because:
1. It wasn't being fetched from the actual wallet
2. No refresh mechanism after transfers
3. Relied on cached or stale data

### Solution
1. **Direct RPC Fetch**: Queries Solana RPC directly for real-time balance
2. **Auto-Refresh**: Fetches balance when wallet is loaded
3. **Post-Transfer Refresh**: Updates balance after successful transfers
4. **Manual Refresh**: Button to refresh balance on demand

### API Endpoint Used
```
GET /api/futures/wallet/balance?address={walletAddress}

Response:
{
  usdcBalance: number,
  solBalance: number,
  walletAddress: string,
  tokenAccount: string,
  exists: boolean
}
```

## User Experience Improvements

### Clear Direction Indicators
- Prominent banner showing "Main Wallet → Futures Wallet"
- Visual highlighting of source and destination wallets
- Button text shows exact transfer: "Transfer Main → Futures"

### Balance Visibility
- All three wallet balances visible in sidebar:
  - Main Wallet (blue gradient)
  - Spot Wallet (purple gradient)
  - Futures Wallet (orange gradient)
- Real-time balance updates
- Low balance warnings

### Transfer Validation
- Validates futures transfers only support USDT & SOL
- Checks Solana network requirement
- Verifies futures wallet exists
- Shows helpful error messages

### PIN Authentication
- Main → Futures transfers require PIN
- Modal shows clear destination: "to Futures Wallet"
- Secure transaction signing

## Files Modified

### Main Changes
- `src/app/(DashboardLayout)/transfer/page.tsx`
  - Added 2 new transfer directions (main-to-futures, futures-to-main)
  - Added futures balance state and fetching
  - Updated executeMainToSpot to handle both spot and futures destinations
  - Updated executeSpotToMain to handle futures-to-main transfers
  - Added getFuturesBalance helper function
  - Updated UI to show all 6 directions
  - Added Futures Wallet Balance card in sidebar

### API Endpoints Used
- `GET /api/futures/wallet?chain=solana` - Get futures wallet address
- `GET /api/futures/wallet/balance?address={address}` - Get real-time balance
- `POST /api/futures/transfer` - Transfer from futures wallet
- Direct blockchain transactions for main → futures

## Testing Checklist

- [x] Main → Futures transfer with USDT
- [x] Main → Futures transfer with SOL
- [x] Futures → Main transfer
- [x] Futures balance displays correctly
- [x] Balance updates after transfer
- [x] Manual refresh works
- [x] Low SOL warning shows
- [x] PIN modal shows correct destination
- [x] Direction toggle cycles through all 6 options
- [x] Asset validation for futures transfers
- [x] Solana network requirement enforced

## Benefits

1. **Simplified Workflow**: Users can fund futures wallet directly from main wallet
2. **Accurate Balances**: Real-time on-chain balance display
3. **Better UX**: Clear visual indicators of transfer direction
4. **Complete Flexibility**: All 6 transfer directions supported
5. **Safety**: Low SOL warnings prevent failed transactions

## Notes

- Futures transfers only support Solana network
- Only USDT and SOL can be transferred to/from futures
- Minimum 0.01 SOL recommended for gas fees
- Balances are fetched from Solana RPC, not cached
- PIN required for main wallet transfers
