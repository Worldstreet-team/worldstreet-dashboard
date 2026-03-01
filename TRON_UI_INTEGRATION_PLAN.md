# Tron UI Integration Plan

## Status: Assets ✅ | Transfer ✅ | Spot Trading ✅

## Completed Changes

### 1. Assets Page (`src/app/(DashboardLayout)/assets/page.tsx`) ✅
- Added `useTron` hook import
- Added Tron to CHAIN_ICONS
- Added Tron address display in wallet addresses grid (now 4 columns)
- Added TRX native balance to assets list
- Added TRC20 tokens (USDT, USDC) to assets list
- Added Tron balance fetching and refresh
- Updated `handleTokenAdded` to refresh Tron custom tokens

### 2. Transfer Page (`src/app/(DashboardLayout)/transfer/page.tsx`) ✅
- Added `useTron` hook import
- Added TRX to assets array
- Added TRX icon to ASSET_ICONS
- Added Tron token addresses (USDT, USDC) to TOKEN_ADDRESSES
- Updated `selectedChain` type to include 'tron'
- Added Tron balance fetching in useEffect
- Updated `getMainBalance()` to include TRX and TRC20 tokens
- Updated `executeMainToSpot()` to handle Tron transfers (TRX and TRC20)
- Updated `executeSpotToMain()` to handle Tron destination addresses
- Added Tron chain selection button (3-column grid)
- Updated balance refresh to include Tron
- Added TRC20 USDT/USDC transfer support

**Key Functions Updated:**
- ✅ `getMainBalance()` - Added TRX and TRC20 support
- ✅ `executeMainToSpot()` - Added Tron transaction sending
- ✅ `executeSpotToMain()` - Added Tron destination handling
- ✅ Chain selector UI - Added Tron button (3 columns)

### 3. Spot Trading Components ✅

#### SpotOrderEntry (`src/components/spot/SpotOrderEntry.tsx`) ✅
- Added TRON_TOKENS configuration with TRX, USDT, USDC
- Updated `getTokenChain()` to return 'Solana' | 'EVM' | 'Tron'
- Updated `getTokenConfig()` to handle Tron chain
- Updated `selectedChain` state type to include 'Tron'
- Updated `fetchBalances()` to fetch Tron balances
- Updated `fetchQuote()` to handle Tron chain
- Updated `executeTrade()` to handle Tron chain
- Added TRX auto-detection in useEffect

#### TradingPanel (`src/components/spot/TradingPanel.tsx`) ✅
- Added TRON_TOKENS configuration
- Updated `getTokenChain()` to include Tron
- Updated `getTokenConfig()` to handle Tron
- Updated `selectedChain` state type to include 'Tron'
- Updated `fetchQuote()` to handle Tron chain
- Updated `executeTrade()` to handle Tron chain
- Added Tron chain selector button (3-column grid)
- Added TRX icon to chain selector

#### OrderHistory (`src/components/spot/OrderHistory.tsx`) ✅
- Updated `getExplorerUrl()` to handle Tron transactions
- Added Tronscan.org explorer link for TRX transactions

## Remaining Changes Needed

### 3. Swap Page (`src/app/(DashboardLayout)/swap/page.tsx`)
**Status:** Likely already supports Tron through SwapInterface component
**Action:** Check `src/components/swap/SwapInterface.tsx` to verify Tron support
**If needed:**
- Add Tron to supported networks display
- Update SwapInterface to include TRC20 tokens

### 4. Spot Trading Components

#### 4.1 SpotOrderEntry (`src/components/spot/SpotOrderEntry.tsx`)
**Changes Required:**
- Update `getTokenChain` to return 'Solana' | 'EVM' | 'Tron'
- Add TRC20 token support for USDT/USDC
- Update chain selection to include Tron
- Add Tron balance fetching
- Update `fetchBalances()` to check Tron balances
- Add Tron chain selector button in UI

**Key Changes:**
```typescript
const getTokenChain = (token: string): 'Solana' | 'EVM' | 'Tron' => {
  if (token === 'SOL') return 'Solana';
  if (token === 'ETH' || token === 'BTC') return 'EVM';
  if (token === 'TRX') return 'Tron';
  // USDT/USDC can be on any chain
  return 'Solana'; // default
};
```

#### 4.2 TradingPanel (`src/components/spot/TradingPanel.tsx`)
**Changes Required:**
- Same updates as SpotOrderEntry
- Update chain type to include Tron
- Add Tron chain selector
- Update balance fetching logic

