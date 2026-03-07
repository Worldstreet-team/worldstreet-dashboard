# Wallet System Cleanup Checklist

## Overview
Since the system correctly uses a single Solana wallet for all Drift operations, we can remove redundant "spot wallet" and "futures wallet" systems.

## Phase 1: Verify Current State ✅

- [x] Confirmed driftContext uses main Solana wallet
- [x] Verified no separate wallet generation needed
- [x] Checked all trading uses same wallet authority
- [x] Created simplified transfer page

## Phase 2: Remove Redundant APIs

### Files to Remove/Deprecate

#### Spot Wallets API
- [ ] `src/app/api/users/[userId]/spot-wallets/route.ts`
  - **Why**: Not needed - use main wallet
  - **Impact**: Remove spot wallet generation/fetching
  - **Alternative**: Use `/api/wallet/keys` for main wallet

#### Futures Wallet API  
- [ ] `src/app/api/futures/wallet/route.ts`
  - **Why**: Not needed - use main wallet
  - **Impact**: Remove futures wallet generation
  - **Alternative**: Use `/api/wallet/keys` for main wallet

#### Complex Transfer API
- [ ] `src/app/api/transfer/route.ts`
  - **Why**: Overly complex multi-wallet logic
  - **Impact**: Simplify to direct Drift operations
  - **Alternative**: Use Drift deposit/withdraw directly

- [ ] `src/app/api/futures/transfer/route.ts`
  - **Why**: Redundant with Drift operations
  - **Impact**: Remove intermediate transfer logic
  - **Alternative**: Use driftContext methods

## Phase 3: Update Components

### Components to Simplify

#### Transfer Page ✅
- [x] Already simplified to show Drift address
- [x] Direct USDC deposits only
- [x] Removed multi-wallet complexity

#### Collateral Panel
- [ ] `src/components/futures/CollateralPanel.tsx`
  - Update to show it's the same wallet as spot
  - Remove "futures wallet" terminology
  - Show unified balance

#### Wallet Balance Components
- [ ] `src/components/futures/FuturesWalletBalance.tsx`
  - Rename to `TradingWalletBalance.tsx`
  - Show it's shared with spot
  - Remove wallet generation logic

## Phase 4: Update Hooks

### Hooks to Simplify

#### Spot Wallets Hook
- [ ] `src/hooks/useSpotWallets.ts`
  - **Action**: Remove or simplify
  - **Why**: No separate spot wallets needed
  - **Alternative**: Use main wallet from walletContext

#### Futures Trading Hook
- [ ] `src/hooks/useFuturesTrading.ts`
  - Remove wallet generation logic
  - Use driftContext directly
  - Simplify balance fetching

## Phase 5: Database Cleanup

### Models to Remove (if they exist)

- [ ] Check for `SpotWallet` model
  - Remove if exists
  - Clean up references

- [ ] Check for `FuturesWallet` model
  - Remove if exists
  - Clean up references

- [ ] Update `DashboardProfile` model
  - Remove spot wallet fields (if any)
  - Remove futures wallet fields (if any)
  - Keep only main wallets

### Migration Script (if needed)
```typescript
// If you have existing spot/futures wallet records
async function cleanupWalletRecords() {
  // Remove spot wallet records
  await SpotWallet.deleteMany({});
  
  // Remove futures wallet records  
  await FuturesWallet.deleteMany({});
  
  // Clean up profile references
  await DashboardProfile.updateMany(
    {},
    { 
      $unset: { 
        spotWallets: "",
        futuresWallet: "" 
      } 
    }
  );
}
```

## Phase 6: Update Documentation

### Documentation to Update

- [ ] `src/app/(DashboardLayout)/futures/README.md`
  - Clarify single wallet architecture
  - Remove futures wallet generation steps
  - Update deposit/withdraw instructions

- [ ] `src/app/(DashboardLayout)/spot/README.md`
  - Clarify single wallet architecture
  - Remove spot wallet generation steps
  - Update balance display logic

- [ ] `src/app/(DashboardLayout)/transfer/README.md` ✅
  - Already updated with unified wallet concept

## Phase 7: Update UI Messaging

### User-Facing Changes

#### Terminology Updates
- [ ] Replace "Futures Wallet" → "Trading Wallet"
- [ ] Replace "Spot Wallet" → "Trading Wallet"
- [ ] Emphasize "Unified Trading Wallet"
- [ ] Show "Shared Balance" indicators

#### Info Banners
- [ ] Add banner explaining unified wallet
- [ ] Show that spot and futures share balance
- [ ] Clarify deposit/withdraw flow

#### Balance Displays
- [ ] Show single trading wallet balance
- [ ] Indicate it's used for both spot and futures
- [ ] Remove separate wallet sections

## Phase 8: Testing

### Test Cases

- [ ] Test deposit from main wallet to Drift
- [ ] Test spot trading with deposited USDC
- [ ] Test futures trading with same USDC
- [ ] Test withdrawal back to main wallet
- [ ] Test balance updates across spot/futures
- [ ] Test PIN unlock flow
- [ ] Test insufficient balance scenarios

### Edge Cases
- [ ] User with old spot wallet records
- [ ] User with old futures wallet records
- [ ] Migration from old system
- [ ] Multiple browser sessions

## Phase 9: Performance Optimization

### Optimizations

- [ ] Remove redundant wallet fetches
- [ ] Simplify balance queries
- [ ] Cache Drift account data
- [ ] Reduce API calls

## Phase 10: Security Audit

### Security Checks

- [ ] Verify PIN protection still works
- [ ] Check encrypted key handling
- [ ] Audit transaction signing
- [ ] Review withdrawal permissions
- [ ] Test rate limiting

## Implementation Priority

### High Priority (Do First)
1. ✅ Simplify transfer page
2. Remove redundant APIs
3. Update component terminology
4. Add unified wallet messaging

### Medium Priority (Do Soon)
5. Clean up hooks
6. Update documentation
7. Simplify balance displays
8. Test thoroughly

### Low Priority (Do Eventually)
9. Database cleanup
10. Performance optimization
11. Remove old code comments

## Rollout Strategy

### Option A: Big Bang (Recommended)
- Remove all redundant code at once
- Clear migration path
- Less confusion
- Faster to complete

### Option B: Gradual
- Deprecate APIs first
- Update UI gradually
- Keep backward compatibility
- Longer timeline

## Success Metrics

- [ ] Reduced API endpoints (remove 3-4)
- [ ] Simplified codebase (remove 500+ lines)
- [ ] Clearer user experience
- [ ] Faster page loads
- [ ] Fewer support questions

## Risks & Mitigation

### Risk 1: Existing Users
- **Risk**: Users with old wallet records
- **Mitigation**: Migration script + clear messaging

### Risk 2: In-Flight Transactions
- **Risk**: Transactions during migration
- **Mitigation**: Maintenance window + transaction queue

### Risk 3: Code Dependencies
- **Risk**: Unexpected dependencies on old APIs
- **Mitigation**: Thorough grep search + testing

## Conclusion

This cleanup will:
- ✅ Simplify the codebase significantly
- ✅ Improve user experience
- ✅ Reduce maintenance burden
- ✅ Align with Drift Protocol's design
- ✅ Make the system more secure

The unified wallet architecture is the **correct** approach!
