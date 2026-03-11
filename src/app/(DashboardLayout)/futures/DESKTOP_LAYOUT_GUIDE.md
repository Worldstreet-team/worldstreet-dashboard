# Futures Trading Page - Desktop Layout Documentation

## Overview
The futures trading page provides a professional, fullscreen trading interface optimized for desktop users. It features a three-column layout with real-time market data, advanced charting, and comprehensive trading tools.

## Visual Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  HEADER (56px height) - Black/40 backdrop blur                                      │
│  ┌──────────────┬────────────────────────────────────────────┬──────────────────┐  │
│  │ Logo + Nav   │  Market Selector + Price Display           │  Account Status  │  │
│  │ WorldStreet  │  [SOL-PERP ▼]  $81.23  +2.45%            │  Available: $100 │  │
│  │ • Assets     │                                            │  PnL: +$5.23     │  │
│  │ • Futures    │                                            │                  │  │
│  └──────────────┴────────────────────────────────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  MAIN TRADING AREA (calc(100vh - 56px))                                             │
│                                                                                      │
│  ┌──────────────┬──────────────────────────────────────────┬──────────────────────┐│
│  │              │                                          │                      ││
│  │  MARKET LIST │           CHART AREA                     │   ORDER BOOK         ││
│  │   (20%)      │            (50%)                         │   & ACTIONS          ││
│  │              │                                          │    (30%)             ││
│  │ ┌──────────┐ │  ┌────────────────────────────────────┐ │  ┌────────────────┐ ││
│  │ │ Search   │ │  │                                    │ │  │  Order Book    │ ││
│  │ └──────────┘ │  │                                    │ │  │  (60% height)  │ ││
│  │              │  │                                    │ │  │                │ ││
│  │ ┌──────────┐ │  │      TradingView Chart             │ │  │  Bids/Asks     │ ││
│  │ │ BTC-PERP │ │  │                                    │ │  │  Real-time     │ ││
│  │ │ $43,250  │ │  │                                    │ │  │                │ ││
│  │ └──────────┘ │  │                                    │ │  └────────────────┘ ││
│  │              │  │                                    │ │                      ││
│  │ ┌──────────┐ │  │                                    │ │  ┌────────────────┐ ││
│  │ │ ETH-PERP │ │  │                                    │ │  │ Order Form     │ ││
│  │ │ $2,250   │ │  │                                    │ │  │ (40% height)   │ ││
│  │ └──────────┘ │  │                                    │ │  │                │ ││
│  │              │  │                                    │ │  │ • Long/Short   │ ││
│  │ ┌──────────┐ │  │                                    │ │  │ • Size         │ ││
│  │ │ SOL-PERP │ │  │                                    │ │  │ • Leverage     │ ││
│  │ │ $81.23   │ │  │                                    │ │  │ • Order Type   │ ││
│  │ └──────────┘ │  │                                    │ │  │                │ ││
│  │              │  │                                    │ │  │ [Submit]       │ ││
│  │ ┌──────────┐ │  │                                    │ │  │                │ ││
│  │ │ More...  │ │  │                                    │ │  │ Account Status │ ││
│  │ └──────────┘ │  │                                    │ │  │ Positions      │ ││
│  │              │  └────────────────────────────────────┘ │  └────────────────┘ ││
│  │              │                                          │  (Scrollable)       ││
│  └──────────────┴──────────────────────────────────────────┴──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Breakdown

### 1. Header Bar (56px height)
**Background:** `black/40` with backdrop blur
**Border:** Bottom border `white/5`

#### Left Section
- **Logo:** WorldStreet logo (28x28px) + brand name
- **Navigation:**
  - Assets (gray, hover white)
  - Futures (yellow/primary, active)

#### Center Section
- **Market Selector Dropdown:**
  - Current market display (e.g., "SOL-PERP")
  - Dropdown icon
  - Click to show top 10 markets
  - Z-index: 50 (above everything)
  
- **Price Display:**
  - Last Price: Large, bold, color-coded (green/red)
  - 24h Change: Percentage with background pill

#### Right Section
- **Account Summary:**
  - Available Balance
  - Unrealized PnL (color-coded)
  - Compact, right-aligned

### 2. Three-Column Trading Layout

#### LEFT COLUMN (20% width)
**Component:** `BinanceMarketList`
**Purpose:** Market selection and overview

**Features:**
- Search bar at top
- Scrollable market list
- Each market shows:
  - Symbol (e.g., "BTC-PERP")
  - Current price
  - 24h change percentage
- Selected market highlighted
- Border right: `white/5`

**Styling:**
- Background: Dark gradient
- Hover effects on markets
- Active market: Primary color accent

#### CENTER COLUMN (50% width)
**Component:** `FuturesChart`
**Purpose:** Price chart and technical analysis

**Features:**
- Full TradingView integration
- Padding: 16px all sides
- Chart container:
  - Background: `#0d0d0d`
  - Border: `white/5`
  - Border radius: 12px
  - Shadow: Large black shadow

**Chart Capabilities:**
- Multiple timeframes
- Technical indicators
- Drawing tools
- Full-screen mode
- Dark theme optimized

#### RIGHT COLUMN (30% width)
**Split into two sections:**

##### Top Section (60% height)
**Component:** `BinanceOrderBook`
**Purpose:** Real-time order book

