# Futures Binance-Style Layout Implementation

## Summary

I've created a professional Binance-style futures trading interface with proper market symbol handling, orderbook integration, and a clean three-column desktop layout.

## Components Created

### 1. FuturesOrderBook (`src/components/futures/FuturesOrderBook.tsx`)
- Displays live bid/ask depth for selected perp market
- Uses Drift SDK to fetch market prices
- Shows top 20 bids and asks with depth visualization
- Real-time updates every 3 seconds
- Three view modes: both, asks only, bids only
- Displays spread and mark price

### 2. FuturesMarketList (`src/components/futures/FuturesMarketList.tsx`)
- Shows top 10 perp markets from Drift Protocol
- Search functionality
- Sortable by symbol, price, or 24h change
- Favorite markets feature
- Real-time price updates every 5 seconds
- Uses `marketIndex` as stable identifier (NOT symbol)

## Key Fixes Applied

### Market Symbol Stability
**Problem**: Market symbols were changing randomly (TON-PERP → SOL-PERP → weird names) because the code was using unstable SDK fields.

**Solution**:
```typescript
// WRONG - Unstable SDK metadata
id: market.symbol
symbol: market.symbol

// CORRECT - Stable on-chain data
id: `${marketIndex}`  // Use marketIndex as stable ID
symbol: Buffer.from(market.name).toString('utf8').replace(/\0/g, '').trim()
```

### Price Safety
**Problem**: `markPrice.toFixed is not a function` error when price is undefined.

**Solution**:
```typescript
const markPrice = getMarketPrice(marketIndex, 'perp') || 0;  // Fallback to 0
const currentPrice = Number(selectedMarket?.markPrice) || 0;  // Safe conversion
```

## Desktop Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Market Selector | Price Display | Quick Actions    │
├──────────┬──────────────────────────┬──────────────────────┤
│          │                          │                      │
│ Orderbook│       Chart (60%)        │   Market List (50%) │
│  (20%)   │                          │                      │
│          ├──────────────────────────┤                      │
│          │  Positions & Account     │   Account Info (50%)│
│          │       (40%)              │                      │
└──────────┴──────────────────────────┴──────────────────────┘
```

### Left Column (20%): Orderbook
- Live bid/ask depth
- Depth visualization bars
- Spread display
- View mode toggles

### Center Column (50%): Chart + Positions
- Top 60%: TradingView chart
- Bottom 40%: Position panel + Drift account status

### Right Column (30%): Markets + Account
- Top 50%: Market list (top 10 perp markets)
- Bottom 50%: Wallet balance, collateral, risk panels

## Mobile Layout

Unchanged from previous implementation:
- Tab navigation (Chart, Positions, Info)
- Market selector dropdown
- Fixed bottom action buttons (Long/Short)

## Critical Implementation Notes

### 1. Always Use marketIndex as Primary Key
```typescript
// Store state
const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(null);

// NOT this
const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
```

### 2. Derive Symbol from On-Chain Data
```typescript
const marketName = getMarketName(marketIndex);  // Uses on-chain market.name bytes
```

### 3. Limit to Top 10 Markets
```typescript
const topMarkets = Array.from(perpMarkets.entries())
  .sort(([a], [b]) => a - b)
  .slice(0, 10);  // Only first 10
```

### 4. Safe Price Handling
```typescript
const price = getMarketPrice(marketIndex, 'perp') || 0;
const formattedPrice = Number(price).toFixed(2);
```

## Files Modified

1. `src/app/(DashboardLayout)/futures/page.tsx`
   - Removed `useFuturesStore` dependency
   - Changed to use `marketIndex` instead of market objects
   - Added loading state for wallet check
   - Updated mobile and desktop layouts

2. `src/app/context/driftContext.tsx`
   - Already has stable `getMarketName()` that reads from on-chain `market.name`
   - Already has `getMarketPrice()` for oracle prices
   - `perpMarkets` Map uses `marketIndex` as key

## Files Created

1. `src/components/futures/FuturesOrderBook.tsx` - Orderbook component
2. `src/components/futures/FuturesMarketList.tsx` - Market list component

## Next Steps

1. **Integrate Real Drift L2 Orderbook Data**
   - Currently using synthetic orderbook
   - Need to fetch actual L2 data from Drift SDK
   - Use `client.getDLOBOrders()` or similar

2. **Add Market Trades Component**
   - Show recent fills/ticks for selected market
   - Can go in right column below market list

3. **Add 24h Stats**
   - Volume, high, low, funding rate
   - Drift doesn't provide these directly
   - May need to calculate or fetch from external API

4. **Optimize WebSocket Subscriptions**
   - Currently subscribing to first 10 markets only
   - Consider dynamic subscription based on selected market

## Testing Checklist

- [ ] Market selector dropdown works
- [ ] Selecting market updates orderbook
- [ ] Selecting market updates chart
- [ ] Market names stay stable (no random changes)
- [ ] Prices update every 5 seconds
- [ ] No `toFixed is not a function` errors
- [ ] Mobile layout works correctly
- [ ] Desktop three-column layout displays properly
- [ ] Long/Short buttons open order modal
- [ ] Orderbook view modes work (both/asks/bids)

## Color Scheme (Binance Dark)

- Background: `#0a0a0a`, `#0b0e11`
- Panels: `#1e2329`
- Borders: `#2b3139`
- Text: `#ffffff`, `#848e9c` (muted)
- Green (buy): `#0ecb81`
- Red (sell): `#f6465d`
- Yellow (accent): `#f0b90b`

## Performance Considerations

1. **Limit Market Count**: Only show top 10 markets to reduce data load
2. **Polling Intervals**: 
   - Prices: 5 seconds
   - Orderbook: 3 seconds
3. **Memoization**: Use `useMemo` for filtered/sorted lists
4. **Stable Keys**: Always use `marketIndex` for React keys

## Known Limitations

1. **Synthetic Orderbook**: Currently generating fake orderbook data around mark price
2. **No 24h Stats**: Drift doesn't provide volume/change data
3. **No Funding Rate**: Would need to fetch from market account
4. **Limited Markets**: Only showing first 10 perp markets

## Future Enhancements

1. Integrate real Drift DLOB (Decentralized Limit Order Book)
2. Add market depth chart
3. Add funding rate history
4. Add open interest chart
5. Add liquidation heatmap
6. Add market statistics panel
7. Add order history tab
8. Add trade history for selected market
