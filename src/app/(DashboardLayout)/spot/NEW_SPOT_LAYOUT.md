# Spot Trading Page – Bybit-Style Layout Architecture

## Overview

This document defines the **restyled layout architecture** for the Spot Trading page so it visually follows the **Bybit trading interface pattern** shown in the reference image.

The goal is **purely structural and visual**:

- No new components are introduced
- No functions are modified
- No logic is changed
- No APIs are changed
- Only **layout structure and panel arrangement** are adjusted

All existing components remain exactly the same and are only **repositioned to match the Bybit UI structure**.

---

# Page Structure

```
src/app/(DashboardLayout)/spot/
├── page.tsx
├── binance-page.tsx
└── SPOT_PAGE_LAYOUT_ARCHITECTURE.md
```

---

# Design Goals

The Bybit layout prioritizes trading information in the following order:

| Priority | Component |
|--------|--------|
| Highest | Chart |
| High | Order Book |
| High | Order Form |
| Medium | Market List |
| Medium | Recent Trades |
| Secondary | Positions |

The result is a **professional trading desk layout** used by most major exchanges.

---

# Desktop Layout

## Main Structure

The trading interface uses a **4-column grid**.

```
Chart | OrderBook | OrderForm | Markets
```

Below that sits the **Positions Panel**.

---

# Desktop Layout Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER BAR                                                                │
│ Logo | Assets | Spot | Futures                       Dashboard | Wallet      │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│ PAIR HEADER                                                                    │
│ BTC/USDT | Price | 24h Change | 24h High | 24h Low | Volume                    │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│ MAIN TRADING GRID                                                              │
│                                                                               │
│  Chart Area (Largest) | Order Book | Order Form | Markets + Trades           │
│                                                                               │
│  1fr                   | 260px      | 340px      | 320px                      │
│                                                                               │
│ ┌─────────────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────────────┐ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │                        │ │
│ │     LiveChart       │ │OrderBook │ │OrderForm  │ │ BinanceMarketList      │ │
│ │                     │ │          │ │           │ │                        │ │
│ │ Candles             │ │ Bids     │ │ Buy/Sell  │ │ Search                 │ │
│ │ Volume              │ │ Asks     │ │ Market    │ │ Filters                │ │
│ │ Indicators          │ │ Spread   │ │ Limit     │ │ Pair List              │ │
│ │                     │ │          │ │ StopLimit │ │                        │ │
│ │                     │ │          │ │ Slider    │ │                        │ │
│ │                     │ │          │ │ Balance   │ │                        │ │
│ │                     │ │          │ │ Place Btn │ │                        │ │
│ │                     │ │          │ │           │ ├────────────────────────┤ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │      MarketTrades      │ │
│ │                     │ │          │ │           │ │                        │ │
│ │                     │ │          │ │           │ │ Price | Amount | Time  │ │
│ │                     │ │          │ │           │ │ Buy / Sell Colors      │ │
│ │                     │ │          │ │           │ │ Real-time Feed         │ │
│ └─────────────────────┘ └──────────┘ └───────────┘ └────────────────────────┘ │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│ POSITIONS PANEL                                                                │
│                                                                               │
│ Pair | Size | Entry | Mark | PnL | Actions                                     │
│                                                                               │
│ PositionsPanel Component                                                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

# Grid Layout Definition

The main grid should use the following structure.

```
grid-template-columns:

1fr        LiveChart
260px      BinanceOrderBook
340px      BinanceOrderForm
320px      Market Section
```

This ensures the **chart remains dominant**, as in Bybit.

---

# Component Placement

## Trading Grid Component Hierarchy

```
MainTradingGrid
├── ChartSection
│   └── LiveChart
│
├── OrderBookSection
│   └── BinanceOrderBook
│
├── OrderFormSection
│   └── BinanceOrderForm
│
└── MarketSection
    ├── BinanceMarketList
    └── MarketTrades
```

---

# Pair Header Layout

Placed **above the trading grid**.

```
PairHeader
├── Pair Selector
├── Current Price
├── 24h Change
├── 24h High
├── 24h Low
└── 24h Volume
```

This matches the layout used by Bybit.

---

# Chart Section

```
ChartSection
┌─────────────────────────────────┐
│ Chart Controls                  │
│ Timeframes | Indicators | Depth │
├─────────────────────────────────┤
│                                 │
│           LiveChart             │
│                                 │
│ Candlestick chart               │
│ Volume bars                     │
│ TP/SL price lines               │
│ Crosshair                       │
│                                 │
└─────────────────────────────────┘
```

