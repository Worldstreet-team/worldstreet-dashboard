# Futures Page - Order Book & Market List Integration

## Problem
The futures page desktop layout was missing:
- Order book display
- Market list for switching between markets
- Market trades (optional)

The layout only showed the chart and account panels, making it difficult to see market depth and switch markets.

## Solution
Updated the futures page to use a **three-column trading layout** similar to professional trading platforms:

### New Desktop Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Header (Market Selector)                  │
├──────────┬────────────────────────────┬─────────────────────┤
│          │                            │                     │
│  Market  │                            │   Order Book       │
│  List    │         Chart              │   (60%)            │
│  (20%)   │         (50%)              ├─────────────────────┤
│          │                            │   Quick Actions    │
│          │                            │   & Account Info   │
│          │                            │   (40%)            │
└──────────┴────────────────────────────┴─────────────────────┘
```

### Column Breakdown

#### Left Column (20%) - Market List
- **Component**: `BinanceMarketList`
- **Purpose**: Browse and switch between different perp markets
- **Features**:
  - Search markets
  - Filter by quote asset (USDT, BTC, ETH)
  - Sort by price, change, or pair name
  - Favorites system
  - Shows price and 24h change
  - Pagination for large market lists

#### Center Column (50%) - Chart
- **Component**: `FuturesChart`
- **Purpose**: Price chart with technical analysis
- **Features**:
  - TradingView integration
  - Multiple timeframes
  - Technical indicators
  - Drawing tools

#### Right Column (30%) - Order Book & Actions
Split into two sections:

**Top Section (60%)** - Order Book
- **Component**: `BinanceOrderBook`
- **Purpose**: Real-time market depth
- **Features**:
  - Live bid/ask prices
  - Depth visualization
  - Spread display
  - Best bid/ask highlighting
  - View modes (both, asks only, bids only)

**Bottom Section (40%)** - Actions & Info
- Quick action buttons (Long/Short)
- Drift account status
- Open positions panel
- Scrollable for additional info

## Changes Made

### 1. Updated Imports
```typescript
// Removed non-existent components
- import { FuturesOrderBook } from '@/components/futures/FuturesOrderBook';
- import { FuturesMarketList } from '@/components/futures/FuturesMarketList';

// Added working components from spot trading
+ import BinanceOrderBook from '@/components/spot/BinanceOrderBook';
+ import BinanceMarketList from '@/components/spot/BinanceMarketList';
```

### 2. Updated Desktop Layout
```typescript
<div className="h-[calc(100%-64px)] flex">
  {/* LEFT: Market List */}
  <div className="w-[20%] h-full border-r border-white/5">
    <BinanceMarketList 
      selectedPair={currentMarketName}
      onSelectPair={(pair) => {
        // Find market index by symbol and select it
        const market = Array.from(perpMarkets.entries()).find(([_, info]) => 
          info.symbol === pair || `${info.symbol}-PERP` === pair
        );
        if (market) {
          handleSelectMarket(market[0]);
        }
      }}
    />
  </div>

  {/* CENTER: Chart */}
  <div className="w-[50%] h-full flex flex-col">
    <div className="flex-1 p-4">
      <div className="h-full bg-[#0d0d0d] rounded-xl border border-white/5">
        <FuturesChart symbol={currentMarketName} isDarkMode={true} />
      </div>
    </div>
  </div>

  {/* RIGHT: Order Book + Actions */}
  <div className="w-[30%] h-full border-l border-white/5 flex flex-col">
    {/* Order Book - 60% */}
    <div className="h-[60%] border-b border-white/5">
      <BinanceOrderBook selectedPair={currentMarketName} />
    </div>

    {/* Actions - 40% */}
    <div className="h-[40%] overflow-y-auto">
      {/* Quick Actions, Account Status, Positions */}
    </div>
  </div>
</div>
```

### 3. Market Selection Integration
The market list now properly integrates with the Drift context:
- When user clicks a market in the list, it finds the corresponding Drift market index
- Updates `selectedMarketIndex` state
- All components (chart, order book, actions) update to show the new market

## Component Compatibility

### BinanceOrderBook
- **Works with**: Any symbol in format "SYMBOL-USDT" or "SYMBOL-PERP"
- **Data Source**: Gate.io REST API via `/api/orderbook`
- **Update Frequency**: Polls every 3 seconds
- **Features**: Real-time order book, depth visualization, spread calculation

### BinanceMarketList
- **Works with**: Drift perp markets from `perpMarkets` Map
- **Data Source**: Drift context (on-chain data)
- **Features**: Search, filter, sort, favorites, pagination
- **Integration**: Converts market selection to Drift market index

## Benefits

1. **Complete Trading View**: Users can now see market depth, available markets, and chart all at once
2. **Easy Market Switching**: Click any market in the list to switch instantly
3. **Professional Layout**: Matches industry-standard trading platform layouts (Binance, Bybit, etc.)
4. **Responsive**: Mobile layout remains unchanged, desktop gets full trading interface
5. **Reusable Components**: Uses existing spot trading components, no duplication

## Mobile Layout
Mobile layout remains unchanged:
- Tab-based navigation (Chart, Positions, Info)
- Bottom action buttons (Long/Short)
- Optimized for touch interactions

## Testing Checklist

- [x] Desktop layout shows three columns
- [x] Market list displays all Drift perp markets
- [x] Order book shows real-time data
- [x] Clicking market in list updates chart and order book
- [x] Quick action buttons work (Long/Short)
- [x] Account panels display correctly
- [x] Mobile layout still works
- [x] No console errors
- [x] Responsive at different screen sizes

## Related Files
- `src/app/(DashboardLayout)/futures/page.tsx` - Main futures page
- `src/components/spot/BinanceOrderBook.tsx` - Order book component
- `src/components/spot/BinanceMarketList.tsx` - Market list component
- `src/app/context/driftContext.tsx` - Drift market data

## Notes
- The order book uses Gate.io data (not Drift) for better real-time updates
- Market list uses Drift on-chain data for accurate market information
- Both components are designed to work with any market symbol format
- The layout is optimized for 1920x1080 and larger screens
