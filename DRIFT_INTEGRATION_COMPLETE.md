# Drift Account Context Integration - Complete

## ✅ What's Been Implemented

### 1. API Endpoints
- ✅ `GET /api/drift/account/status` - Check if user has Drift subaccount
- ✅ `GET /api/drift/account/summary` - Get account collateral, PnL, positions
- ✅ `POST /api/drift/account/initialize` - Initialize new Drift subaccount

### 2. React Context
- ✅ `DriftProvider` - Context provider wrapping the entire app
- ✅ `useDrift()` - Hook to access Drift account state anywhere

### 3. Components
- ✅ `DriftAccountStatus` - Display account status and initialization UI
- ✅ `DriftAccountGuard` - Guard component to protect trading features

### 4. Integration
- ✅ DriftProvider added to main layout
- ✅ Futures page updated to use the context
- ✅ Auto-refresh enabled for real-time updates

---

## 🚀 How to Use

### Basic Usage - Check Account Status

```typescript
import { useDrift } from '@/app/context/driftContext';

function MyComponent() {
  const { 
    isInitialized,      // Is account ready?
    canTrade,           // Can user trade?
    needsInitialization // Needs setup?
  } = useDrift();

  if (needsInitialization) {
    return <div>Please initialize your account</div>;
  }

  if (!canTrade) {
    return <div>Add collateral to trade</div>;
  }

  return <div>Ready to trade!</div>;
}
```

### Display Account Data

```typescript
function AccountInfo() {
  const { summary } = useDrift();

  return (
    <div>
      <p>Collateral: ${summary?.totalCollateral}</p>
      <p>Free: ${summary?.freeCollateral}</p>
      <p>PnL: ${summary?.unrealizedPnl}</p>
      <p>Leverage: {summary?.leverage}x</p>
    </div>
  );
}
```

### Initialize Account

```typescript
function InitButton() {
  const { initializeAccount, status } = useDrift();
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    setLoading(true);
    const result = await initializeAccount();
    
    if (result.success) {
      alert('Account initialized!');
    } else {
      alert(`Error: ${result.error}`);
    }
    
    setLoading(false);
  };

  return (
    <button onClick={handleInit} disabled={loading}>
      Initialize ({status?.initializationCost.sol} SOL)
    </button>
  );
}
```

### Guard Trading Features

```typescript
import { DriftAccountGuard } from '@/components/futures/DriftAccountGuard';

function TradingPanel() {
  return (
    <DriftAccountGuard>
      {/* Only shows when account is ready */}
      <OrderForm />
      <PositionsList />
    </DriftAccountGuard>
  );
}
```

### Auto-Refresh Account Data

```typescript
function FuturesPage() {
  const { startAutoRefresh, stopAutoRefresh } = useDrift();

  useEffect(() => {
    // Refresh every 30 seconds
    startAutoRefresh(30000);
    
    return () => stopAutoRefresh();
  }, []);

  return <div>Trading interface...</div>;
}
```

---

## 📊 Context API Reference

### State Values

```typescript
interface DriftContextValue {
  // Raw data
  status: DriftAccountStatus | null;
  summary: DriftAccountSummary | null;
  
  // Loading/error
  isLoading: boolean;
  error: string | null;
  
  // Computed booleans
  isInitialized: boolean;      // Account exists and ready
  canTrade: boolean;            // Has collateral and safe margin
  needsInitialization: boolean; // Needs to be set up
  
  // Methods
  checkStatus: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  initializeAccount: () => Promise<{ success: boolean; error?: string }>;
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}
```

### Status Object

```typescript
interface DriftAccountStatus {
  exists: boolean;
  initialized: boolean;
  subaccountId: number;
  authority: string;
  requiresInitialization: boolean;
  initializationCost: {
    sol: number;
    usd: number;
  };
  lastUpdated: string;
}
```

### Summary Object

```typescript
interface DriftAccountSummary {
  subaccountId: number;
  publicAddress: string;
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

---

## 🎯 Common Patterns

### Pattern 1: Conditional Rendering

```typescript
const { isInitialized, canTrade, needsInitialization } = useDrift();

if (needsInitialization) return <InitScreen />;
if (!isInitialized) return <LoadingScreen />;
if (!canTrade) return <AddCollateralScreen />;
return <TradingInterface />;
```

### Pattern 2: Account Health Badge

```typescript
const { summary } = useDrift();

