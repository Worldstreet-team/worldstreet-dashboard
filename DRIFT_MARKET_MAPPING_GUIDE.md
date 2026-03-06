# Drift Perp Market Stable Mapping Guide

## Problem

Drift SDK's perp market array order isn't guaranteed to be stable between sessions or SDK updates. Using array position to determine market names causes UI inconsistencies where a market at position 0 today might be at position 5 tomorrow.

## Solution

Use the on-chain `marketIndex` (a unique numeric ID) as the stable key and map it to the market's `symbol` name. This ensures market names remain consistent regardless of SDK changes.

## Implementation

### 1. Market Mapping Structure

```typescript
interface PerpMarketInfo {
  marketIndex: number;      // Stable on-chain ID (e.g., 0, 1, 2...)
  symbol: string;            // Market name (e.g., "SOL-PERP", "BTC-PERP")
  baseAssetSymbol: string;   // Base asset (e.g., "SOL", "BTC")
  initialized: boolean;      // Whether market is active
}

// Stable mapping: marketIndex → market info
const perpMarkets: Map<number, PerpMarketInfo>
```

### 2. Building the Mapping

The mapping is built once when the Drift client initializes:

```typescript
const buildPerpMarketMapping = async (client: DriftClient) => {
  const marketMap = new Map<number, PerpMarketInfo>();
  
  // Get all perp market accounts
  const perpMarketAccounts = client.getPerpMarketAccounts();
  
  for (const market of perpMarketAccounts) {
    const marketIndex = market.marketIndex; // Stable ID
    
    // Extract symbol from name buffer
    const symbol = Buffer.from(market.name)
      .toString('utf8')
      .replace(/\0/g, '')
      .trim();
    
    marketMap.set(marketIndex, {
      marketIndex,
      symbol,
      baseAssetSymbol: symbol.split('-')[0],
      initialized: true,
    });
  }
  
  return marketMap;
};
```

### 3. Using the Mapping in UI

#### Display Position Market Names

```typescript
import { useDrift } from '@/app/context/driftContext';

function PositionsList() {
  const { positions, getMarketName } = useDrift();
  
  return (
    <div>
      {positions.map((position) => (
        <div key={position.marketIndex}>
          {/* Use stable market name from mapping */}
          <h3>{position.marketName}</h3>
          
          {/* Or use helper function */}
          <h3>{getMarketName(position.marketIndex)}</h3>
          
          <p>Direction: {position.direction}</p>
          <p>Size: {position.baseAmount}</p>
          <p>PnL: ${position.unrealizedPnl.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Market Selector Dropdown

```typescript
function MarketSelector() {
  const { perpMarkets, getMarketName } = useDrift();
  const [selectedMarket, setSelectedMarket] = useState<number>(0);
  
  return (
    <select 
      value={selectedMarket}
      onChange={(e) => setSelectedMarket(Number(e.target.value))}
    >
      {Array.from(perpMarkets.entries()).map(([marketIndex, info]) => (
        <option key={marketIndex} value={marketIndex}>
          {info.symbol}
        </option>
      ))}
    </select>
  );
}
```

#### Opening a Position (Use marketIndex for transactions)

```typescript
function TradeForm() {
  const { openPosition, getMarketName } = useDrift();
  const [marketIndex, setMarketIndex] = useState(0);
  
  const handleTrade = async () => {
    // ALWAYS use numeric marketIndex for transactions
    const result = await openPosition(
      marketIndex,  // Use the stable numeric ID
      'long',
      1.0,
      10
    );
    
    if (result.success) {
      // Display using stable name
      console.log(`Opened position on ${getMarketName(marketIndex)}`);
    }
  };
  
  return (
    <button onClick={handleTrade}>
      Open Long on {getMarketName(marketIndex)}
    </button>
  );
}
```

### 4. Accessing Market Details

```typescript
function MarketDetails({ marketIndex }: { marketIndex: number }) {
  const { perpMarkets, getMarketName } = useDrift();
  
  const marketInfo = perpMarkets.get(marketIndex);
  
  if (!marketInfo) {
    return <div>Market not found</div>;
  }
  
  return (
    <div>
      <h2>{marketInfo.symbol}</h2>
      <p>Market Index: {marketInfo.marketIndex}</p>
      <p>Base Asset: {marketInfo.baseAssetSymbol}</p>
      <p>Status: {marketInfo.initialized ? 'Active' : 'Inactive'}</p>
    </div>
  );
}
```

### 5. Filtering Markets

```typescript
function MarketList() {
  const { perpMarkets } = useDrift();
  
  // Get all SOL markets
  const solMarkets = Array.from(perpMarkets.values())
    .filter(market => market.baseAssetSymbol === 'SOL');
  
  // Get all active markets
  const activeMarkets = Array.from(perpMarkets.values())
    .filter(market => market.initialized);
  
  return (
    <div>
      <h3>SOL Markets</h3>
      {solMarkets.map(market => (
        <div key={market.marketIndex}>{market.symbol}</div>
      ))}
    </div>
  );
}
```

## Edge Cases

### 1. New Markets Added

When Drift adds new markets, they get a new unique `marketIndex`. The mapping automatically includes them on the next refresh:

```typescript
// Refresh market mapping periodically
useEffect(() => {
  const interval = setInterval(async () => {
    if (driftClient) {
      const newMapping = await buildPerpMarketMapping(driftClient);
      setPerpMarkets(newMapping);
    }
  }, 60000); // Refresh every minute
  
  return () => clearInterval(interval);
}, [driftClient]);
```

### 2. Market Not Found

Always provide a fallback when a market isn't in the mapping:

```typescript
const getMarketName = (marketIndex: number): string => {
  const marketInfo = perpMarkets.get(marketIndex);
  return marketInfo?.symbol || `Market ${marketIndex}`;
};
```

### 3. Market Deactivated

Check the `initialized` flag before allowing trades:

```typescript
const canTradeMarket = (marketIndex: number): boolean => {
  const marketInfo = perpMarkets.get(marketIndex);
  return marketInfo?.initialized ?? false;
};
```

### 4. SDK Version Changes

The `marketIndex` is an on-chain property and never changes, even across SDK versions. Your mapping remains valid.

## Best Practices

### ✅ DO

- **Always use `marketIndex` for transactions** (orders, positions, closures)
- **Always use `symbol` for UI display** (charts, lists, labels)
- **Store `marketIndex` in your database** for historical records
- **Refresh the mapping periodically** to catch new markets
- **Provide fallbacks** for missing markets

### ❌ DON'T

- **Don't use array position** to identify markets
- **Don't hardcode market names** based on index
- **Don't assume market order** is stable
- **Don't use symbol for transactions** (use marketIndex)

## Example: Complete Trading Component

```typescript
import { useDrift } from '@/app/context/driftContext';
import { useState } from 'react';

