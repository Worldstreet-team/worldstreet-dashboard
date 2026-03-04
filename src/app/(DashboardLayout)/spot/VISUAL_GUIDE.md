# Binance-Style Spot Trading - Visual Guide

## Desktop Layout (1920x1080)

### Full Screen View
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ WorldStreet    Markets  [Trade]  Futures  Earn    🔍 Search  [Log In] [Sign Up] │
├──────────────┬──────────────────────────────────────────┬──────────────────────┤
│              │ BTC/USDT ▼  $69,201.46  +3.34%          │ 🔍 Search            │
│ Order Book   │ 24h Change: +3.34%  High: 70,000  Low: 68,000  Vol: 28,500    │
│              ├──────────────────────────────────────────┤ ⭐ Favorites  Spot   │
│ Price  Amt   │                                          │ [USDT] BTC ETH       │
│ ─────────────│                                          │ ─────────────────────│
│ 69,215  0.45 │                                          │ ⭐ BTC/USDT          │
│ 69,214  0.32 │         📈 CHART AREA                    │    $69,201  +3.34%   │
│ 69,213  0.28 │                                          │ ⭐ ETH/USDT          │
│ ─────────────│                                          │    $3,842   +2.18%   │
│ 69,201.46 ▲  │                                          │ ⭐ SOL/USDT          │
│ ─────────────│                                          │    $198.73  -1.25%   │
│ 69,189  0.51 │                                          │ ⭐ BNB/USDT          │
│ 69,188  0.38 │                                          │    $615.20  +1.85%   │
│ 69,187  0.42 │                                          │ ⭐ XRP/USDT          │
│              │                                          │    $2.42    -2.12%   │
├──────────────┼──────────────────────────────────────────┼──────────────────────┤
│ [Buy] [Sell] │ Market Trades                            │ [Open Orders]        │
│              │ ─────────────────────────────────────────│ Order History        │
│ Limit ▼      │ Price      Amount    Time                │ Trade History        │
│              │ 69,201.46  0.234     12:34:56            │ Holdings             │
│ Price        │ 69,200.12  0.156     12:34:55            │ ─────────────────────│
│ [69,201.46]  │ 69,199.88  0.089     12:34:54            │                      │
│              │                                          │ You have no open     │
│ Amount       │                                          │ orders               │
│ [0.00] BTC   │                                          │                      │
│              │                                          │                      │
│ [25%][50%]   │                                          │                      │
│ [75%][100%]  │                                          │                      │
│              │                                          │                      │
│ Total        │                                          │                      │
│ [0.00] USDT  │                                          │                      │
│              │                                          │                      │
│ [Buy BTC]    │                                          │                      │
└──────────────┴──────────────────────────────────────────┴──────────────────────┘
```

## Component Breakdown

### 1. Header Bar (Top)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Logo  Markets [Trade] Futures Earn  🔍 Search  [Account] │
└─────────────────────────────────────────────────────────────┘
```
- Logo + Brand name
- Navigation tabs
- Search bar
- Login/Signup buttons

### 2. Order Book (Left Column - 300px)
```
┌──────────────┐
│ Order Book   │
│ ─────────────│
│ Price  Amount│
│ ─────────────│
│ 🔴 69,215 0.45│ ← Sell orders (red)
│ 🔴 69,214 0.32│
│ 🔴 69,213 0.28│
│ ─────────────│
│ 69,201.46 ▲  │ ← Current price
│ ─────────────│
│ 🟢 69,189 0.51│ ← Buy orders (green)
│ 🟢 69,188 0.38│
│ 🟢 69,187 0.42│
└──────────────┘
```
- Depth bars behind each row
- Color-coded (red=sell, green=buy)
- Real-time updates

### 3. Chart Section (Center - Flexible)
```
┌──────────────────────────────────────┐
│ BTC/USDT ▼  $69,201.46  +3.34%      │
│ 24h: +3.34%  High: 70k  Low: 68k    │
├──────────────────────────────────────┤
│ [1m][5m][15m][1H][4H][1D]  TP/SL    │
├──────────────────────────────────────┤
│                                      │
│         📈 Candlestick Chart         │
│                                      │
│         with Volume Bars             │
│                                      │
└──────────────────────────────────────┘
```
- Pair selector dropdown
- 24h statistics
- Timeframe buttons
- TP/SL controls

