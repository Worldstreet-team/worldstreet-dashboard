# Hyperliquid Integration

This module provides integration with Hyperliquid's spot and perpetual trading platform using the official `@nktkas/hyperliquid` SDK.

## Features

### Market Data
- **Spot Markets**: Get all available spot trading pairs
- **Market Statistics**: 24h price change, volume, high/low prices
- **Order Books**: Real-time bid/ask data
- **Price Feeds**: Current mid prices for all assets

### Trading (Future Implementation)
- **Order Management**: Place, cancel, and modify orders
- **Account Management**: Check balances and positions
- **Withdrawals**: Transfer funds from trading account

## Usage

### Basic Market Data

```typescript
import { HyperliquidService } from '@/lib/hyperliquid/client';

const hyperliquid = new HyperliquidService({
  testnet: process.env.NODE_ENV !== 'production'
});

// Get all spot markets (fast, basic data)
const markets = await hyperliquid.getSpotMarkets();

// Get markets with 24h statistics (slower, complete data)
const marketsWithStats = await hyperliquid.getSpotMarketStats();

// Get specific market data
const btcData = await hyperliquid.getMarketData('BTC');

// Get order book
const orderBook = await hyperliquid.getSpotOrderBook('BTC');
```

### React Hook

```typescript
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';

function MarketList() {
  const { markets, loading, error } = useHyperliquidMarkets({
    includeStats: true,
    refreshInterval: 10000
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {markets.map(market => (
        <div key={market.symbol}>
          {market.symbol}: ${market.price}
        </div>
      ))}
    </div>
  );
}
```

### API Endpoints

- `GET /api/hyperliquid/test` - Test connection and basic functionality
- `GET /api/hyperliquid/markets` - Get spot market data
- `GET /api/hyperliquid/markets?stats=true` - Get markets with 24h statistics

## Components

### HyperliquidMarketList
A complete market list component for spot trading interfaces:

```typescript
import HyperliquidMarketList from '@/components/spot/HyperliquidMarketList';

<HyperliquidMarketList
  selectedPair={selectedPair}
  onSelectPair={(pair, chain) => setSelectedPair(pair)}
  includeStats={true}
/>
```

### Integration with BinanceMarketList
The existing BinanceMarketList component now supports Hyperliquid markets:

```typescript
<BinanceMarketList
  selectedPair={selectedPair}
  onSelectPair={onSelectPair}
  marketSource="hyperliquid" // or "drift" or "both"
/>
```

## Configuration

The service automatically detects testnet vs mainnet based on `NODE_ENV`:
- **Development**: Uses Hyperliquid testnet
- **Production**: Uses Hyperliquid mainnet

## SDK Alignment

This implementation follows the official `@nktkas/hyperliquid` SDK patterns:
- Uses `InfoClient` for read-only operations (market data, account info)
- Uses `ExchangeClient` for trading operations (orders, withdrawals)
- No custom wrapper classes or authorization context attachment
- Proper parameter objects for all API calls

## Error Handling

All methods include comprehensive error handling:
- Network failures are caught and logged
- Invalid parameters return appropriate errors
- New accounts return empty state instead of errors
- Fallback data is provided when statistics are unavailable

## Performance

- **Basic Markets**: Fast response, current prices only
- **Market Stats**: Slower response, includes 24h data via multiple API calls
- **Caching**: 10-second refresh intervals prevent excessive API calls
- **Filtering**: Client-side search and filtering for responsive UI