No changes are required to the `LiveChart` component.

---

# Order Book Section

```
OrderBookSection
┌──────────────────────────┐
│ Order Book Header        │
│ Order Book | Trades      │
├──────────────────────────┤
│                          │
│     BinanceOrderBook     │
│                          │
│ Asks                     │
│ Spread                   │
│ Bids                     │
│                          │
└──────────────────────────┘
```

This uses the existing `BinanceOrderBook`.

---

# Order Form Section

```
OrderFormSection
┌────────────────────────────┐
│ Buy / Sell Tabs            │
├────────────────────────────┤
│ Order Type                 │
│ Market / Limit / StopLimit │
│                            │
│ Price Input                │
│ Amount Input               │
│ Slider                     │
│                            │
│ Balance Display            │
│                            │
│ Place Order Button         │
└────────────────────────────┘
```

Uses existing:

```
BinanceOrderForm
```

---

# Market Section

The rightmost column stacks two panels vertically.

```
MarketSection
┌────────────────────────────┐
│ BinanceMarketList          │
│                            │
│ Search                     │
│ Filters                    │
│ Trading Pairs              │
│ Pagination                 │
│                            │
└────────────────────────────┘


┌────────────────────────────┐
│ MarketTrades               │
│                            │
│ Real-time trade feed       │
│                            │
│ Price | Amount | Time      │
│ Buy/Sell colors            │
│                            │
└────────────────────────────┘
```

---

# Positions Panel

The positions panel remains **below the main trading grid**.

```
PositionsPanel
┌──────────────────────────────────────┐
│ Open Positions                       │
├──────────────────────────────────────┤
│ Pair | Size | Entry | PnL | Actions  │
└──────────────────────────────────────┘
```

Uses the existing `PositionsPanel` component.

---

# Mobile Layout

Mobile remains **tab-based**, similar to the current implementation.

```
┌─────────────────────────────┐
│ Mobile Header               │
│ Logo | Search | Wallet      │
├─────────────────────────────┤
│ Pair Info                   │
│ BTC/USDT Price Stats        │
├─────────────────────────────┤
│ Tabs                        │
│ Chart | OrderBook | Trades  │
│ Info                        │
├─────────────────────────────┤
│ Tab Content (Scrollable)    │
│                             │
│ LiveChart OR OrderBook      │
│ OR MarketTrades             │
│                             │
├─────────────────────────────┤
│ PositionsPanel              │
├─────────────────────────────┤
│ Fixed Bottom Buttons        │
│ Buy | Sell                  │
└─────────────────────────────┘
```

---

# Component Hierarchy

```
BinanceSpotPage
│
├── Header
│
├── PairHeader
│
├── TradingGrid
│   ├── LiveChart
│   ├── BinanceOrderBook
│   ├── BinanceOrderForm
│   └── MarketSection
│       ├── BinanceMarketList
│       └── MarketTrades
│
├── PositionsPanel
│
└── Modals
    ├── MobileTradingModal
    ├── MobileTokenSearchModal
    ├── InsufficientSolModal
    └── DriftInitializationOverlay
```

---

# Styling System

## Background

```
#0B0E11
```

## Panel Background

```
#181A20
```

## Borders

```
#2B3139
```

## Text Colors

Primary

```
#FFFFFF
```

Secondary

```
#848E9C
```

## Trading Colors

Buy

```
#0ECB81
```

Sell

```
#F6465D
```

---

# Key Bybit Layout Principles Applied

### Chart Dominance

The chart is the **largest panel** and the primary focus.

---

### Trading Controls on Right

Order book and order form are placed **to the right of the chart**, matching professional trading platforms.

---

### Markets and Trades Combined

Markets and recent trades are grouped together in the **rightmost column**.

---

### Positions Below Trading

Open positions appear **below the trading grid**, allowing traders to monitor active positions easily.

---

# Layout Summary

### Previous Layout

```
OrderBook | Chart | Markets
            OrderForm
```

### New Layout (Bybit Style)

```
Chart | OrderBook | OrderForm | Markets
```

with

```
Trades under Markets
Positions under grid
```

---

# Result

This layout achieves a **Bybit-style trading interface** while:

- Keeping **all existing components**
- Keeping **all existing functionality**
- Only changing **layout structure**
- Improving **professional trading usability**