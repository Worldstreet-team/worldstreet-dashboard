# KuCoin API Integration

All spot trading components now use real-time data from KuCoin API through Next.js API routes (backend proxy) instead of direct frontend calls.

## Architecture

### Backend API Routes (src/app/api/kucoin/)

1. **ticker/route.ts** - Fetches market statistics for a symbol
   - Endpoint: `GET /api/kucoin/ticker?symbol=BTCUSDT`
   - Proxies: `https://api.kucoin.com/api/v1/market/stats`

2. **trades/route.ts** - Fetches recent trade history
   - Endpoint: `GET /api/kucoin/trades?symbol=BTCUSDT`
   - Proxies: `https://api.kucoin.com/api/v1/market/histories`

3. **websocket-token/route.ts** - Gets WebSocket connection token
   - Endpoint: `GET /api/kucoin/websocket-token`
   - Proxies: `https://api.kucoin.com/api/v1/bullet-public`

### Frontend Components

All components now call our Next.js API routes instead of KuCoin directly.

## Updated Components

### 1. MarketTicker.tsx
- **API**: `/api/kucoin/ticker`
- **Update Frequency**: 10 seconds
- **Data**: Price, 24h change, 24h volume for all trading pairs
- **Features**: Parallel fetching for all pairs, error handling with retry

### 2. BinanceOrderBook.tsx
- **API**: `/api/kucoin/websocket-token` (for connection setup)
- **WebSocket**: Direct connection to KuCoin WebSocket with token
- **Topic**: `/spotMarket/level2Depth50`
- **Data**: Top 15 bids and asks with depth visualization
- **Features**: 
  - Real-time updates
  - Auto-reconnection on disconnect
  - Live connection status indicator
  - Proper depth percentage calculation

### 3. MobileOrderBook.tsx
- **API**: `/api/kucoin/websocket-token` (for connection setup)
- **WebSocket**: Direct connection to KuCoin WebSocket with token
- **Topic**: `/spotMarket/level2Depth5`
- **Data**: Top 5 bids and asks
- **Features**:
  - Mobile-optimized layout
  - Real-time updates
  - Auto-reconnection
  - Connection status indicator

### 4. MarketTrades.tsx
- **API**: `/api/kucoin/trades`
- **Update Frequency**: 3 seconds
- **Data**: Recent market trades with price, amount, time, and side
- **Features**: Loading and error states

## Symbol Format

KuCoin uses symbols without dashes:
- Our format: `BTC-USDT`
- KuCoin format: `BTCUSDT`

Conversion is handled automatically in each component using:
```typescript
const kucoinSymbol = selectedPair.replace('-', '');
```

## WebSocket Connection Flow

1. Frontend calls `/api/kucoin/websocket-token`
2. Backend fetches token from KuCoin
3. Frontend receives token and WebSocket server URL
4. Frontend establishes WebSocket connection with token
5. Frontend subscribes to desired topics

Note: WebSocket connections are direct to KuCoin (not proxied) because WebSocket proxying is complex and adds latency. The token-based authentication ensures security.

## Benefits of Backend Proxy

1. **Security**: API keys (if needed in future) stay on server
2. **Rate Limiting**: Can implement server-side rate limiting
3. **Caching**: Can add caching layer for frequently requested data
4. **Monitoring**: Centralized logging and error tracking
5. **Flexibility**: Easy to switch providers or add fallbacks
6. **CORS**: No CORS issues with external APIs

## Rate Limits

KuCoin free tier provides generous rate limits:
- REST API: No strict limits for public endpoints
- WebSocket: Multiple concurrent connections allowed
- Update frequency optimized to balance real-time data with API usage

## Error Handling

All API routes include:
- Try-catch error handling
- Proper HTTP status codes
- Error logging
- Graceful degradation in frontend

## Future Enhancements

1. Add Redis caching for ticker data
2. Implement rate limiting middleware
3. Add request/response logging
4. Create fallback to alternative data sources
5. Add WebSocket connection pooling

