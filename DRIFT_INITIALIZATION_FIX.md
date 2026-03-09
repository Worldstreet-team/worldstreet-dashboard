# Drift Account Initialization Fix

## Problem
Users were getting a `NotSubscribedError` when trying to initialize their Drift account:

```
[DriftContext] Failed to initialize user account: NotSubscribedError: 
You must call `subscribe` before using this function
```

## Root Cause
The initialization logic was skipping the WebSocket subscription when the user account didn't exist yet, with the intention of subscribing after initialization. However, the `initializeUserAccount()` method in the Drift SDK requires an active subscription to work properly.

## Solution
Changed the subscription logic to ALWAYS subscribe to the Drift client before attempting any operations, including account initialization.

### Before (Incorrect)
```typescript
// Only subscribe if account exists
if (userAccountExists) {
  await client.subscribe();
} else {
  console.log('Skipping subscription until after initialization');
}

// Try to initialize (FAILS - not subscribed!)
if (!userAccountExists) {
  await client.initializeUserAccount(0, "worldstreet-user");
}
```

### After (Correct)
```typescript
// ALWAYS subscribe first, regardless of account existence
await client.subscribe();

// Now initialize if needed (WORKS - subscribed!)
if (!userAccountExists) {
  await client.initializeUserAccount(0, "worldstreet-user");
}
```

## Changes Made

### File: `src/app/context/driftContext.tsx`

1. **Moved subscription before account existence check**
   - Subscribe to WebSocket BEFORE checking if account needs initialization
   - This ensures the client is ready for any operation

2. **Removed redundant subscription after initialization**
   - No longer need to subscribe again after creating account
   - Already subscribed from step 1

3. **Updated comments**
   - Clarified that subscription is required BEFORE initialization
   - Removed misleading comment about skipping subscription

## Why This Works

The Drift SDK's `initializeUserAccount()` method needs to:
1. Fetch current blockchain state (requires subscription)
2. Build the initialization transaction
3. Send the transaction

Without an active subscription, step 1 fails with `NotSubscribedError`.

## Testing

Users can now:
1. Create a new Drift account successfully
2. See the initialization transaction complete
3. Start trading immediately after initialization

## Related Files
- `src/app/context/driftContext.tsx` - Main fix location
- `src/components/futures/DriftAccountStatus.tsx` - Shows initialization status
- `src/components/futures/InsufficientSolModal.tsx` - Handles SOL balance checks

## Notes

- The subscription happens via WebSocket for real-time updates
- Account initialization requires ~0.0425 SOL for rent
- After initialization, the account is immediately usable for trading
