# Futures Trading Page – Bybit Style Layout Specification

## Purpose

This document defines a **visual redesign of the existing futures trading page** using the same components but styled to replicate the layout patterns used in Bybit's trading interface.

No new components should be added.
Only **layout structure, spacing, hierarchy, and styling** should change.

Existing components must remain:

```
BinanceMarketList
FuturesChart
BinanceOrderBook
FuturesOrderForm
DriftAccountStatus
PositionPanel
```

---

# High-Level Layout Differences From Current Design

| Area                | Current Layout     | Bybit-Style Layout                    |
| ------------------- | ------------------ | ------------------------------------- |
| Header              | minimal            | dense trading information             |
| Market List         | simple             | compact ticker table                  |
| Chart               | large center panel | primary center panel                  |
| Order Book          | right column       | right column (stacked with trades)    |
| Order Form          | bottom right       | **separate vertical trading panel**   |
| Account + Positions | bottom             | **dedicated horizontal bottom panel** |

Key structural change:

```
TOP AREA
Markets | Chart | OrderBook | TradePanel

BOTTOM AREA
Orders | Positions | History | Assets
```

---

# Overall Page Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (60px)                                                                               │
│ Logo | Markets | Trade | Tools | Pair Selector | Price Stats | Account Icons                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ MAIN TRADING AREA                                                                           │
│                                                                                             │
│ ┌───────────────┬───────────────────────────────┬─────────────────────────┬───────────────┐ │
│ │               │                               │                         │               │ │
│ │  MARKET LIST  │            CHART              │        ORDERBOOK        │   TRADE       │ │
│ │               │                               │                         │   PANEL       │ │
│ │               │                               │                         │               │ │
│ │ Search        │   TradingView                 │  Asks                   │ Portfolio     │ │
│ │ BTC-PERP      │                               │  Spread                 │               │ │
│ │ ETH-PERP      │                               │  Bids                   │ Limit/Market  │ │
│ │ SOL-PERP      │                               │                         │ Conditional   │ │
│ │ ...           │                               │                         │               │ │
│ │               │                               │                         │ Order Inputs  │ │
│ │               │                               │                         │               │ │
│ └───────────────┴───────────────────────────────┴─────────────────────────┴───────────────┘ │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘



┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ BOTTOM DATA PANEL                                                                           │
│                                                                                             │
│  Open Orders | Positions | Order History | Trade History | Assets                           │
│                                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                         PositionPanel + AccountStatus                                   │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Column Width Distribution (Bybit Style)

```
Markets Column      15%
Chart Area          50%
Orderbook Column    15%
Trading Panel       20%
```

This produces the **compact professional exchange layout**.

---

# Detailed Panel Layout

## 1. Header

Height: `60px`

Structure:

```
Logo | Navigation | Pair Selector | Market Stats | User Actions
```

Example:

```
BTCUSDT Perpetual
Price: 70,730
24h High
24h Low
Funding Rate
Open Interest
```

### Header Styling

```
background: #0b0e11
border-bottom: 1px solid #1f2329
font-weight: 500
```

---

# 2. Market List (Left Column)

Component: `BinanceMarketList`

Width: **15%**

Layout:

```
Search
--------------------------------
BTC-PERP     70,730     -0.15%
ETH-PERP      3,820     +0.25%
SOL-PERP        182     +1.4%
```

### Styling

```
background: #0b0e11
border-right: 1px solid #1f2329
font-size: 12px
row height: 32px
hover: #1a1f26
active row: left border highlight
```

---

# 3. Chart Area

Component: `FuturesChart`

Width: **50%**

Structure:

```
Chart Header
--------------------------------
Timeframes
Indicators
Chart Type
--------------------------------

TradingView Chart
Volume Bars
```

### Styling

```
background: #0b0e11
border-right: 1px solid #1f2329
padding: 8px
```

Chart must be **edge-to-edge with minimal padding**.

---

# 4. Order Book

Component: `BinanceOrderBook`

Width: **15%**

Layout:

```
Order Book
--------------------------------
Asks (red)

Spread

Bids (green)
```

Each row:

```
Price | Size | Total
```

### Styling

```
font-size: 12px
row height: 20px
background depth bars
red gradient for asks
green gradient for bids
```

---

# 5. Trading Panel

Component: `FuturesOrderForm`

Width: **20%**

This panel mimics the **Bybit trading box**.

Structure:

```
Portfolio Selector

Order Type Tabs
Limit | Market | Conditional

Inputs
Trigger Price
Price
Quantity

Options
TP/SL
Post Only
Reduce Only

Buttons
[Long]  [Short]
```

### Button Styling

```
Long:
background: #0ecb81

Short:
background: #f6465d
```

---

# 6. Bottom Trading Data Panel

Contains:

```
PositionPanel
DriftAccountStatus
```

Tabs row:

```
Open Orders
Positions
Order History
Trade History
Assets
```

### Layout

```
height: 220px
border-top: 1px solid #1f2329
background: #0b0e11
```

Scrollable table layout.

---

# Component Hierarchy

```
FuturesPage
│
├ Header
│
├ Main Trading Grid
│  ├ BinanceMarketList
│  ├ FuturesChart
│  ├ BinanceOrderBook
│  └ FuturesOrderForm
│
└ Bottom Data Panel
   ├ DriftAccountStatus
   └ PositionPanel
```

---

# Grid Implementation

```
display: grid;
grid-template-columns:
    15% 50% 15% 20%;
grid-template-rows:
    1fr 220px;
```

---

# Visual Style Tokens

## Colors

```
Main Background: #0b0e11
Panel Background: #0f1419
Border: #1f2329
Text Primary: #ffffff
Text Secondary: #848e9c
```

## Trade Colors

```
Long: #0ecb81
Short: #f6465d
Warning: #f0b90b
```

---

# Spacing Rules

```
Panel padding: 8px
Grid gap: 0
Row spacing: 2px
Section spacing: 8px
```

Bybit style uses **tight spacing and dense data**.

---

# Typography

```
Primary font size: 12px
Headers: 13px
Prices: 14px bold
```

---

# Scroll Behaviour

```
Market list: vertical scroll
Orderbook: vertical scroll
Bottom panel: horizontal + vertical scroll
```

---

# Interaction Behaviour

Hover states:

```
row hover: #1a1f26
button hover: brightness(1.1)
```

---

# Implementation Notes for AI

The redesign must:

```
✔ Keep existing components
✔ Change only layout + styling
✔ Follow 4-column trading layout
✔ Add bottom trading data panel
✔ Reduce padding
✔ Use dense exchange typography
```

The result should **visually match the Bybit futures trading layout while using the same components already in the system**.

---
