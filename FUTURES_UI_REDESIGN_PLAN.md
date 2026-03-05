# Futures UI Redesign Plan - Binance Style

## Objective
Redesign the futures trading page to match the Binance-style dark UI from the spot trading page while maintaining all existing functionality.

## Current Spot Trading UI Features to Replicate

### Layout Structure
1. **Top Header Bar** (Desktop only)
   - Logo + Navigation (Assets, Spot, Futures)
   - Dashboard and Tron-swap buttons
   - Background: `bg-[#181a20]`
   - Border: `border-[#2b3139]`

2. **Desktop Grid Layout**
   - 3-column grid: `[280px_1fr_340px]`
   - Left: Order Book / Market Info
   - Center: Chart + Order Form
   - Right: Market List + Additional Info

3. **Mobile Layout**
   - Header with logo and icons
   - Pair info header
   - Tab navigation (Chart, OrderBook, Trades, Info, Data)
   - Bottom tabs (Orders, Holdings)
   - Fixed Buy/Sell buttons at bottom

### Color Scheme
- Background: `#181a20`
- Secondary BG: `#2b3139`
- Text Primary: `white`
- Text Secondary: `#848e9c`
- Green (Buy/Long): `#0ecb81`
- Red (Sell/Short): `#f6465d`
- Yellow (Accent): `#fcd535`
- Border: `#2b3139`

### Typography
- Headers: `font-semibold`
- Prices: `font-mono`
- Small text: `text-xs`
- Medium text: `text-sm`
- Large text: `text-base` to `text-2xl`

## Futures Page Components to Redesign

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Assets | Spot | Futures | Dashboard | Swap  │
├──────────────┬────────────────────────────┬──────────────────┤
│              │  Pair Header + Stats       │                  │
│  Position    ├────────────────────────────┤  Market List     │
│  Panel       │                            │  (Available      │
│  (Open       │      Chart                 │   Markets)       │
│  Positions)  │                            │                  │
│              │                            │                  │
│              ├────────────────────────────┤                  │
│              │  Order Form                │                  │
│              │  (Long/Short Tabs)         │                  │
├──────────────┴────────────────────────────┴──────────────────┤
│  Bottom Panel: Account Status | Collateral | Risk            │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────────────┐
│  Header: Logo | Icons           │
├─────────────────────────────────┤
│  Market Info: SOL-PERP | Price  │
├─────────────────────────────────┤
│  Tabs: Chart | Positions | Info │
├─────────────────────────────────┤
│                                 │
│  Tab Content                    │
│  (Scrollable)                   │
│                                 │
├─────────────────────────────────┤
│  Bottom Tabs: Positions | Info  │
├─────────────────────────────────┤
│  Long Button | Short Button     │
└─────────────────────────────────┘
```

## Component Mapping

### From Spot to Futures

| Spot Component | Futures Equivalent | Notes |
|----------------|-------------------|-------|
| BinanceOrderBook | PositionPanel | Show open positions instead |
| BinanceOrderForm | FuturesOrderForm | Long/Short tabs instead of Buy/Sell |
| BinanceMarketList | MarketSelector | List of perpetual markets |
| LiveChart | FuturesChart | Keep existing chart |
| MarketTrades | Recent Trades | Optional: show recent market trades |
| BinanceBottomPanel | Account Info Panel | Collateral, Risk, Wallet |

## Implementation Steps

### Phase 1: Create New Futures Page Structure
1. Create header with navigation
2. Set up 3-column desktop grid
3. Set up mobile layout with tabs
4. Apply Binance color scheme

### Phase 2: Redesign Components
1. **PositionPanel** - Style like order book
2. **FuturesOrderForm** - Style like BinanceOrderForm
3. **MarketSelector** - Style like BinanceMarketList
4. **Account Info** - Style like bottom panel

### Phase 3: Mobile Optimization
1. Tab navigation
2. Fixed action buttons
3. Responsive design
4. Touch-friendly controls

### Phase 4: Testing
1. Verify all functionality works
2. Test on mobile devices
3. Test dark mode
4. Test all modals and interactions

## Key Functionality to Preserve

### Trading Functions
- ✅ Open Long/Short positions
- ✅ Close positions
- ✅ Set leverage
- ✅ Set stop loss / take profit
- ✅ View position details
- ✅ View PnL

### Account Functions
- ✅ Initialize Drift account
- ✅ Deposit collateral
- ✅ Withdraw collateral
- ✅ View account health
- ✅ View risk metrics

### Data Functions
- ✅ Real-time price updates
- ✅ Chart data
- ✅ Position updates
- ✅ Balance updates
- ✅ Auto-refresh

## Files to Modify

### Main Page
- `src/app/(DashboardLayout)/futures/page.tsx` - Complete redesign

### Components (Style Only)
- `src/components/futures/PositionPanel.tsx`
- `src/components/futures/CollateralPanel.tsx`
- `src/components/futures/FuturesWalletBalance.tsx`
- `src/components/futures/RiskPanel.tsx`
- `src/components/futures/FuturesOrderModal.tsx`
- `src/components/futures/MarketSelector.tsx`
- `src/components/futures/DriftAccountStatus.tsx`

### New Components to Create
- `src/components/futures/FuturesOrderForm.tsx` - Binance-style order form
- `src/components/futures/FuturesMarketList.tsx` - Market selector list
- `src/components/futures/MobileFuturesModal.tsx` - Mobile trading modal

## Design Specifications

### Header
- Height: `h-12` (48px)
- Background: `bg-[#181a20]`
- Border: `border-b border-[#2b3139]`
- Logo size: `28x28` (desktop), `24x24` (mobile)

### Grid Columns
- Left: `280px` fixed width
- Center: `1fr` flexible
- Right: `340px` fixed width

### Pair Header
- Height: Auto
- Padding: `px-3 py-2`
- Border: `border-b border-[#2b3139]`
- Price size: `text-xl font-semibold`
- Stats size: `text-[11px]`

### Chart
- Background: `bg-[#181a20]`
- Full height of center column
- TradingView integration

### Order Form
- Background: `bg-[#181a20]`
- Tabs: Long (green) / Short (red)
- Input fields: `bg-[#2b3139]`
- Focus: `border-[#fcd535]`

### Buttons
- Long: `bg-[#0ecb81] hover:bg-[#0ecb81]/90`
- Short: `bg-[#f6465d] hover:bg-[#f6465d]/90`
- Disabled: `opacity-50 cursor-not-allowed`

### Mobile
- Safe area: `safe-area-bottom`
- Fixed buttons: `py-4`
- Tab height: `py-3`
- Scrollable content: `overflow-y-auto scrollbar-hide`

## Success Criteria

1. ✅ Visual match with spot trading page
2. ✅ All existing functionality preserved
3. ✅ Responsive on all screen sizes
4. ✅ Dark mode consistent
5. ✅ No broken features
6. ✅ Smooth animations
7. ✅ Professional appearance
8. ✅ Easy to use on mobile

## Notes

- Keep all hooks and state management unchanged
- Keep all API calls unchanged
- Keep all business logic unchanged
- Only modify UI/UX and styling
- Maintain accessibility
- Ensure touch-friendly on mobile
