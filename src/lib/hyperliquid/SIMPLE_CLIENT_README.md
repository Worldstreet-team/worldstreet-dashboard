# Simple Hyperliquid Client

This directory contains a simplified Hyperliquid client implementation that provides rate-limited access to Hyperliquid's spot trading data.

## Files

### `simple.ts`
- **SimpleHyperliquidClient**: A lightweight client class with built-in rate limiting
- **Rate Limiting**: 100ms minimum interval between requests to prevent 429 errors
- **Methods**:
  - `getSpotMarkets()`: Get basic spot market data (fast)
  - `getSpotMarketStats()`: Get spot markets with 24h statistics (slower, batched)
  - `getOrderBook(asset)`: Get L2 orderbook for a specific asset
  - `getRecentTrades(asset)`: Get recent trades for a specific asset
  - `getAllMidPrices()`: Get current mid prices for all assets

### `client.ts`
- **HyperliquidService**: Full-featured client with advanced rate limiting and retry logic
- **Features**:
  - Exponential backoff retry for 429 errors
  - Request queuing system
  - Batch processing for market stats
  - Caching support

## Usage

### Basic Usage (Recommended)
```typescript
import { hyperliquid } from '@/lib/hyperliquid/simple';

// Get spot markets
const markets = await hyperliquid.getSpotMarkets();

// Get markets with statistics (slower)
const marketsWithStats = await hyperliquid.getSpotMarketStats();

// Get orderbook
const orderbook = await hyperliquid.getOrderBook('BTC/USD');

// Get recent trades
const trades = await hyperliquid.getRecentTrades('ETH/USD');
```

### With React Hooks
```typescript
import { useSimpleHyperliquid, useHyperliquidOrderbook } from '@/hooks/useSimpleHyperliquid';

// In component
const { markets, loading, error } = useSimpleHyperliquid({
  includeStats: true,
  refreshInterval: 10000
});

const { orderbook } = useHyperliquidOrderbook('BTC/USD');
```

## Components

### Market Lists
- **BinanceMarketList**: Updated to use simple Hyperliquid client
- **MarketList**: Updated to use simple Hyperliquid client
- **SimpleOrderBook**: New component for displaying orderbook data
- **SimpleTrades**: New component for displaying recent trades

## API Routes

### `/api/hyperliquid/markets`
- Cached market data with rate limiting
- Query params: `?stats=true` for 24h statistics

### `/api/hyperliquid/orderbook`
- Query params: `?symbol=BTC/USD`
- Returns formatted orderbook data

### `/api/hyperliquid/trades`
- Query params: `?symbol=ETH/USD`
- Returns recent trades data

## Rate Limiting Strategy

1. **Client-side**: 100ms minimum interval between requests
2. **Batching**: Market stats processed in batches of 3-5 assets
3. **Delays**: 200-300ms delays between batches
4. **Retry Logic**: Exponential backoff for 429 errors
5. **Caching**: 30-second cache for market data API

## Error Handling

- **429 Too Many Requests**: Automatic retry with exponential backoff
- **Network Errors**: Retry logic for connection issues
- **Graceful Degradation**: Return basic data when stats fail
- **User Feedback**: Clear error messages and retry buttons

## Performance Optimizations

1. **Singleton Instance**: Single client instance shared across app
2. **Request Queuing**: Prevents concurrent request overload
3. **Selective Stats**: Only fetch statistics when needed
4. **Component-level Caching**: Hooks manage their own refresh intervals
5. **Batch Processing**: Reduce API calls for market statistics

## Migration Notes

- Replaced `useHyperliquidMarkets` hook with `useSimpleHyperliquid`
- Direct client usage for better control over rate limiting
- Simplified error handling and loading states
- Removed dependency on complex service layer for basic operations