**Features:**
- Live bid/ask prices
- Order depth visualization
- Color-coded (green bids, red asks)
- Scrollable
- Border bottom: `white/5`

##### Bottom Section (40% height)
**Components:** Multiple (scrollable container)

1. **FuturesOrderForm**
   - Long/Short toggle buttons
   - Size input
   - Leverage slider
   - Order type selector (Market/Limit/Stop-Limit)
   - Price inputs (for limit orders)
   - Submit button (color-coded)

2. **DriftAccountStatus**
   - Initialization status
   - Account metrics
   - Collateral info

3. **PositionPanel**
   - Open positions list
   - PnL per position
   - Close position buttons

**Styling:**
- Padding: 16px
- Gap between components: 12px
- Scrollbar hidden
- Smooth scroll behavior

## Color Scheme

### Primary Colors
- **Background:** `#0a0a0a` (main), `#0d0d0d` (panels)
- **Borders:** `white/5` (subtle dividers)
- **Text Primary:** `white`
- **Text Secondary:** `#848e9c`

### Accent Colors
- **Primary/Warning:** `#f0b90b` (yellow)
- **Success/Long:** `#0ecb81` (green)
- **Error/Short:** `#f6465d` (red)

### Interactive States
- **Hover:** `white/10` background
- **Active:** Primary color with 10% opacity background
- **Disabled:** 50% opacity

## Responsive Behavior

### Desktop (≥768px)
- Full three-column layout
- Fixed fullscreen interface
- All panels visible simultaneously
- Optimized for trading efficiency

### Mobile (<768px)
- Switches to mobile layout (not covered in this doc)
- Tab-based navigation
- Stacked components
- Touch-optimized controls

## Key Features

### 1. Market Selector
- **Position:** Center of header
- **Z-index:** 50 (highest)
- **Dropdown:**
  - Appears below button
  - Backdrop overlay to close
  - Smooth animations
  - Top 10 markets shown
  - Search functionality (via BinanceMarketList)

### 2. Real-time Updates
- **Price updates:** Every second
- **Order book:** WebSocket connection
- **Chart:** TradingView real-time data
- **Account data:** Auto-refresh every 30s

### 3. Trading Workflow
1. Select market from list or dropdown
2. View chart and order book
3. Configure order in form
4. Submit trade
5. Monitor position in panel

### 4. Account Management
- **Initialization:** One-time setup for new users
- **Collateral:** Deposit/withdraw USDC
- **Risk Management:** Leverage limits, margin calls
- **Position Monitoring:** Real-time PnL tracking

## Component Hierarchy

```
FuturesPage
├── Header
│   ├── Logo + Navigation
│   ├── Market Selector (Dropdown)
│   ├── Price Display
│   └── Account Summary
│
└── Main Trading Area
    ├── Left Column (20%)
    │   └── BinanceMarketList
    │       ├── Search
    │       └── Market Items
    │
    ├── Center Column (50%)
    │   └── FuturesChart
    │       └── TradingView Widget
    │
    └── Right Column (30%)
        ├── Top (60%)
        │   └── BinanceOrderBook
        │       ├── Asks
        │       └── Bids
        │
        └── Bottom (40% - Scrollable)
            ├── FuturesOrderForm
            │   ├── Side Selector
            │   ├── Size Input
            │   ├── Leverage Slider
            │   ├── Order Type
            │   └── Submit Button
            │
            ├── DriftAccountStatus
            │   ├── Initialization
            │   └── Account Metrics
            │
            └── PositionPanel
                └── Position List
```

## Technical Implementation

### Layout CSS
```css
/* Fullscreen container */
.futures-page {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
}

/* Header */
.header {
  height: 56px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Three-column layout */
.trading-area {
  height: calc(100vh - 56px);
  display: flex;
}

.left-column {
  width: 20%;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.center-column {
  width: 50%;
}

.right-column {
  width: 30%;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
}
```

### State Management
- **Drift Context:** Account data, positions, orders
- **Local State:** UI interactions, modal visibility
- **Zustand Store:** Chart settings, preferences

### Data Flow
1. **Market Selection** → Updates chart, order book, order form
2. **Order Submission** → Drift SDK → Blockchain → Position update
3. **Real-time Updates** → WebSocket → UI refresh
4. **Account Refresh** → Auto-refresh timer → Drift SDK → UI update

## Performance Optimizations

1. **Lazy Loading:** Components load on demand
2. **Memoization:** Expensive calculations cached
3. **Virtual Scrolling:** Market list (if >100 items)
4. **Debouncing:** Input fields, search
5. **WebSocket:** Efficient real-time data
6. **Chart Optimization:** TradingView handles rendering

## Accessibility

- **Keyboard Navigation:** Tab through all interactive elements
- **Screen Reader:** Proper ARIA labels
- **Color Contrast:** WCAG AA compliant
- **Focus Indicators:** Visible focus states
- **Error Messages:** Clear, actionable feedback

## Future Enhancements

1. **Customizable Layout:** Drag-and-drop panels
2. **Multiple Charts:** Split-screen view
3. **Advanced Orders:** OCO, trailing stop
4. **Trading Bots:** Automated strategies
5. **Social Trading:** Copy trading features
6. **Analytics Dashboard:** Performance metrics

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Production Ready
