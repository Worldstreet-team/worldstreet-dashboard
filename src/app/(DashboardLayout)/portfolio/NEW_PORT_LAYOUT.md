# Portfolio Page — Bybit-Style Redesign + Onchain Initialization Modal

## Overview

Completely redesign the Portfolio page to match Bybit's professional trading dashboard aesthetic. Additionally, implement an **onchain initialization detection system** that shows a modal when the user's account is not yet initialized, then redirects them to the Spot page.

---

## Part 1: Onchain Initialization Detection & Modal

### When to Trigger

Show the initialization modal **only when you are highly certain** the account is not initialized onchain. The check should use the `isInitialized` flag from `useDrift()`. If `isClientReady && !isInitialized` after a reasonable loading window (e.g., 2+ seconds), treat the account as uninitialized.

Do **not** show this modal during the initial loading phase — wait until `isClientReady` is `true` and loading has settled before evaluating `isInitialized`.

### Modal Design (Bybit-style, dark theme)

The modal should be a centered overlay with a dark semi-transparent backdrop (`bg-black/60 backdrop-blur-sm`). It must NOT be dismissible by clicking outside — the user must take action.

**Modal content:**

```
┌──────────────────────────────────────────────┐
│  ⚠️  Account Not Initialized                 │
│                                              │
│  Your wallet hasn't been initialized         │
│  on-chain yet. To start trading on           │
│  WorldStreet, you'll need to complete        │
│  a one-time on-chain initialization.         │
│                                              │
│  Estimated cost: ~0.035 SOL                  │
│  (covers rent + transaction fees)            │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Redirecting to Spot page...         │   │  ← appears after 3s auto-redirect
│  │  Initialization may take a couple    │   │
│  │  of minutes to complete.             │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [Go to Spot Page Now]  [Cancel]             │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Show the modal immediately when uninitialized state is confirmed
- After **3 seconds**, begin a countdown and auto-redirect to `/spot`
- Show a progress bar or countdown timer inside the modal
- "Go to Spot Page Now" button redirects immediately using `router.push('/spot')`
- "Cancel" closes the modal and keeps the user on the portfolio page (allows them to view read-only data)
- Use `useRouter` from `next/navigation` for redirect

**Styling:**
- Modal background: `#1e2329` with border `#2b3139`
- Warning icon: amber/yellow `#fcd535`
- SOL cost: highlighted in `#fcd535` font-bold
- Progress bar: animated from 100% to 0% over 3 seconds using CSS transition, color `#fcd535`
- "Go to Spot Page Now" button: `bg-[#fcd535] text-[#181a20]` bold
- "Cancel" button: transparent with `border border-[#2b3139] text-[#848e9c]`

---

## Part 2: Portfolio Page — Bybit-Style Full Redesign

### Layout Structure

Use the same fixed-height approach as the Spot page. The page is `fixed inset-0 flex flex-col overflow-hidden` with a scrollable main content area.

```
┌─────────────────────────────────────────────────┐  ← Fixed App Header (48px) — same as Spot page
├─────────────────────────────────────────────────┤  ← Fixed Page Title Bar (48px)
│                                                 │
│   Scrollable Content Area (flex-1 overflow-y)   │
│   - Summary Cards                               │
│   - Account Metrics                             │
│   - Collateral Panel                            │
│   - Orders Table                                │
│   - Futures Positions Table                     │
│   - Spot Balances                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

The scrollable area uses `overflow-y: auto` with **hidden scrollbar** (`scrollbar-hide` / `scrollbar-width: none`).

### Header Bar (Fixed, 48px)

Match the Spot page header exactly:
- Background: `#0b0e11`
- Border bottom: `#2b3139`
- Left: WorldStreet logo + nav links (Assets, Spot, Futures)
- Right: wallet connect button or account indicator

### Page Title Bar (Fixed, 48px)