const health = summary.marginRatio > 0.5 ? 'healthy'
  : summary.marginRatio > 0.2 ? 'warning'
  : 'danger';

return <Badge color={health}>{health}</Badge>;
```

### Pattern 3: Disable Trading Button

```typescript
const { canTrade, summary } = useDrift();

return (
  <button 
    disabled={!canTrade}
    title={!canTrade ? 'Insufficient margin' : ''}
  >
    Place Order
  </button>
);
```

### Pattern 4: Manual Refresh

```typescript
const { refreshSummary } = useDrift();

const handleDeposit = async () => {
  await depositCollateral();
  await refreshSummary(); // Update account data
};
```

---

## 🔧 Implementation Details

### Caching Strategy
- Status cached for 5 minutes
- Summary cached for 30 seconds
- Cache invalidated on initialization

### Auto-Refresh
- Default interval: 30 seconds
- Automatically stops on unmount
- Only refreshes summary (not status)

### Error Handling
- Network errors caught and exposed via `error` state
- Failed initialization returns `{ success: false, error: string }`
- All errors logged to console

---

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   └── drift/
│   │       └── account/
│   │           ├── status/route.ts       ✅ NEW
│   │           ├── summary/route.ts      ✅ EXISTS
│   │           └── initialize/route.ts   ✅ NEW
│   ├── context/
│   │   └── driftContext.tsx              ✅ NEW
│   └── (DashboardLayout)/
│       ├── layout.tsx                    ✅ UPDATED
│       └── futures/
│           └── page.tsx                  ✅ UPDATED
└── components/
    └── futures/
        ├── DriftAccountStatus.tsx        ✅ NEW
        └── DriftAccountGuard.tsx         ✅ NEW
```

---

## ✅ Testing Checklist

- [ ] User with no Drift account sees initialization prompt
- [ ] Initialization button shows correct SOL cost
- [ ] Initialization succeeds and updates UI
- [ ] Initialized account shows summary data
- [ ] Auto-refresh updates data every 30 seconds
- [ ] Manual refresh button works
- [ ] Trading disabled when margin too low
- [ ] Error messages display correctly
- [ ] Loading states show during API calls
- [ ] Context works across multiple components

---

## 🎨 UI Components Available

### 1. DriftAccountStatus
Full-featured status card with:
- Initialization prompt
- Account summary grid
- Refresh button
- Error/warning states

Usage:
```typescript
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';

<DriftAccountStatus />
```

### 2. DriftAccountGuard
Wrapper that only shows children when ready:
```typescript
import { DriftAccountGuard } from '@/components/futures/DriftAccountGuard';

<DriftAccountGuard>
  <TradingPanel />
</DriftAccountGuard>
```

---

## 🚨 Important Notes

1. **Provider Required**: All components using `useDrift()` must be wrapped in `<DriftProvider>`
2. **Authentication**: User must be logged in (uses `useAuth()` internally)
3. **Backend Dependency**: Requires backend API at `https://trading.watchup.site`
4. **Caching**: Status and summary are cached to reduce API calls
5. **Auto-Refresh**: Remember to call `stopAutoRefresh()` on unmount

---

## 🔄 Migration from Old Code

### Before (Manual API Calls)
```typescript
const [status, setStatus] = useState(null);

useEffect(() => {
  fetch('/api/drift/account/status')
    .then(res => res.json())
    .then(setStatus);
}, []);

if (!status?.initialized) {
  return <div>Not initialized</div>;
}
```

### After (Using Context)
```typescript
const { isInitialized } = useDrift();

if (!isInitialized) {
  return <div>Not initialized</div>;
}
```

---

## 📚 Related Documentation

- `DRIFT_CONTEXT_SPECIFICATION.md` - Full specification
- `DRIFT_FRONTEND_INTEGRATION.md` - Integration guide
- `DRIFT_ACCOUNT_API.md` - API reference

---

## 🎉 Summary

The Drift account context system is now fully integrated! You can:

✅ Check if users have Drift subaccounts set up
✅ Display account status and summary data
✅ Initialize new accounts with one click
✅ Guard trading features based on account state
✅ Auto-refresh account data in real-time
✅ Handle all error states gracefully

The context is available throughout your app via the `useDrift()` hook.
