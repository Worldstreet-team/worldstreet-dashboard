# Spot Trading Interface

A comprehensive spot trading interface with real-time market data, live charts, and WebSocket integration.

## Features

### 1. Market Ticker
- Displays 6 popular trading pairs: BTC-USDT, ETH-USDT, BNB-USDT, SOL-USDT, XRP-USDT, ADA-USDT
- Shows real-time price, 24h change percentage, and volume
- Click any pair to switch the active trading chart
- Horizontal scrollable on mobile devices
- Auto-updates every 5 seconds

### 2. Live Chart System
- Real-time candlestick chart with WebSocket updates
- Connects to backend API: `wss://trading.watchup.site`
- Supports 1-minute and 5-minute intervals
- Features:
  - OHLC (Open, High, Low, Close) data display
  - Stop Loss and Take Profit level visualization
  - Interactive level setting form
  - Auto-updating with WebSocket messages
  - Keeps last 100 candles in memory

### 3. Trading Panel
- Order placement interface (Buy/Sell)
- Order types: Limit, Market, Stop-Limit
- Quick percentage buttons (25%, 50%, 75%, 100%)
- Balance and available funds display
- Market info sidebar with 24h statistics

### 4. Recent Orders Table
- Displays order history
- Columns: Time, Pair, Type, Price, Amount, Total, Status
- Empty state for no orders

## API Routes

### GET `/api/market/[symbol]/klines`
Fetches historical candlestick data from the backend.

**Parameters:**
- `symbol` (path): Trading pair (e.g., BTC-USDT)
- `type` (query): Interval - '1min' or '5min'
- `startAt` (query): Start timestamp (Unix seconds)
- `endAt` (query): End timestamp (Unix seconds)

**Backend URL:** `https://trading.watchup.site/api/market/{symbol}/klines`

**Response Format:**
```json
{
  "data": [
    [timestamp, open, close, high, low, volume, turnover],
    ...
  ]
}
```

## WebSocket Integration

### Connection
- URL: `wss://trading.watchup.site`
- Auto-reconnects on symbol or interval change

### Subscribe Message
```json
{
  "type": "subscribe",
  "symbol": "BTC-USDT",
  "interval": "1min"
}
```

### Candle Update Message
```json
{
  "data": {
    "candles": [timestamp, open, close, high, low, volume, turnover]
  }
}
```

## Components

### MarketTicker
**Location:** `src/components/spot/MarketTicker.tsx`

**Props:**
- `selectedPair: string` - Currently selected trading pair
- `onSelectPair: (pair: string) => void` - Callback when pair is selected

### LiveChart
**Location:** `src/components/spot/LiveChart.tsx`

**Props:**
- `symbol: string` - Trading pair to display
- `stopLoss?: string` - Stop loss price level
- `takeProfit?: string` - Take profit price level
- `onUpdateLevels?: (sl: string, tp: string) => void` - Callback for level updates

## Responsive Design

The interface is fully responsive across all screen sizes:

- **Mobile (< 640px):** Single column layout, horizontal scrolling ticker
- **Tablet (640px - 1024px):** Stacked layout with full-width components
- **Desktop (> 1024px):** 3-column grid with chart taking 2 columns

## Styling

Matches the existing dashboard theme:
- Uses Tailwind CSS utility classes
- Dark mode support with `dark:` variants
- Consistent color scheme:
  - Primary: Blue (#3b82f6)
  - Success: Green (#10b981)
  - Error: Red (#ef4444)
  - Muted: Gray tones
- Smooth transitions and hover effects
- Iconify React icons for consistent iconography

## Usage

```tsx
import { MarketTicker, LiveChart } from '@/components/spot';

function SpotPage() {
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  return (
    <>
      <MarketTicker 
        selectedPair={selectedPair} 
        onSelectPair={setSelectedPair} 
      />
      
      <LiveChart 
        symbol={selectedPair}
        stopLoss={stopLoss}
        takeProfit={takeProfit}
        onUpdateLevels={(sl, tp) => {
          setStopLoss(sl);
          setTakeProfit(tp);
        }}
      />
    </>
  );
}
```

## Future Enhancements

- Order book integration
- Trade execution functionality
- Real-time balance updates
- Advanced charting indicators (RSI, MACD, etc.)
- Multiple chart layouts
- Price alerts
- Trading history with filters
