# Futures Preview Trade Improvements

## Overview

Enhanced the `FuturesOrderModal` component to provide better user feedback during trade preview calculations and improved error handling.

## Changes Made

### 1. Added Loading State for Preview

**Before:**
- Preview would silently calculate in the background
- No visual feedback during calculation
- Users couldn't tell if preview was loading or failed

**After:**
- Added `isLoadingPreview` state variable
- Shows loading spinner with "Calculating preview..." message
- Clear visual feedback during preview calculation

```typescript
const [isLoadingPreview, setIsLoadingPreview] = useState(false);
```

### 2. Enhanced Error Handling

**Improved error messages:**
- "Please unlock your wallet to preview trades" - for authentication issues
- "Please initialize your Drift account first" - for uninitialized accounts
- Generic error message for other failures

**Error handling flow:**
```typescript
try {
  const preview = await previewTrade(...);
  setPreviewData(preview);
  setError(null);
} catch (error) {
  setPreviewData(null);
  // User-friendly error messages based on error type
  if (errorMessage.includes('not authenticated')) {
    setError('Please unlock your wallet to preview trades');
  } else if (errorMessage.includes('not initialized')) {
    setError('Please initialize your Drift account first');
  } else {
    setError(errorMessage);
  }
} finally {
  setIsLoadingPreview(false);
}
```

### 3. Added Current Market Price Fallback

**Purpose:** Ensure stop-limit validation works even if preview hasn't loaded yet

```typescript
const currentMarketPrice = getMarketPrice(marketIndex, 'perp');

// Use in validation
const currentPrice = previewData?.entryPrice || currentMarketPrice;
```

### 4. Improved Preview Display Logic

**Conditional rendering:**
```typescript
{isLoadingPreview && (
  <div>Loading spinner...</div>
)}

{!isLoadingPreview && previewData && (
  <div>Preview data...</div>
)}
```

This ensures:
- Loading state shows while calculating
- Preview only shows when data is ready
- No flash of empty content

### 5. Better State Management

**Reset logic includes all states:**
```typescript
useEffect(() => {
  if (!isOpen) {
    setSize('');
    setLimitPrice('');
    setTriggerPrice('');
    setLeverage(1);
    setOrderType('market');
    setError(null);
    setSuccessMessage('');
    setPreviewData(null);
    setIsLoadingPreview(false); // ← Added
    setShowQuote(false);
    setPin('');
    setPinError('');
  }
}, [isOpen]);
```

## How Preview Trade Works

### Data Flow

```
User Input (size, leverage) 
    ↓
Debounced (300ms delay)
    ↓
previewTrade() in DriftContext
    ↓
Drift SDK calculations
    ↓
Preview Data returned
    ↓
Display in UI
```

### Preview Calculation Steps

1. **Get Market Data:**
   - Fetch perp market account
   - Get oracle price data
   - Get market constraints (min order size, max leverage)

2. **Calculate Costs:**
   - Notional value = size × oracle price
   - Required margin = notional value ÷ leverage
   - Trading fee = notional value × 0.1%
   - Total required = margin + fee

3. **Check User Balance:**
   - Get free collateral from Drift account
   - Compare with total required
   - Set `marginCheckPassed` flag

4. **Calculate Risk Metrics:**
   - Estimated liquidation price
   - Maintenance margin
   - Funding rate impact

5. **Validate Order Size:**
   - Check against minimum order size
   - Set `sizeTooSmall` flag if below minimum

### Preview Data Structure

```typescript
{
  market: string;              // Market name (e.g., "SOL-PERP")
  side: string;                // "LONG" or "SHORT"
  size: number;                // Position size
  leverage: number;            // Leverage multiplier
  entryPrice: number;          // Current oracle price
  notionalValue: number;       // Total position value
  requiredMargin: number;      // Margin needed
  estimatedFee: number;        // Trading fee
  totalRequired: number;       // Total USDC needed
  userCollateral: number;      // User's total collateral
  freeCollateral: number;      // Available collateral
  marginCheckPassed: boolean;  // Can user afford this?
  estimatedLiquidationPrice: number;  // Liquidation price
  maintenanceMargin: number;   // Minimum margin to maintain
  fundingImpact: number;       // Estimated funding cost
  maxLeverageAllowed: number;  // Max leverage for market
  minOrderSize: number;        // Minimum order size
  sizeTooSmall: boolean;       // Is order too small?
  isPlaceholder: false;
}
```

## User Experience Improvements

### Before
1. User enters size
2. ??? (no feedback)
3. Preview appears (or doesn't)
4. Confusing error messages

### After
1. User enters size
2. "Calculating preview..." shows immediately
3. Preview appears with all details
4. Clear, actionable error messages if something fails

## Testing Checklist

- [ ] Preview shows loading state when calculating
- [ ] Preview displays correctly after calculation
- [ ] Error messages are user-friendly
- [ ] Stop-limit validation works without preview data
- [ ] Modal resets all states when closed
- [ ] Debouncing prevents excessive API calls
- [ ] Preview updates when size changes
- [ ] Preview updates when leverage changes
- [ ] Margin check displays correct status
- [ ] Liquidation price calculates correctly
- [ ] Min order size validation works
- [ ] Max leverage validation works

## Performance Optimizations

1. **Debouncing:** 300ms delay prevents excessive calculations during typing
2. **Conditional Rendering:** Only shows preview when data is ready
3. **Error Boundaries:** Graceful error handling prevents crashes
4. **State Cleanup:** Proper cleanup prevents memory leaks

## Future Enhancements

1. **Real-time Price Updates:** Update preview as market price changes
2. **Slippage Estimation:** Show expected slippage for market orders
3. **Historical Funding Rates:** Display funding rate history
4. **Position Simulator:** Visual chart showing P&L at different prices
5. **Risk Score:** Calculate and display overall risk score
