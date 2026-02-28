# Spot Trading UI Refactor Plan - Binance Pro Style

## Objective
Refactor the Spot Trading page UI to match Binance Pro interface layout while:
- Preserving ALL existing functionality
- Maintaining current theme (colors, fonts, branding)
- Keeping all API calls and business logic unchanged
- Ensuring responsive design

## Current Structure Analysis

### Components
1. **MarketTicker** - Horizontal scrolling pair selector with live prices
2. **LiveChart** - TradingView-style candlestick chart with TP/SL lines
3. **TradingPanel** - Buy/Sell order entry with quote system
4. **PositionsList** - Open/Closed positions with TP/SL management
5. **OrderHistory** - Trade history table
6. **BalanceDisplay** - Trading balances by asset and chain

### Current Layout (3-column grid)
```
[Page Header]
[Market Ticker - Full Width]
[Chart (2 cols)          ] [Trading Panel]
[Positions List          ] [Balances     ]
[Order History           ] [Market Info  ]
```

## Target Binance Pro Layout

### Desktop Layout
```
[Pair Info Bar - Compact horizontal strip with price, 24h stats]
┌─────────────┬──────────────────────────┬─────────────┐
│ Order Book  │      Trading Chart       │ Order Entry │
│   (20-25%)  │        (50-55%)          │  (25-30%)   │
│             │                          │             │
│ Asks (red)  │  [Timeframe tabs]        │ [Limit/    │
│ ─────────   │  [Chart canvas]          │  Market/   │
│ Last Price  │                          │  Stop tabs]│
│ ─────────   │                          │             │
│ Bids (green)│                          │ [Buy/Sell  │
│             │                          │  toggle]   │
│             │                          │ [Amount]   │
│             │                          │ [% buttons]│
│             │                          │ [Action btn]│
└─────────────┴──────────────────────────┴─────────────┘
[Bottom Tabs: Open Orders | Order History | Positions | Balances]
```

### Tablet Layout
```
[Pair Info Bar]
[Chart - Full Width]
┌──────────────┬──────────────┐
│ Order Book   │ Order Entry  │
│   (50%)      │    (50%)     │
└──────────────┴──────────────┘
[Bottom Tabs]
```

### Mobile Layout
```
[Pair Info Bar]
[Chart]
[Tabs: Order Book | Trades]
[Order Entry]
[Bottom Tabs]
```

## Implementation Plan

### Phase 1: Create New Components

#### 1.1 PairInfoBar Component
**File**: `src/components/spot/PairInfoBar.tsx`
- Compact horizontal strip
- Display: Pair name, Live price, 24h change, 24h high/low, 24h volume
- Minimal padding, tight spacing
- Use existing MarketTicker data source
- Props: `selectedPair`, `onSelectPair`

#### 1.2 OrderBook Component  
**File**: `src/components/spot/OrderBook.tsx`
- Two sections: Asks (top, red) | Bids (bottom, green)
- Middle row: Last traded price (highlighted)
- Monospace/tabular numbers
- Hover highlight rows
- Volume-based background intensity
- Compact row height
- Scrollable container
- Sticky header
- Mock data initially (can integrate real order book API later)

#### 1.3 Refactor TradingPanel
**File**: `src/components/spot/TradingPanel.tsx` (modify existing)
- Reduce padding throughout
- Tighter vertical spacing
- Tabs: Limit | Market | Stop (if exists)
- Buy/Sell toggle buttons (more prominent)
- Price/Amount/Total inputs (compact)
- Percentage buttons: 25% | 50% | 75% | 100%
- Available balance display
- Prominent Buy (green) / Sell (red) button
- Match Binance vertical density

#### 1.4 BottomTabs Component
**File**: `src/components/spot/BottomTabs.tsx`
- Tab-based layout
- Tabs: Open Orders | Order History | Positions | Balances
- Table-based structure
- Small typography
- Hover row highlight
- Clear column alignment
- Scrollable if long
- Minimal shadows

### Phase 2: Refactor Existing Components

#### 2.1 LiveChart
- Remove excessive padding
- Make it stretch full height
- Clean top toolbar row
- Tabs for timeframes/indicators
- No large rounded containers
- Keep theme colors for candles

#### 2.2 PositionsList
- Convert to table format (already is)
- Reduce padding
- Smaller typography
- Fit into BottomTabs

