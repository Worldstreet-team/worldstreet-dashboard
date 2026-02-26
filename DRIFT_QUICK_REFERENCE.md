# Drift Context - Quick Reference Card

## Import
```typescript
import { useDrift } from '@/app/context/driftContext';
```

## Basic Usage
```typescript
const { 
  isInitialized,      // Account ready?
  canTrade,           // Can place orders?
  needsInitialization,// Needs setup?
  summary,            // Account data
  status              // Status info
} = useDrift();
```

## Common Checks

### Is Account Ready?
```typescript
if (!isInitialized) return <LoadingScreen />;
```

### Needs Initialization?
```typescript
if (needsInitialization) return <InitScreen />;
```

### Can Trade?
```typescript
<button disabled={!canTrade}>Place Order</button>
```

## Display Data

### Account Balance
```typescript
<p>${summary?.totalCollateral.toFixed(2)}</p>
```

### Free Collateral
```typescript
<p>${summary?.freeCollateral.toFixed(2)}</p>
```

### PnL
```typescript
<p className={summary?.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}>
  ${summary?.unrealizedPnl.toFixed(2)}
</p>
```

### Leverage
```typescript
<p>{summary?.leverage.toFixed(2)}x</p>
```

### Margin Ratio
```typescript
<p>{(summary?.marginRatio * 100).toFixed(1)}%</p>
```

## Actions

### Initialize Account
```typescript
const { initializeAccount } = useDrift();
const result = await initializeAccount();
if (result.success) {
  // Success!
}
```

### Refresh Data
```typescript
const { refreshSummary } = useDrift();
await refreshSummary();
```

### Auto-Refresh
```typescript
const { startAutoRefresh, stopAutoRefresh } = useDrift();

useEffect(() => {
  startAutoRefresh(30000); // 30 seconds
  return () => stopAutoRefresh();
}, []);
```

## Components

### Status Card
```typescript
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
<DriftAccountStatus />
```

### Guard Wrapper
```typescript
import { DriftAccountGuard } from '@/components/futures/DriftAccountGuard';
<DriftAccountGuard>
  <TradingPanel />
</DriftAccountGuard>
```

## Health Checks

### Margin Health
```typescript
const health = summary.marginRatio > 0.5 ? 'healthy'
  : summary.marginRatio > 0.2 ? 'warning'
  : 'danger';
```

### Can Open Position?
```typescript
const canOpen = canTrade && summary.freeCollateral > minRequired;
```

## Error Handling

### Check Loading
```typescript
if (isLoading) return <Spinner />;
```

### Check Error
```typescript
if (error) return <ErrorMessage message={error} />;
```

## API Endpoints

- `GET /api/drift/account/status` - Check status
- `GET /api/drift/account/summary` - Get summary
- `POST /api/drift/account/initialize` - Initialize

## Types

```typescript
interface DriftAccountStatus {
  exists: boolean;
  initialized: boolean;
  subaccountId: number;
  authority: string;
  requiresInitialization: boolean;
  initializationCost: { sol: number; usd: number };
}

interface DriftAccountSummary {
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  openOrders: number;
  initialized: boolean;
}
```

## Patterns

### Conditional Render
```typescript
if (needsInitialization) return <InitScreen />;
if (!isInitialized) return <LoadingScreen />;
if (!canTrade) return <NoTradeScreen />;
return <TradingInterface />;
```

### After Action Refresh
```typescript
await depositCollateral();
await refreshSummary();
```

### Disable Button
```typescript
<button 
  disabled={!canTrade}
  title={!canTrade ? 'Insufficient margin' : ''}
>
  Trade
</button>
```

## Cache Duration
- Status: 5 minutes
- Summary: 30 seconds

## Auto-Refresh
- Default: 30 seconds
- Stops on unmount

---

**Full Docs**: See `DRIFT_INTEGRATION_COMPLETE.md`
**Examples**: See `DRIFT_USAGE_EXAMPLES.md`
