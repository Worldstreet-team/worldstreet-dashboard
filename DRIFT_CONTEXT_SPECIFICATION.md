# Drift SDK Context/Hook Specification

## Overview
A React context and hook system to manage Drift Protocol account status, initialization state, and provide real-time updates about the user's futures trading account.

---

## Architecture

### 1. Context Provider: `DriftProvider`
Wraps the application (or futures section) to provide Drift account state globally.

### 2. Hook: `useDrift()`
Custom hook to access Drift account state and methods from any component.

---

## Expected API Endpoints (Backend)

### 1. Check Drift Account Status
**Endpoint**: `GET /api/drift/account/status`

**Query Parameters**:
- `userId` (required): User identifier

**Response**:
```json
{
  "exists": true,
  "initialized": true,
  "subaccountId": 0,
  "authority": "ABC123...XYZ789",
  "requiresInitialization": false,
  "initializationCost": {
    "sol": 0.035,
    "usd": 5.25
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

**Response Fields**:
- `exists`: Boolean - Does the Drift subaccount exist on-chain?
- `initialized`: Boolean - Is the subaccount fully initialized and ready to trade?
- `subaccountId`: Number - The subaccount ID (usually 0)
- `authority`: String - The wallet address that controls this subaccount
- `requiresInitialization`: Boolean - Does the user need to pay initialization fee?
- `initializationCost`: Object - Cost breakdown for initialization
  - `sol`: Number - SOL required for rent + fees
  - `usd`: Number - Approximate USD value
- `lastUpdated`: String - ISO timestamp of last check

**Error Response (404)**:
```json
{
  "exists": false,
  "initialized": false,
  "requiresInitialization": true,
  "message": "Drift subaccount not found. Initialization required."
}
```

---

### 2. Get Account Summary
**Endpoint**: `GET /api/drift/account/summary`

**Query Parameters**:
- `userId` (required): User identifier

**Response**:
```json
{
  "initialized": true,
  "totalCollateral": 100.50,
  "freeCollateral": 85.25,
  "unrealizedPnl": 5.75,
  "leverage": 2.5,
  "marginRatio": 0.85,
  "openPositions": 2,
  "openOrders": 1,
  "health": "healthy",
  "canTrade": true
}
```

**Response Fields**:
- `initialized`: Boolean - Account ready for trading
- `totalCollateral`: Number - Total USDC deposited
- `freeCollateral`: Number - Available USDC for new positions
- `unrealizedPnl`: Number - Current unrealized profit/loss
- `leverage`: Number - Current account leverage
- `marginRatio`: Number - Margin ratio (0-1, higher is safer)
- `openPositions`: Number - Count of open positions
- `openOrders`: Number - Count of pending orders
- `health`: String - "healthy" | "warning" | "danger"
- `canTrade`: Boolean - Can user open new positions?

---

### 3. Initialize Drift Account
**Endpoint**: `POST /api/drift/account/initialize`

**Request Body**:
```json
{
  "userId": "user_123"
}
```

**Response**:
```json
{
  "success": true,
  "subaccountId": 0,
  "txSignature": "5J7Kq...",
  "message": "Drift subaccount initialized successfully",
  "cost": {
    "sol": 0.035,
    "usd": 5.25
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Insufficient SOL in master wallet",
  "message": "Need 0.035 SOL to initialize subaccount",
  "requiredSol": 0.035,
  "availableSol": 0.01
}
```

---

## Frontend Implementation

### Context Structure

```typescript
// src/app/context/driftContext.tsx

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

interface DriftAccountSummary {
  initialized: boolean;
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  openOrders: number;
  health: 'healthy' | 'warning' | 'danger';
  canTrade: boolean;
}

interface DriftContextValue {
  // State
  status: DriftAccountStatus | null;
  summary: DriftAccountSummary | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed values
  isInitialized: boolean;
  canTrade: boolean;
  needsInitialization: boolean;
  
  // Methods
  checkStatus: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  initializeAccount: () => Promise<{ success: boolean; error?: string }>;
  
  // Auto-refresh control
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}
```

---

### Hook Usage Examples

#### Example 1: Check if user can trade
```typescript
import { useDrift } from '@/app/context/driftContext';

function OrderPanel() {
  const { isInitialized, canTrade, needsInitialization, status } = useDrift();
  
  if (needsInitialization) {
    return (
      <div>
        <p>Drift account needs initialization</p>
        <p>Cost: {status?.initializationCost.sol} SOL (~${status?.initializationCost.usd})</p>
        <button onClick={handleInitialize}>Initialize Account</button>
      </div>
    );
  }
  
  if (!canTrade) {
    return <div>Account not ready for trading</div>;
  }
  
  return <div>Order form...</div>;
}
```

#### Example 2: Display account health
```typescript
function AccountHealthBadge() {
  const { summary, isLoading } = useDrift();
  
  if (isLoading || !summary) return <Spinner />;
  
  const healthColor = {
    healthy: 'green',
    warning: 'yellow',
    danger: 'red'
  }[summary.health];
  
  return (
    <Badge color={healthColor}>
      {summary.health.toUpperCase()}
    </Badge>
  );
}
```

#### Example 3: Initialize account
```typescript
function InitializeAccountButton() {
  const { initializeAccount, status, isLoading } = useDrift();
  const [initializing, setInitializing] = useState(false);
  
  const handleInitialize = async () => {
    setInitializing(true);
    const result = await initializeAccount();
    
    if (result.success) {
      toast.success('Account initialized successfully!');
    } else {
      toast.error(result.error || 'Failed to initialize account');
    }
    
    setInitializing(false);
  };
  
  return (
    <button 
      onClick={handleInitialize}
      disabled={initializing || isLoading}
    >
      {initializing ? 'Initializing...' : `Initialize (${status?.initializationCost.sol} SOL)`}
    </button>
  );
}
```

#### Example 4: Auto-refresh account data
```typescript
function FuturesPage() {
  const { startAutoRefresh, stopAutoRefresh } = useDrift();
  
  useEffect(() => {
    // Refresh every 10 seconds
    startAutoRefresh(10000);
    
    return () => {
      stopAutoRefresh();
    };
  }, []);
  
  return <div>Futures trading interface...</div>;
}
```

#### Example 5: Conditional rendering based on status
```typescript
function FuturesTradingInterface() {
  const { 
    isInitialized, 
    needsInitialization, 
    canTrade, 
    summary,
    isLoading 
  } = useDrift();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (needsInitialization) {
    return <InitializationRequiredScreen />;
  }
  
  if (!isInitialized) {
    return <AccountNotReadyScreen />;
  }
  
  if (!canTrade) {
    return (
      <div>
        <p>Trading disabled</p>
        <p>Reason: {summary?.health === 'danger' ? 'Low margin' : 'Unknown'}</p>
      </div>
    );
  }
  
  return <TradingInterface />;
}
```

---

## Context Provider Implementation

### Provider Setup
```typescript
// In app layout or futures layout
import { DriftProvider } from '@/app/context/driftContext';

export default function FuturesLayout({ children }) {
  return (
    <DriftProvider>
      {children}
    </DriftProvider>
  );
}
```

### Provider Features

1. **Automatic Status Check on Mount**
   - Checks Drift account status when provider mounts
   - Caches result to avoid repeated API calls

2. **Auto-Refresh**
   - Optional automatic refresh of account data
   - Configurable interval (default: 30 seconds)
   - Can be started/stopped programmatically

3. **Error Handling**
   - Catches and exposes API errors
   - Provides error messages to UI
   - Retries on network failures

4. **Loading States**
   - Tracks loading state for all operations
   - Prevents duplicate API calls
   - Shows loading indicators in UI

5. **Optimistic Updates**
   - Updates local state immediately
   - Refreshes from server in background
   - Reverts on error

---

## State Management Flow

```
User Opens Futures Page
         ↓
DriftProvider Mounts
         ↓
Check Account Status (GET /api/drift/account/status)
         ↓
    ┌────────────────┐
    │  Account Exists? │
    └────────────────┘
         ↓
    Yes ↓         ↓ No
         ↓         ↓
Fetch Summary    Show Init Required
         ↓         ↓
Display Trading   User Clicks Init
         ↓         ↓
Auto-refresh     POST /api/drift/account/initialize
    (30s)              ↓
                  Success → Fetch Summary
                       ↓
                  Display Trading
```

---

## Expected Behavior

### Scenario 1: New User (No Drift Account)
1. Provider checks status → `exists: false`
2. `needsInitialization: true`
3. Show initialization modal/screen
4. Display cost: 0.035 SOL (~$5-6)
5. User clicks "Initialize"
6. Call `initializeAccount()`
7. On success, refresh status
8. Show trading interface

### Scenario 2: Existing User (Has Drift Account)
1. Provider checks status → `exists: true, initialized: true`
2. Fetch account summary
3. `canTrade: true`
4. Show trading interface immediately
5. Auto-refresh summary every 30s

### Scenario 3: Account Exists but Not Ready
1. Provider checks status → `exists: true, initialized: false`
2. Show "Account initializing..." message
3. Poll status every 5 seconds
4. When `initialized: true`, show trading interface

### Scenario 4: Low Margin Warning
1. Summary shows `health: 'warning'`
2. Display warning banner
3. `canTrade: true` (can still trade)
4. Suggest adding collateral

### Scenario 5: Liquidation Risk
1. Summary shows `health: 'danger'`
2. Display critical warning
3. `canTrade: false` (trading disabled)
4. Force user to add collateral or close positions

---

## Performance Considerations

### Caching Strategy
- Cache status for 5 minutes
- Cache summary for 30 seconds
- Invalidate cache on user actions (deposit, trade, etc.)

### API Call Optimization
- Debounce rapid refresh requests
- Use stale-while-revalidate pattern
- Batch multiple status checks

### Real-time Updates (Future Enhancement)
- WebSocket connection for live updates
- Push notifications for margin calls
- Instant position updates

---

## Error Handling

### Network Errors
```typescript
{
  error: 'Network error',
  message: 'Failed to connect to server. Please check your connection.',
  retryable: true
}
```

### Insufficient SOL
```typescript
{
  error: 'Insufficient SOL',
  message: 'Need 0.035 SOL to initialize account',
  requiredSol: 0.035,
  availableSol: 0.01,
  shortfall: 0.025
}
```

### Account Not Found
```typescript
{
  error: 'Account not found',
  message: 'Drift subaccount does not exist',
  needsInitialization: true
}
```

---

## Testing Checklist

- [ ] Provider mounts and checks status
- [ ] Status cached and not re-fetched unnecessarily
- [ ] Auto-refresh works correctly
- [ ] Auto-refresh stops when component unmounts
- [ ] Initialize account succeeds
- [ ] Initialize account handles errors
- [ ] Loading states display correctly
- [ ] Error messages display correctly
- [ ] Computed values (isInitialized, canTrade) are accurate
- [ ] Multiple components can use hook simultaneously
- [ ] Context updates propagate to all consumers

---

## Migration Path

### Phase 1: Create Context
1. Implement `DriftProvider` and `useDrift` hook
2. Add API endpoints for status and summary
3. Test in isolation

### Phase 2: Integrate with Existing Code
1. Wrap futures section with `DriftProvider`
2. Replace direct API calls with `useDrift()` hook
3. Remove duplicate status checks

### Phase 3: Enhance Features
1. Add auto-refresh
2. Implement caching
3. Add WebSocket support (optional)

---

## Benefits

✅ **Centralized State**: Single source of truth for Drift account status
✅ **Reduced API Calls**: Caching and deduplication
✅ **Better UX**: Loading states and error handling
✅ **Type Safety**: TypeScript interfaces for all data
✅ **Reusability**: Use hook in any component
✅ **Maintainability**: Easy to update and extend
✅ **Performance**: Optimized with caching and batching

---

## Related Files

- `/app/context/driftContext.tsx` - Context implementation
- `/hooks/useDrift.ts` - Hook implementation (if separate)
- `/api/drift/account/status/route.ts` - Status endpoint
- `/api/drift/account/summary/route.ts` - Summary endpoint
- `/api/drift/account/initialize/route.ts` - Initialize endpoint

---

## Questions to Address

1. Should we check SOL balance in the context or keep it separate?
2. Should initialization be automatic or require user confirmation?
3. How often should we auto-refresh? (30s, 60s, or configurable?)
4. Should we show a loading screen or skeleton UI during initial check?
5. Should we persist status in localStorage for faster initial load?
6. Should we add WebSocket support for real-time updates?
7. Should we track initialization progress (pending, confirming, confirmed)?

---

## Next Steps

1. Review this specification
2. Confirm API endpoint structure
3. Implement backend endpoints
4. Create DriftProvider context
5. Create useDrift hook
6. Update futures components to use hook
7. Test thoroughly
8. Document usage examples