### 4. Market List (Right Column - 320px)
```
┌──────────────────────┐
│ 🔍 Search            │
├──────────────────────┤
│ ⭐ Favorites  [Spot] │
│ [USDT] BTC ETH       │
├──────────────────────┤
│ Pair    Price Change │
├──────────────────────┤
│ ⭐ BTC/USDT          │
│    69,201  🟢 +3.34% │
│ ⭐ ETH/USDT          │
│    3,842   🟢 +2.18% │
│ ⭐ SOL/USDT          │
│    198.73  🔴 -1.25% │
└──────────────────────┘
```
- Search input
- Tab filters
- Quote filters
- Sortable list
- Favorite stars

### 5. Order Form (Bottom Left)
```
┌──────────────┐
│ [Buy] [Sell] │
├──────────────┤
│ Limit ▼      │
│              │
│ Price        │
│ [69,201.46]  │
│              │
│ Amount       │
│ [0.00] BTC   │
│              │
│ ━━━━━━━━━━━━ │ ← Slider
│ 25% 50% 75%  │
│              │
│ Total        │
│ [0.00] USDT  │
│              │
│ [🟢 Buy BTC] │
└──────────────┘
```
- Buy/Sell tabs
- Order type selector
- Input fields
- Percentage slider
- Action button

### 6. Bottom Panel (Bottom Center/Right)
```
┌─────────────────────────────────────────────────────────┐
│ [Open Orders] Order History  Trade History  Holdings   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              You have no open orders                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
- Tab navigation
- Scrollable content
- Empty states

## Color Palette

### Background Layers
```
Layer 0 (Base):     #0b0e11  ████████
Layer 1 (Panel):    #11161c  ████████
Layer 2 (Hover):    #1e2329  ████████
Layer 3 (Border):   #2b3139  ████████
```

### Text Colors
```
Primary:   #ffffff  ████████  (White)
Secondary: #848e9c  ████████  (Gray)
Muted:     #5e6673  ████████  (Dark Gray)
```

### Action Colors
```
Buy:    #0ecb81  ████████  (Green)
Sell:   #f6465d  ████████  (Red)
Accent: #f0b90b  ████████  (Yellow)
```

## Depth Bar Visualization

### Sell Orders (Red)
```
Price    Amount   Total    [Depth Bar]
69,215   0.45     31,146   ████████████████░░░░ 80%
69,214   0.32     22,148   ████████████░░░░░░░░ 60%
69,213   0.28     19,379   ██████████░░░░░░░░░░ 50%
```

### Buy Orders (Green)
```
Price    Amount   Total    [Depth Bar]
69,189   0.51     35,286   ░░░░████████████████ 80%
69,188   0.38     26,291   ░░░░░░░░████████████ 60%
69,187   0.42     29,058   ░░░░░░░░░░██████████ 50%
```

## Interaction States

### Buttons
```
Default:  bg-[#1e2329]  text-[#848e9c]
Hover:    bg-[#2b3139]  text-[#ffffff]
Active:   bg-[#f0b90b]  text-[#0b0e11]
```

### Inputs
```
Default:  border-[#2b3139]  bg-[#1e2329]
Focus:    border-[#f0b90b]  bg-[#1e2329]
Error:    border-[#f6465d]  bg-[#1e2329]
```

### Order Book Rows
```
Default:  bg-transparent
Hover:    bg-[#1e2329]
Selected: bg-[#2b3139]
```

## Typography Scale

```
Pair Price:     24px  Bold    Mono
Section Title:  14px  Medium  Sans
Table Header:   10px  Medium  Sans
Table Data:     11px  Regular Mono
Button Text:    13px  Semibold Sans
Input Text:     12px  Regular Sans
```

## Spacing System

```
xs:  4px   ▪
sm:  8px   ▪▪
md:  12px  ▪▪▪
lg:  16px  ▪▪▪▪
xl:  24px  ▪▪▪▪▪▪
```

## Grid Dimensions

```
Order Book:     300px  (fixed)
Chart:          flex   (grows)
Market List:    320px  (fixed)
Bottom Panel:   250px  (fixed height)
Header:         64px   (fixed height)
```

## Responsive Breakpoints

```
Desktop:  1920px+  (Optimized)
Laptop:   1440px+  (Supported)
Tablet:   1024px+  (Needs work)
Mobile:   768px-   (Not implemented)
```

---

**Note**: This is a visual reference guide. See BINANCE_IMPLEMENTATION.md for technical details.
