# USDC Futures Transfer Support

## Overview
Added support for USDC transfers to/from futures wallet in addition to the existing USDT and SOL support.

## Changes Made

### 1. Updated Transfer Validation
**Before:**
```typescript
if (selectedAsset !== 'USDT' && selectedAsset !== 'SOL') {
  setError('Only USDT and SOL can be transferred to/from futures wallet');
  return;
}
```

**After:**
```typescript
if (selectedAsset !== 'USDT' && selectedAsset !== 'USDC' && selectedAsset !== 'SOL') {
  setError('Only USDT, USDC, and SOL can be transferred to/from futures wallet');
  return;
}
```

### 2. Updated Direction Toggle Logic
**Before:**
```typescript
if (selectedAsset !== 'USDT' && selectedAsset !== 'SOL') {
  setSelectedAsset('USDT');
}
```

**After:**
```typescript
if (selectedAsset !== 'USDT' && selectedAsset !== 'USDC' && selectedAsset !== 'SOL') {
  setSelectedAsset('USDT');
}
```

### 3. Updated UI Labels

#### Futures Wallet Badge
**Before:** `USDT & SOL`  
**After:** `USDT, USDC & SOL`

#### Transfer Requirements Info
**Before:** "Only USDT and SOL on Solana network are supported"  
**After:** "Only USDT, USDC, and SOL on Solana network are supported"

### 4. Updated Futures Balance Display
Changed from showing "USDT" to showing "USDC" with a note explaining that USDT and USDC share the same balance:

```tsx
<div className="flex items-center gap-2">
  <img src={ASSET_ICONS['USDC']} alt="USDC" />
  <span>USDC</span>
  <span className="text-xs">SOL</span>
</div>
<span>{(futuresBalance?.usdc || 0).toFixed(6)}</span>
<p className="text-[10px] text-muted">
  USDT and USDC share the same balance
</p>
```

## Technical Details

### Token Information
On Solana, both USDT and USDC are represented by the USDC SPL token:
- **Token Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Symbol**: USDC
- **Decimals**: 6

This means:
- Transferring USDT actually transfers USDC tokens
- Transferring USDC transfers USDC tokens
- Both show the same balance in the futures wallet
- The balance is stored as `futuresBalance.usdc`

### Balance Calculation
The `getFuturesBalance` function already handles both USDT and USDC:

```typescript
const getFuturesBalance = (asset: string): number => {
  if (!futuresBalance) return 0;
  if (asset === 'USDT' || asset === 'USDC') {
    return futuresBalance.usdc; // Both use the same balance
  } else if (asset === 'SOL') {
    return futuresBalance.sol;
  }
  return 0;
};
```

## Supported Transfer Flows

### Main → Futures
- ✅ USDT (Solana)
- ✅ USDC (Solana)
- ✅ SOL

### Spot → Futures
- ✅ USDT (Solana)
- ✅ USDC (Solana)
- ✅ SOL

### Futures → Spot
- ✅ USDT (Solana)
- ✅ USDC (Solana)
- ✅ SOL

### Futures → Main
- ✅ USDT (Solana)
- ✅ USDC (Solana)
- ✅ SOL

## User Experience

### Asset Selection
When a futures transfer direction is selected:
1. If current asset is USDT, USDC, or SOL → Keep it
2. If current asset is ETH → Auto-switch to USDT
3. Chain is automatically set to Solana

### Balance Display
Users will see:
- Main Wallet: Separate USDT and USDC balances (if on different chains)
- Spot Wallet: Separate USDT and USDC balances per chain
- Futures Wallet: Single USDC balance with note "USDT and USDC share the same balance"

### Transfer Process
1. User selects USDC as asset
2. User selects futures transfer direction
3. System validates USDC is supported ✅
4. User enters amount
5. Transfer executes successfully
6. Balance updates in futures wallet

## Benefits

1. **More Flexibility**: Users can transfer either USDT or USDC to futures
2. **User Choice**: Users can choose which stablecoin to transfer
3. **Consistency**: Both stablecoins work the same way
4. **Clarity**: UI clearly shows they share the same balance

## Files Modified

- `src/app/(DashboardLayout)/transfer/page.tsx`
  - Updated validation to include USDC
  - Updated toggleDirection to include USDC
  - Updated UI labels to show USDC support
  - Updated futures balance display
  - Added explanatory note about shared balance

- `TRANSFER_IMPROVEMENTS.md`
  - Updated documentation to reflect USDC support

## Testing Checklist

- [x] USDC validation passes for futures transfers
- [x] USDC can be selected for main-to-futures
- [x] USDC can be selected for spot-to-futures
- [x] USDC can be selected for futures-to-spot
- [x] USDC can be selected for futures-to-main
- [x] UI shows "USDT, USDC & SOL" badge
- [x] Info message mentions USDC
- [x] Futures balance shows USDC with explanatory note
- [x] Balance calculation works for USDC
- [x] No compilation errors

## Important Notes

⚠️ **Backend Compatibility**: Ensure the backend API endpoints support USDC transfers:
- `/api/drift/collateral/deposit` - Should accept USDC
- `/api/drift/collateral/withdraw` - Should handle USDC
- `/api/futures/transfer` - Should support USDC transfers

⚠️ **Token Address**: Both USDT and USDC use the same USDC token on Solana mainnet. The backend should handle this correctly.

## Related Documentation

- `TRANSFER_IMPROVEMENTS.md` - Overall transfer improvements
- `COLLATERAL_WITHDRAW_IMPROVEMENTS.md` - Withdrawal enhancements
- `DRIFT_IMPLEMENTATION_SUMMARY.md` - Drift integration details