A secondary bar below the header (similar to Bybit's sub-header):
- Background: `#0b0e11`
- Border bottom: `#2b3139`
- Left: "Overview" tab (active, underlined in `#fcd535`) | "History" tab | "Reports" tab — tab style navigation
- Right: Refresh button (icon only, circular hover state) + optional Export button

### Summary Cards Row

4 cards in a horizontal row, full width. Use `grid grid-cols-4 gap-0` with dividers between cards instead of gaps (Bybit uses border dividers, not card gaps at the top level).

Each card:
- Background: `#0b0e11`
- Border right: `#2b3139` (between cards)
- Border bottom: `#2b3139` (separates from content below)
- Padding: `px-6 py-4`
- Top label: `text-[11px] text-[#848e9c] uppercase tracking-widest`
- Value: `text-[22px] font-bold text-white`
- Sub-label: `text-[11px] text-[#848e9c]`
- Icon: right-aligned, muted color

Cards: **Total Collateral** | **Free Collateral** | **Unrealized PnL** | **SOL Balance**

For PnL: color the value green `#0ecb81` if positive, red `#f6465d` if negative. Show `+` prefix for positive.

### Account Metrics Row

3 smaller stat pills in a horizontal row below the cards:
- Background: `#161a1e` (slightly darker)
- Border: `#2b3139`
- Border radius: `rounded-lg`
- Show: Leverage %, Margin Ratio %, Open Positions count
- Compact: `px-4 py-3`, smaller text

### Collateral Management Panel

Render `<CollateralManagementPanel />` inside a section with:
- Section header (Bybit table-style): dark bar `bg-[#1e2329]` with title on left, action buttons on right
- The panel itself inherits its own styling

### Data Tables (Orders, Futures Positions, Spot Balances)

All tables must follow Bybit's table style:

**Table wrapper:**
```
bg-[#0b0e11]
border border-[#2b3139]
rounded-none (or very slight: rounded-sm)
```

**Table header row:**
```
bg-[#1a1d23]
text-[11px] text-[#848e9c] uppercase tracking-wider
px-4 py-2.5
border-bottom: #2b3139
```

**Table rows:**
```
bg-[#0b0e11]
hover:bg-[#161a1e]
text-[13px] text-white
px-4 py-2.5
border-bottom: 1px solid #1e2329
transition-colors duration-100
```

**Section headers (above each table):**
```
flex items-center justify-between
px-4 py-3
bg-[#0b0e11]
border-bottom: #2b3139
```
- Left: icon + title (text-[13px] font-semibold text-white) + count badge
- Right: tab row (e.g., "Open Orders | Order History") styled as small underline tabs + refresh icon button

**Tab system for Orders section:**
Replace the current single Orders table with a tab system:
- Tabs: `Open Orders ({count})` | `Order History` | `Trade History`
- Active tab: `text-white border-b-2 border-[#fcd535]`
- Inactive tab: `text-[#848e9c] hover:text-white`
- Tab bar background: `#0b0e11`, border bottom: `#2b3139`

**Side badges:**
- BUY / LONG: `text-[#0ecb81]` (no background, just colored text — Bybit style)
- SELL / SHORT: `text-[#f6465d]`
- SPOT badge: small pill `bg-[#0ecb81]/10 text-[#0ecb81] text-[10px] px-1.5 py-0.5 rounded`
- PERP badge: `bg-[#fcd535]/10 text-[#fcd535]`
- Status OPEN: `text-[#fcd535]`
- Status FILLED: `text-[#0ecb81]`

### Refresh Button System

Replace the current large yellow Refresh button with Bybit's compact approach:
- A small circular icon button with `ph:arrow-clockwise` icon
- Background: transparent, hover: `bg-[#2b3139]`
- Border: `border border-[#2b3139]`
- Border radius: `rounded-full`
- Size: `w-7 h-7`
- Shows a spinning animation when `isRefreshing` is true
- Place this button in the page title bar (top right) and next to each section header

Remove the large `bg-[#fcd535]` "Refresh" button entirely from the top of the content area.

### Empty States

Bybit-style empty states:
- Icon: `ph:inbox-duotone` or similar, `text-[#2b3139]` (very muted), size 40px
- Text: `text-[13px] text-[#848e9c]`
- Sub-text: `text-[11px] text-[#4a5568]`
- No large padding — keep it compact (`py-8`)

### Loading State

Replace the centered spinner with a skeleton loader:
- Show the full page structure (cards, table headers) with shimmer placeholders
- Shimmer: `bg-gradient-to-r from-[#1e2329] via-[#2b3139] to-[#1e2329] bg-[length:200%_100%] animate-shimmer`
- Add keyframe: `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`

### Color Reference

| Token | Value |
|---|---|
| Page background | `#0b0e11` |
| Card / panel background | `#0b0e11` |
| Elevated surface | `#1e2329` |
| Table header | `#1a1d23` |
| Border | `#2b3139` |
| Primary text | `#ffffff` |
| Secondary text | `#848e9c` |
| Muted text | `#4a5568` |
| Accent / yellow | `#fcd535` |
| Green (buy/profit) | `#0ecb81` |
| Red (sell/loss) | `#f6465d` |

### Typography

- All labels/headers: `text-[11px]` or `text-[12px]` uppercase tracking-wide
- Table data: `text-[13px]`
- Card values: `text-[20px]` to `text-[22px]` font-bold
- No large h1/h2 headings — Bybit keeps everything compact and data-dense

### Mobile

On mobile (`< md`):
- Summary cards collapse to `grid-cols-2`
- Tables get `overflow-x-auto` horizontal scroll
- Page title bar collapses to show only the active tab name + refresh button
- Collateral panel stacks vertically

---

## Part 3: Section Ordering

Render sections in this order (top to bottom in the scrollable area):

1. Summary Cards (4-col grid)
2. Account Metrics (3-col compact row)
3. Collateral Management Panel
4. Orders (tabbed: Open / History / Trades)
5. Futures Positions
6. Spot Balances

---

## Part 4: Implementation Notes

- Keep all existing logic, hooks, and data fetching completely unchanged
- Only modify JSX structure and className values
- The `useDrift()` hook, all state variables, and all helper functions stay identical
- Do not add new API calls or data sources
- `isRefreshing` state and `handleRefresh` callback remain unchanged in logic
- The initialization modal check runs **after** `isClientReady` is true — never during loading

---

## Summary Checklist

- [ ] Initialization modal with countdown + auto-redirect to `/spot`
- [ ] Fixed header (48px) matching Spot page style
- [ ] Fixed page title bar (48px) with tab navigation
- [ ] Scrollable content area (hidden scrollbar)
- [ ] 4-col summary cards with border dividers (no gaps)
- [ ] 3-col metrics pills row
- [ ] Bybit table style (dark headers, hover rows, compact padding)
- [ ] Tabbed Orders section (Open / History / Trades)
- [ ] Compact circular refresh buttons (no large yellow button)
- [ ] Bybit color system throughout (`#0b0e11` base)
- [ ] Empty states: compact, muted, icon-led
- [ ] Skeleton loading state
- [ ] Mobile responsive (2-col cards, horizontal scroll tables)