function TradingPanel() {
  const { 
    perpMarkets, 
    getMarketName, 
    openPosition, 
    positions 
  } = useDrift();
  
  const [selectedMarket, setSelectedMarket] = useState(0);
  const [size, setSize] = useState(1);
  
  // Get current position for selected market
  const currentPosition = positions.find(
    p => p.marketIndex === selectedMarket
  );
  
  const handleTrade = async (direction: 'long' | 'short') => {
    // Use numeric marketIndex for transaction
    const result = await openPosition(selectedMarket, direction, size, 10);
    
    if (result.success) {
      // Display using stable name
      alert(`Opened ${direction} on ${getMarketName(selectedMarket)}`);
    }
  };
  
  return (
    <div>
      {/* Market Selector */}
      <select 
        value={selectedMarket}
        onChange={(e) => setSelectedMarket(Number(e.target.value))}
      >
        {Array.from(perpMarkets.entries()).map(([idx, info]) => (
          <option key={idx} value={idx}>
            {info.symbol}
          </option>
        ))}
      </select>
      
      {/* Current Position */}
      {currentPosition && (
        <div>
          <h3>Current Position: {currentPosition.marketName}</h3>
          <p>Direction: {currentPosition.direction}</p>
          <p>Size: {currentPosition.baseAmount}</p>
          <p>PnL: ${currentPosition.unrealizedPnl.toFixed(2)}</p>
        </div>
      )}
      
      {/* Trade Buttons */}
      <input 
        type="number" 
        value={size} 
        onChange={(e) => setSize(Number(e.target.value))}
      />
      <button onClick={() => handleTrade('long')}>
        Long {getMarketName(selectedMarket)}
      </button>
      <button onClick={() => handleTrade('short')}>
        Short {getMarketName(selectedMarket)}
      </button>
    </div>
  );
}
```

## Summary

- **marketIndex** = Stable on-chain ID (use for transactions)
- **symbol** = Human-readable name (use for UI)
- **Map<marketIndex, symbol>** = Stable mapping that survives SDK changes
- **Build once, use everywhere** = Create mapping on client init
- **Refresh periodically** = Catch new markets as they're added

This approach ensures your UI displays consistent market names regardless of SDK version, session restarts, or array order changes.
