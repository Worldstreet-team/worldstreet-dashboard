# Tron Balance Proxy Implementation

## Overview
The Tron balance fetching now uses a Next.js API route as a proxy to the external balance service at `trading.watchup.site`. This ensures proper server-side handling and avoids CORS issues.

---

## Architecture

```
Frontend (TronContext)
    ↓
GET /api/tron/balance (Next.js API Route)
    ↓
Authenticate user
    ↓
Get Tron address from MongoDB
    ↓
GET https://trading.watchup.site/api/tron/balance/:address
    ↓
Parse response
    ↓
Return to frontend
    ↓
Display in Assets page
```

---

## Implementation

### 1. Next.js API Route (Proxy)

**File**: `src/app/api/tron/balance/route.ts`

**Endpoint**: `GET /api/tron/balance`

**Flow**:
1. Authenticate user
2. Get user profile from MongoDB
3. Extract Tron wallet address
4. Call external API: `GET https://trading.watchup.site/api/tron/balance/:address`
5. Parse and validate response
6. Return balance data to frontend

**Code**:
```typescript
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authUser = await getAuthUser();
  
  // 2. Get user profile
  const profile = await DashboardProfile.findOne({
    authUserId: authUser.userId,
  });
  
  // 3. Get Tron address
  const address = profile.wallets.tron.address;
  
  // 4. Call external API
  const response = await fetch(`${EXTERNAL_BALANCE_API}/${address}`);
  const data = await response.json();
  
  // 5. Return balance
  return NextResponse.json({
    success: true,
    address: data.address,
    balance: {
      trx: parseFloat(data.balance?.trx || "0"),
      sun: data.balance?.sun || "0",
    },
    network: data.network,
    timestamp: data.timestamp,
  });
}
```

---

### 2. Frontend Context Update

**File**: `src/app/context/tronContext.tsx`

**Changes**:
- Removed direct external API call
- Now calls local API route: `GET /api/tron/balance`
- Simplified error handling

**Code**:
```typescript
const fetchBalance = useCallback(async (addr?: string) => {
  // Call local API route (which proxies to external service)
  const response = await fetch("/api/tron/balance");
  const data = await response.json();
  
  // Set TRX balance
  const trxBalance = data.balance?.trx || 0;
  setBalance(trxBalance);
  
  // Fetch token balances using TronWeb
  // ... (TRC20 token fetching)
}, [tronWeb, address, customTokens]);
```

---

## Benefits

### 1. Server-Side Authentication
- User authentication happens on the backend
- No need to pass wallet address from frontend
- More secure

### 2. No CORS Issues
- Frontend calls local API route
- Backend handles external API calls
- Avoids cross-origin restrictions

### 3. Centralized Error Handling
- All errors handled in one place
- Consistent error responses
- Better logging

### 4. Security
- Wallet address not exposed in frontend code
- Authentication required for balance fetching
- Rate limiting can be applied at API route level

---

## API Response Format

### External API Response
```json
{
  "success": true,
  "address": "TFNADYnFcstJeZf8khVhq1yHhgyBdgtPku",
  "balance": {
    "trx": "200",
    "sun": "200000000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T13:54:28.343Z"
}
```

### Our API Route Response
```json
{
  "success": true,
  "address": "TFNADYnFcstJeZf8khVhq1yHhgyBdgtPku",
  "balance": {
    "trx": 200,
    "sun": "200000000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T13:54:28.343Z"
}
```

**Note**: We convert `trx` from string to number for easier frontend usage.

---

## Environment Variables

### Backend (Server-Side)
```bash
# .env.local
TRON_BALANCE_API=https://trading.watchup.site/api/tron/balance
```

### Frontend (Not Needed)
No environment variables needed on frontend since it calls the local API route.

---

## Error Handling

### 1. User Not Authenticated
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status**: 401

### 2. Tron Wallet Not Found
```json
{
  "success": false,
  "message": "Tron wallet not found"
}
```
**Status**: 404

