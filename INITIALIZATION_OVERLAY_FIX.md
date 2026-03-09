# Initialization Overlay Fix - Show Only Once

## Problem

The Drift initialization overlay was showing every time any operation was performed (placing orders, refreshing data, etc.), which was disruptive to the user experience. It should only show during the FIRST initialization when the user first visits a trading page.

## Solution

Added a `hasInitializedOnce` flag to track whether the Drift client has successfully initialized at least once during the session. The overlay now only shows:

1. On the first visit to a trading page (futures or spot)
2. When initialization fails and user clicks "Try Again"
3. After logout (resets the flag)

## Implementation

### 1. Added Initialization Tracking Flag

**File**: `src/app/context/driftContext.tsx`

```typescript
const [hasInitializedOnce, setHasInitializedOnce] = useState(false);
```

This flag tracks whether initialization has ever completed successfully during the current session.

### 2. Updated Overlay Display Logic

**Before (Broken)**:
```typescript
// Showed overlay on every initialization
if (isFirstLoad && isTradingPage) {
  setShowInitOverlay(true);
}
```

**After (Fixed)**:
```typescript
// Only show overlay if never initialized before
if (isFirstLoad && isTradingPage && !hasInitializedOnce) {
  console.log('[DriftContext] First initialization on trading page, showing overlay');
  setShowInitOverlay(true);
}
```

### 3. Set Flag on Successful Initialization

```typescript
setIsClientReady(true);
setIsInitializing(false);
setShowInitOverlay(false);
setIsFirstLoad(false);
setHasInitializedOnce(true); // ← Mark successful initialization
```

This happens in two places:
- When account is fully initialized
- When client is ready but account needs initialization (still counts as successful client init)

### 4. Reset Flag on Logout

```typescript
useEffect(() => {
  if (!user?.userId) {
    // ... other cleanup
    setHasInitializedOnce(false); // Reset on logout
  }
}, [user?.userId]);
```

### 5. Reset Flag on Manual Retry

```typescript
const resetInitializationFailure = useCallback(() => {
  setInitializationFailed(false);
  setError(null);
  setInitializationError(null);
  setIsFirstLoad(true);
  setShowInitOverlay(true);
  setHasInitializedOnce(false); // Allow overlay on retry
}, []);
```

## User Experience Flow

### First Visit to Trading Page
```
User navigates to /futures or /spot
    ↓
hasInitializedOnce = false
    ↓
Show initialization overlay ✓
    ↓
Drift client initializes
    ↓
hasInitializedOnce = true
    ↓
Overlay hidden
```

### Subsequent Operations
```
User places order
    ↓
hasInitializedOnce = true
    ↓
NO overlay shown ✓
    ↓
Order executes
    ↓
Balances refresh
    ↓
NO overlay shown ✓
```

### After Logout
```
User logs out
    ↓
hasInitializedOnce = false (reset)
    ↓
User logs back in
    ↓
Navigate to trading page
    ↓
Show initialization overlay ✓ (first time for new session)
```

### On Initialization Failure
```
Initialization fails
    ↓
Error overlay shown
    ↓
User clicks "Try Again"
    ↓
hasInitializedOnce = false (reset)
    ↓
Show initialization overlay ✓ (retry attempt)
```

## Benefits

1. **Better UX**: Users only see the overlay once per session
2. **Less Disruption**: Trading operations don't show loading overlays
3. **Clear Feedback**: Overlay still shows on first load and retries
4. **Session Awareness**: Resets properly on logout/login

## Edge Cases Handled

### 1. Navigation During Initialization
If user navigates to a trading page while initialization is in progress:
```typescript
useEffect(() => {
  if (isInitializing && isTradingPage && !showInitOverlay && !hasInitializedOnce) {
    setShowInitOverlay(true);
  }
}, [isInitializing, isTradingPage, showInitOverlay, hasInitializedOnce]);
```

### 2. Multiple Trading Pages
The flag is shared across all trading pages (futures and spot), so:
- Initialize on /futures → No overlay on /spot
- Initialize on /spot → No overlay on /futures

### 3. Page Refresh
The flag is in-memory state, so:
- Page refresh → Flag resets → Overlay shows again (expected behavior)

### 4. Background Initialization
If initialization happens on a non-trading page (e.g., dashboard):
- No overlay shown
- Flag still set to true
- No overlay when navigating to trading page

## Testing Checklist

- [x] First visit to /futures shows overlay
- [x] First visit to /spot shows overlay
- [x] Placing order doesn't show overlay
- [x] Refreshing data doesn't show overlay
- [x] Switching between /futures and /spot doesn't show overlay
- [x] Logout → Login → Visit trading page shows overlay
- [x] Initialization failure → Retry shows overlay
- [x] Page refresh shows overlay (expected)
- [x] Navigate during initialization shows overlay

## Related Files

- `src/app/context/driftContext.tsx` - Main context with initialization logic
- `src/components/futures/DriftInitializationOverlay.tsx` - Overlay component
- `src/app/(DashboardLayout)/futures/page.tsx` - Futures trading page
- `src/app/(DashboardLayout)/spot/page.tsx` - Spot trading page

## Conclusion

The initialization overlay now provides a better user experience by only showing during the first initialization of each session, rather than on every operation. This reduces disruption while still providing clear feedback when the system is actually initializing.
