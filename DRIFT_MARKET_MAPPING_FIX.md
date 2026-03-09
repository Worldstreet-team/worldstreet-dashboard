# Drift Market Mapping Fix - Order Panels

## Problem
The order panels (OrderPanel.tsx and FuturesOrderModal.tsx) were showing incorrect market information. For example, when the futures page displayed "SUI-PERP", the order panel would show "INJ-PERP" with wrong leverage and preview data.

## Root Cause
The order panels were using `selectedMarket` from the `futuresStore`, which contained stale or incorrect market data. Meanwhile, the futures page was correctly using `selectedMarketIndex` (a number) and the Drift context's market mapping system.

This created a mismatch:
- **Futures Page**: Uses `selectedMarketIndex` → Drift context → Correct market data
- **Order Panels**: Uses `futuresStore.selectedMarket` → Stale data → Wrong market

## Solution
Updated both order panel components to:

1. **Accept `marketIndex` as a prop** instead of reading from futuresStore
2. **Use Drift context's market mapping** directly via `perpMarkets.get(marketIndex)`
3. **Remove dependency on futuresStore** for market selection

### Changes Made

#### 1. OrderPanel.tsx
```typescript
// Before
export const OrderPanel: React.FC = () => {
  const { selectedMarket, markets } = useFuturesStore();
  const { openPosition, previewTrade, getMarketIndexBySymbol } = useDrift();
  
  // Had to convert symbol to index every time
  const marketIndex = getMarketIndexBySymbol(selectedMarket.symbol);
}

// After
interface OrderPanelProps {
  marketIndex: number;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ marketIndex }) => {
  const { openPosition, previewTrade, getMarketName, perpMarkets } = useDrift();
  
  // Get market info directly from Drift context
  const marketInfo = perpMarkets.get(marketIndex);
  const marketName = marketInfo?.symbol || getMarketName(marketIndex);
}
```

#### 2. FuturesOrderModal.tsx
```typescript
// Before
interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: OrderSide;
  onSuccess?: () => void;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen, onClose, side, onSuccess
}) => {
  const { selectedMarket } = useFuturesStore();
  const marketIndex = getMarketIndexBySymbol(selectedMarket.symbol);
}

// After
interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: OrderSide;
  marketIndex: number; // ✅ Added
  onSuccess?: () => void;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen, onClose, side, marketIndex, onSuccess
}) => {
  const { perpMarkets, getMarketName } = useDrift();
  const marketInfo = perpMarkets.get(marketIndex);
  const marketName = marketInfo?.symbol || getMarketName(marketIndex);
}
```

#### 3. Futures Page (page.tsx)
```typescript
// Updated to pass marketIndex prop
<FuturesOrderModal
  isOpen={showOrderModal}
  onClose={() => setShowOrderModal(false)}
  side={orderSide}
  marketIndex={selectedMarketIndex ?? 0} // ✅ Pass the correct index
  onSuccess={() => setShowOrderModal(false)}
/>
```

## How It Works Now

### Market Selection Flow
```
User selects market in UI
    ↓
Futures page updates selectedMarketIndex (number)
    ↓
Passes marketIndex to order panels as prop
    ↓
Order panels use perpMarkets.get(marketIndex)
    ↓
Get correct market info from Drift context
    ↓
Display correct symbol, leverage, and preview data
```

### Market Index Mapping
The Drift context maintains a stable mapping:
```typescript
perpMarkets: Map<number, PerpMarketInfo>
// Example:
// 0 → { symbol: "SOL-PERP", baseAssetSymbol: "SOL", ... }
// 1 → { symbol: "BTC-PERP", baseAssetSymbol: "BTC", ... }
// 2 → { symbol: "ETH-PERP", baseAssetSymbol: "ETH", ... }
```

This mapping is built from on-chain data during Drift client initialization and never changes during the session.

## Benefits

1. **Single Source of Truth**: Market selection is controlled by the parent component (futures page)
2. **No Stale Data**: Order panels always use the current market index
3. **Consistent Mapping**: All components use the same Drift context mapping
4. **Type Safety**: marketIndex is a number, preventing string-based lookup errors
5. **Performance**: Direct Map lookup is faster than symbol-based search

## Testing Checklist

- [x] Select different markets in futures page
- [x] Verify order panel shows correct market name
- [x] Verify preview data matches selected market
- [x] Verify leverage slider shows correct max leverage
- [x] Verify order submission uses correct market
- [x] Test on both desktop and mobile layouts

## Related Files
- `src/components/futures/OrderPanel.tsx`
- `src/components/futures/FuturesOrderModal.tsx`
- `src/app/(DashboardLayout)/futures/page.tsx`
- `src/app/(DashboardLayout)/futures/page.backup.tsx`
- `src/app/context/driftContext.tsx` (market mapping system)

## Notes
- The `futuresStore` is no longer used for market selection in order panels
- Market indices are stable and come from Drift Protocol's on-chain data
- The `perpMarkets` Map is populated during Drift client initialization
- Only subscribed markets (first 10 by default) are available in the Map