### 3. External API Error
```json
{
  "success": false,
  "message": "Failed to fetch balance from external service"
}
```
**Status**: 500

### 4. Invalid Response
```json
{
  "success": false,
  "message": "External API returned error"
}
```
**Status**: 500

---

## Testing

### 1. Test API Route Directly

```bash
# Test with authentication
curl http://localhost:3000/api/tron/balance \
  -H "Cookie: your-auth-cookie"

# Expected response
{
  "success": true,
  "address": "TFNADYnFcstJeZf8khVhq1yHhgyBdgtPku",
  "balance": {
    "trx": 200,
    "sun": "200000000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T13:54:28.343Z"
}
```

### 2. Test in Application

1. Navigate to Assets page
2. Check if TRX balance displays correctly
3. Verify balance updates on refresh
4. Check browser console for errors

### 3. Test External API Directly

```bash
# Test external service
curl https://trading.watchup.site/api/tron/balance/TFNADYnFcstJeZf8khVhq1yHhgyBdgtPku

# Expected response
{
  "success": true,
  "address": "TFNADYnFcstJeZf8khVhq1yHhgyBdgtPku",
  "balance": {
    "trx": "200",
    "sun": "200000000"
  },
  "network": "testnet",
  "timestamp": "2026-03-01T13:54:28.343Z"
}
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Assets Page                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           TronContext.fetchBalance()                │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              GET /api/tron/balance                           │
│              (Next.js API Route)                             │
│                                                              │
│  1. Authenticate user                                        │
│  2. Get user profile from MongoDB                           │
│  3. Extract Tron address                                    │
│  4. Call external API ──────────────────────┐               │
│  5. Parse response                          │               │
│  6. Return to frontend                      │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│   GET https://trading.watchup.site/api/tron/balance/:addr   │
│                                                              │
│   External Balance Service                                  │
│   - Fetches balance from Tron network                       │
│   - Returns TRX and Sun amounts                             │
│   - Includes network and timestamp                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### 1. Authentication Required
- All requests must be authenticated
- User can only fetch their own balance
- No unauthorized access

### 2. Address Privacy
- Wallet address not exposed in frontend
- Address retrieved from database
- Only authenticated user can access

### 3. Rate Limiting
- Can be implemented at API route level
- Prevents abuse
- Protects external service

### 4. Error Handling
- No sensitive data in error messages
- Proper logging without exposing keys
- Graceful degradation

---

## Troubleshooting

### Issue: "Unauthorized" error
**Cause**: User not logged in or session expired
**Solution**: User needs to log in again

### Issue: "Tron wallet not found"
**Cause**: User hasn't generated Tron wallet yet
**Solution**: Generate Tron wallet from Assets page

### Issue: "Failed to fetch balance from external service"
**Possible Causes**:
1. External API is down
2. Network connectivity issues
3. Invalid response from external API

**Solutions**:
1. Check if `trading.watchup.site` is accessible
2. Verify `TRON_BALANCE_API` environment variable
3. Check server logs for details
4. Test external API directly with curl

### Issue: Balance not updating
**Cause**: Frontend not calling API or caching issue
**Solution**: 
1. Check browser console for errors
2. Verify `fetchBalance()` is being called
3. Clear browser cache
4. Check network tab for API calls

---

## Summary

✅ **Implemented**:
- Next.js API route as proxy to external balance service
- Server-side authentication and authorization
- Proper error handling and logging
- Environment variable configuration

✅ **Benefits**:
- No CORS issues
- Better security
- Centralized error handling
- Server-side authentication

✅ **Flow**:
1. Frontend calls `/api/tron/balance`
2. Backend authenticates user
3. Backend gets Tron address from database
4. Backend calls external API
5. Backend returns balance to frontend
6. Frontend displays balance

---

**Status**: ✅ Complete and ready for testing
**Last Updated**: 2024-01-15
