# Futures Order Preview Fix

## Problem
The futures order modal wasn't showing preview data when users had insufficient funds, making it impossible to see:
- How much margin was required
- How much they were short by
- Entry price and liquidation estimates

## Solution
Updated `FuturesOrderModal.tsx` to:

1. **Always show preview data** - Even when margin check fails, display all calculation details
2. **Visual indicators** - Red border and warning icon when insufficient margin
3. **Detailed shortfall info** - Shows:
   - Total required amount
   - Available collateral
   - Exact shortfall amount
4. **Helpful error messages** - Clear guidance on what to do (deposit more USDC or reduce size)

## Changes Made

### Preview Display Enhancement
- Preview box now has conditional styling (red border when insufficient margin)
- Added "Insufficient Margin" warning banner at top of preview
- Shows "Available" and "Shortfall" rows when margin check fails
- All amounts remain visible for transparency

### Error Handling Improvement
- Preview still calculates and displays even with insufficient funds
- Error message includes icon and helpful guidance
- Suggests actionable solutions (deposit more or reduce size)

## User Experience
Users can now:
- See exactly how much more USDC they need
- Understand the full cost breakdown before depositing
- Make informed decisions about position sizing
- Get clear feedback instead of blank screens