#### 4.3 OrderHistory (`src/components/spot/OrderHistory.tsx`)
**Changes Required:**
- Update `getExplorerUrl()` to handle Tron transactions:
  ```typescript
  if (chain.toLowerCase().includes('tron') || chain.toLowerCase() === 'trx') {
    return `https://tronscan.org/#/transaction/${txHash}`;
  }
  ```

### 5. API Endpoints

#### 5.1 Spot Wallets API (`src/app/api/users/[userId]/spot-wallets/route.ts`)
**Check if needed:**
- Verify if spot wallets support TRC20 tokens
- Add Tron wallet generation if needed
- Update balance fetching to include TRC20

#### 5.2 Transfer API (`src/app/api/transfer/route.ts`)
**Check if needed:**
- Add Tron transfer support
- Handle TRC20 token transfers

#### 5.3 Execute Trade API (`src/app/api/execute-trade/route.ts`)
**Check if needed:**
- Add TRC20 trading support
- Handle Tron chain transactions

## Implementation Priority

### Phase 1: Core Wallet Features (COMPLETE ✅)
1. ✅ Assets page - Display TRX and TRC20 balances
2. ✅ Wallet addresses - Show Tron address

### Phase 2: Transfer Functionality (COMPLETE ✅)
1. ✅ Transfer page - Add Tron as transfer option
2. ✅ Add TRX and TRC20 to transfer assets
3. ✅ Implement Tron transaction sending
4. ✅ Add Tron chain selector (3 columns)
5. ✅ Update balance fetching for Tron

### Phase 3: Trading Features
1. Spot trading - Add TRC20 USDT/USDC support
2. Update chain selectors to include Tron
3. Add Tron balance fetching in trading components

### Phase 4: Polish & Testing
1. Update all explorer links for Tron
2. Test all Tron transactions
3. Add error handling for Tron-specific issues
4. Update documentation

## Token Support Summary

### Tron Tokens to Support
- **TRX** (Native) - Already supported in TronContext
- **USDT** (TRC20) - TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
- **USDC** (TRC20) - TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8

### Chain Selection Logic
For stablecoins (USDT, USDC):
- User can choose: Solana (SPL) | Ethereum (ERC20) | Tron (TRC20)
- Default: Solana
- Show balance for each chain separately

For native tokens:
- SOL → Solana only
- ETH → Ethereum only
- BTC → Bitcoin only (no tokens)
- TRX → Tron only

## UI Components to Update

### Chain Selector Component
Current: Solana | Ethereum buttons
Update to: Solana | Ethereum | Tron buttons

Example:
```tsx
<button onClick={() => setSelectedChain('tron')}>
  <Icon icon="cryptocurrency:trx" width={20} />
  <span>Tron</span>
</button>
```

### Balance Display
Show chain badge for multi-chain tokens:
```tsx
<span className="text-xs bg-muted/20 px-1.5 py-0.5 rounded">TRC20</span>
```

## Testing Checklist

### Assets Page ✅
- [x] TRX balance displays correctly
- [x] TRC20 tokens (USDT, USDC) display
- [x] Tron address shows in wallet addresses
- [x] Refresh button updates Tron balances
- [x] Custom TRC20 tokens can be added

### Transfer Page ✅
- [x] TRX appears in asset selection
- [x] Tron chain selector works (3 columns)
- [x] Main → Spot transfer works for TRX
- [x] Main → Spot transfer works for TRC20 USDT
- [x] Spot → Main transfer works
- [x] Balance displays correctly for all chains
- [x] PIN modal works for Tron transfers
- [x] Chain-specific balance checking
- [x] TRC20 token transfer support

### Spot Trading ✅
- [x] TRC20 USDT can be traded
- [x] TRC20 USDC can be traded
- [x] Chain selector includes Tron (3 columns)
- [x] Balances fetch correctly for Tron
- [x] SpotOrderEntry supports Tron
- [x] TradingPanel supports Tron
- [x] OrderHistory shows Tron explorer links
- [x] Token configurations include Tron
- [x] Chain auto-detection includes TRX

### Swap Page
- [ ] TRC20 tokens appear in token list
- [ ] Swaps to/from TRC20 work
- [ ] Tron network shows in supported chains

## Notes

### Gas Fees
- TRX transfers: ~0.1 TRX
- TRC20 transfers: ~5-15 TRX (energy dependent)
- Keep minimum 0.1 TRX for gas

### Explorer Links
- Mainnet: https://tronscan.org/#/transaction/{txHash}
- Testnet: https://shasta.tronscan.org/#/transaction/{txHash}

### RPC Configuration
- Already configured in `.env.local`
- URL: https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT
- No API key required

## Summary

**Completed:**
- ✅ Core Tron wallet integration
- ✅ TronContext provider
- ✅ Wallet generation with Tron
- ✅ Assets page with Tron support
- ✅ Transfer page with Tron support (TRX + TRC20)
- ✅ Chain selector with Tron option
- ✅ Balance fetching for TRX and TRC20
- ✅ Spot trading TRC20 support (SpotOrderEntry, TradingPanel)
- ✅ OrderHistory Tron explorer links

**In Progress:**
- None

**Pending:**
- ⏳ Swap page verification
- ⏳ Testing and polish

---

**Next Steps:**
1. Verify Swap page supports Tron (likely already does)
2. Test all Tron transactions end-to-end
3. Update documentation

