# Fullscreen Trading Layout Fix

## Problem
The futures and spot pages had unwanted padding and positioning offsets from the main app layout:
- `top-[64px]` - Offset for main app header
- `left-0 xl:left-[260px]` - Offset for sidebar
- These offsets prevented true fullscreen trading experience

## Solution
Updated the futures page to use `fixed inset-0` for true fullscreen layout with its own discrete header.

## Changes Made

### Before
```typescript
<div className="hidden md:block fixed inset-0 top-[64px] left-0 xl:left-[260px] bg-[#0a0a0a]">
  {/* Had 64px top offset and 260px left offset */}
</div>
```

### After
```typescript
<div className="hidden md:block fixed inset-0 bg-[#0a0a0a]">
  {/* True fullscreen - no offsets */}
  
  {/* Custom Trading Header */}
  <div className="h-14 px-6 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5">
    {/* Market selector, price display, account info */}
  </div>
  
  {/* Trading Layout */}
  <div className="h-[calc(100%-56px)] flex">
    {/* Market List | Chart | Order Book */}
  </div>
</div>
```

## New Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Custom Trading Header (56px)                                │
│  - Market Selector                                           │
│  - Price Display                                             │
│  - Account Status (Available Balance, PnL)                   │
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

## Custom Trading Header Features

### Left Side
- **Market Selector Dropdown**
  - Shows current market (e.g., "SOL-PERP")
  - Click to open dropdown with all available markets
  - Displays price for each market

- **Price Display**
  - Last price with color coding (green/red)
  - 24h change percentage
  - Compact and always visible

### Right Side
- **Account Status**
  - Available balance (free collateral)
  - Unrealized PnL with color coding
  - Only shows when Drift account is initialized

## Benefits

1. **True Fullscreen**: No wasted space from main app header/sidebar
2. **Discrete Header**: Trading-specific header with relevant info only
3. **Professional Look**: Matches industry-standard trading platforms
4. **Better Space Utilization**: More room for chart and order book
5. **Context-Aware**: Header shows trading-specific information

## Layout Behavior

### Desktop (md and up)
- Fullscreen trading interface
- Custom header replaces main app header
- Three-column layout with market list, chart, and order book
- No sidebar visible

### Mobile
- Tab-based navigation (Chart, Positions, Info)
- Compact header with market selector
- Bottom action buttons (Long/Short)
- Optimized for touch interactions

## How It Works with Main Layout

The main dashboard layout (`src/app/(DashboardLayout)/layout.tsx`) already has logic for fullscreen routes:

```typescript
const FULLSCREEN_ROUTES = ["/vivid", "/spot", "/futures", "/portfolio"];
const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r));

// In layout render:
{!isFullscreen && <Sidebar />}
{!isFullscreen && <Header />}
```

This means:
- Main app header is hidden ✅
- Sidebar is hidden ✅
- No padding/margins applied ✅
- Page gets full viewport ✅

## CSS Classes Used

### Fullscreen Container
```css
fixed inset-0  /* Position: fixed, top/right/bottom/left: 0 */
```

### Custom Header
```css
h-14           /* Height: 56px (3.5rem) */
bg-black/40    /* Semi-transparent black background */
backdrop-blur-xl /* Blur effect for glassmorphism */
border-b border-white/5 /* Subtle bottom border */
```

### Content Area
```css
h-[calc(100%-56px)]  /* Full height minus header */
flex                  /* Flexbox for columns */
```

## Testing Checklist

- [x] Desktop shows fullscreen layout
- [x] No main app header visible
- [x] No sidebar visible
- [x] Custom trading header displays correctly
- [x] Market selector works
- [x] Price updates in header
- [x] Account status shows when initialized
- [x] Three columns display properly
- [x] Mobile layout still works
- [x] No scrollbars on main container
- [x] All components fit within viewport

## Related Files
- `src/app/(DashboardLayout)/futures/page.tsx` - Futures page with fullscreen layout
- `src/app/(DashboardLayout)/layout.tsx` - Main layout with fullscreen route detection
- `src/app/(DashboardLayout)/spot/page.tsx` - Spot page (should use same pattern)

## Future Improvements

1. **Add Navigation**: Back button or breadcrumb to return to dashboard
2. **Theme Toggle**: Add theme switcher to custom header
3. **Notifications**: Add notification bell to header
4. **Settings**: Quick access to trading settings
5. **Keyboard Shortcuts**: Add hotkeys for common actions

## Notes
- The custom header height is 56px (h-14) to keep it compact
- Account status only shows when user has initialized Drift account
- Price display uses same color coding as main chart (green/red)
- Header is sticky and always visible during scroll
- All interactive elements have proper hover/active states