#### 2.3 OrderHistory
- Already table format
- Reduce padding
- Fit into BottomTabs

#### 2.4 BalanceDisplay
- Convert to table format
- Reduce card-style spacing
- Fit into BottomTabs

### Phase 3: Update Main Page Layout

#### 3.1 Spot Page (`src/app/(DashboardLayout)/spot/page.tsx`)
- Remove page header (or make minimal)
- Add PairInfoBar at top
- Create CSS Grid layout:
  ```css
  grid-template-columns: 20% 55% 25%;
  grid-template-rows: auto 1fr auto;
  ```
- Position components:
  - Row 1: PairInfoBar (spans all columns)
  - Row 2 Col 1: OrderBook
  - Row 2 Col 2: LiveChart
  - Row 2 Col 3: TradingPanel
  - Row 3: BottomTabs (spans all columns)

### Phase 4: Styling Updates

#### 4.1 Global Adjustments
- Reduce border-radius throughout (Binance uses minimal rounding)
- Use subtle borders instead of heavy shadows
- Reduce padding globally
- Increase information density
- Use neutral backgrounds for panels
- Avoid glassmorphism, gradients, large drop shadows

#### 4.2 Typography
- Keep existing font family
- Reduce font sizes slightly for density
- Use monospace for numbers/prices
- Tabular numbers for alignment

#### 4.3 Colors
- Keep brand primary/secondary colors
- Use theme-aware backgrounds
- Green for bids/buy/profit
- Red for asks/sell/loss
- Neutral grays for backgrounds

### Phase 5: Responsive Design

#### 5.1 Desktop (>= 1024px)
- Full 3-column layout
- All components visible

#### 5.2 Tablet (768px - 1023px)
- Chart on top (full width)
- Order Book + Order Entry side by side
- Bottom tabs below

#### 5.3 Mobile (< 768px)
- Stack vertically:
  1. Pair info
  2. Chart
  3. Tabs (Order Book / Trades)
  4. Order Entry
  5. Bottom tabs

## File Structure

```
src/components/spot/
├── PairInfoBar.tsx          [NEW]
├── OrderBook.tsx            [NEW]
├── BottomTabs.tsx           [NEW]
├── TradingPanel.tsx         [MODIFY - reduce padding, tighter layout]
├── LiveChart.tsx            [MODIFY - remove padding, stretch height]
├── MarketTicker.tsx         [KEEP - data source for PairInfoBar]
├── PositionsList.tsx        [MODIFY - fit into BottomTabs]
├── OrderHistory.tsx         [MODIFY - fit into BottomTabs]
├── BalanceDisplay.tsx       [MODIFY - table format for BottomTabs]
├── TPSLModal.tsx            [KEEP - no changes]
└── index.ts                 [UPDATE - export new components]

src/app/(DashboardLayout)/spot/
└── page.tsx                 [MAJOR REFACTOR - new grid layout]
```

## CSS/Styling Approach

Use Tailwind classes with custom values:
- `gap-1` instead of `gap-6` for tighter spacing
- `p-2` instead of `p-6` for reduced padding
- `text-xs` and `text-sm` for smaller text
- `rounded` or `rounded-md` instead of `rounded-2xl`
- `border` instead of `shadow-sm`

## Testing Checklist

- [ ] All existing functionality works
- [ ] No API calls modified
- [ ] No business logic changed
- [ ] Responsive on desktop
- [ ] Responsive on tablet
- [ ] Responsive on mobile
- [ ] Theme switching works (dark/light)
- [ ] All buttons/interactions work
- [ ] TP/SL lines still show on chart
- [ ] Position closing works
- [ ] Trade execution works
- [ ] Balance updates work
- [ ] Order history loads
- [ ] No console errors
- [ ] No TypeScript errors

## Implementation Order

1. Create PairInfoBar component
2. Create OrderBook component
3. Create BottomTabs component
4. Refactor TradingPanel (reduce padding)
5. Refactor LiveChart (remove padding)
6. Update PositionsList for BottomTabs
7. Update OrderHistory for BottomTabs
8. Update BalanceDisplay for BottomTabs
9. Refactor main page layout
10. Test responsive design
11. Final polish and adjustments

## Notes

- This is STRICTLY a UI refactor
- NO functionality changes
- NO API modifications
- NO business logic changes
- Keep all existing props and event handlers
- Maintain accessibility
- Preserve test IDs if any exist
