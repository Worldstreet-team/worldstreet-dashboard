# Tron Wallet Generation Flow

## Overview
The Tron wallet generation now uses an external wallet generation service at `trading.watchup.site` to generate wallets securely.

---

## Architecture

### External Wallet Service
- **URL**: `https://trading.watchup.site/api/generate-wallet`
- **Method**: POST
- **Request Body**: `{ "chain": "trc" }`
- **Response**:
```json
{
  "success": true,
  "chain": "trc",
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "privateKey": "7A540C8C02D097B533445537B77C4DB9741365F282A1D477C20EB7801A4C8B48",
  "hexAddress": "41C8834F6C4B8B3D67E8FCB2D2E8B5A6F1234567890ABCDEF",
  "publicKey": "04a1b2c3d4e5f6...",
  "network": "TRON"
}
```

---

## Flow Diagram

```
User (Assets Page)
    ↓
    Clicks "Generate Tron Wallet"
    ↓
GenerateTronModal Opens
    ↓
    User enters PIN
    ↓
POST /api/wallet/add-tron
    ↓
    1. Verify user authentication
    2. Verify PIN against stored hash
    3. Check if Tron wallet already exists
    ↓
    If wallet doesn't exist:
    ↓
POST https://trading.watchup.site/api/generate-wallet
    Body: { "chain": "trc" }
    ↓
    Receive wallet data:
    - address
    - privateKey
    - hexAddress
    - publicKey
    ↓
    Encrypt privateKey with user's PIN
    ↓
    Save to MongoDB:
    - address (plain text)
    - encryptedPrivateKey (AES-256-GCM)
    ↓
    Return success with address
    ↓
GenerateTronModal shows success
    ↓
Assets page refreshes
    ↓
Tron wallet now visible
```

---

## Implementation Details

### 1. Frontend (GenerateTronModal)
**File**: `src/components/wallet/GenerateTronModal.tsx`

**Flow**:
1. User enters 6-digit PIN
2. Validates PIN (minimum 4 digits)
3. Calls `/api/wallet/add-tron` with PIN
4. Shows progress indicator
5. Displays success/error message
6. Refreshes assets page on success

**Key Features**:
- Modern PIN input with visual feedback
- Progress indicator during generation
- Success animation with wallet address
- Error handling with helpful messages
- Auto-close after success

---

### 2. Backend API (add-tron)
**File**: `src/app/api/wallet/add-tron/route.ts`

**Flow**:
1. **Authentication**: Verify user is logged in
2. **Validation**: Check PIN is provided
3. **Database Check**: Get user profile from MongoDB
4. **PIN Verification**: Verify PIN against stored PBKDF2 hash
5. **Duplicate Check**: Return existing wallet if already created
6. **External Call**: Call wallet generation service
7. **Encryption**: Encrypt private key with user's PIN
8. **Storage**: Save to MongoDB
9. **Response**: Return success with address

**Security Features**:
- PIN verification before any operation
- Private key encrypted with AES-256-GCM
- External service call for wallet generation
- Idempotent (returns existing wallet if present)
- Comprehensive error handling

---

### 3. Assets Page Integration
**File**: `src/app/(DashboardLayout)/assets/page.tsx`

**Display Logic**:
```typescript
{addresses?.tron ? (
  // Show Tron wallet address
  <div onClick={() => setReceiveModal({ open: true, chain: "tron", address: addresses.tron })}>
    <img src={CHAIN_ICONS.tron} alt="TRX" />
    <p>Tron</p>
    <p>{addresses.tron}</p>
  </div>
) : (
  // Show "Generate Tron Wallet" button
  <div onClick={() => setGenerateTronModal(true)}>
    <p>Generate Tron Wallet</p>
    <p>Click to create TRX wallet</p>
  </div>
)}
```

**After Generation**:
1. Modal closes automatically
2. `handleTronGenerated` callback fires
3. Fetches updated wallet status
4. Fetches Tron balance
5. Refreshes all balances
6. Tron wallet now visible in grid

---

## Environment Variables

### Required
```bash
# .env.local
WALLET_SERVICE_URL=https://trading.watchup.site/api/generate-wallet
NEXT_PUBLIC_TRON_RPC=https://tron-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Optional
```bash
# For development/testing
WALLET_SERVICE_URL=http://localhost:3423/api/generate-wallet
```

---

## API Endpoints

### 1. Generate Tron Wallet
**Endpoint**: `POST /api/wallet/add-tron`

**Request**:
```json
{
  "pin": "123456"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Tron wallet added successfully",
  "wallet": {
    "tron": {
      "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu"
    }
  },
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu"
}
```

**Response (Already Exists)**:
```json
{
  "success": true,
  "message": "Tron wallet already exists",
  "wallet": {
    "tron": {
      "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu"
    }
  },
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "message": "Invalid PIN"
}
```

---

### 2. External Wallet Service
**Endpoint**: `POST https://trading.watchup.site/api/generate-wallet`

**Request**:
```json
{
  "chain": "trc"
}
```

**Response**:
```json
{
  "success": true,
  "chain": "trc",
  "address": "TQhzqoxPJ6mmzfCf7i5okbjCSc53Xv6UDu",
  "privateKey": "7A540C8C02D097B533445537B77C4DB9741365F282A1D477C20EB7801A4C8B48",
  "hexAddress": "41C8834F6C4B8B3D67E8FCB2D2E8B5A6F1234567890ABCDEF",
  "publicKey": "04a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "network": "TRON"
}
```

---

## Security Considerations

### 1. Private Key Handling
- **Generation**: External service generates private key
- **Transmission**: Private key sent over HTTPS
- **Encryption**: Immediately encrypted with user's PIN
- **Storage**: Only encrypted version stored in MongoDB
- **Usage**: Decrypted only during transaction signing

### 2. PIN Security
- **Storage**: PIN never stored (only PBKDF2 hash)
- **Verification**: Hash comparison on backend
- **Encryption**: Used as encryption key for private keys
- **Transmission**: Sent over HTTPS only

### 3. External Service
- **HTTPS**: All communication encrypted
- **Validation**: Response validated before use
- **Error Handling**: Graceful failure if service unavailable
- **Logging**: Errors logged without sensitive data

---

## Error Handling

### Common Errors

**1. Invalid PIN**
```json
{
  "success": false,
  "message": "Invalid PIN"
}
```
**Status**: 401

**2. Wallet Service Unavailable**
```json
{
  "success": false,
  "message": "Failed to generate wallet from external service"
}
```
**Status**: 500

**3. Invalid Service Response**
```json
{
  "success": false,
  "message": "Invalid response from wallet generation service"
}
```
**Status**: 500

**4. User Not Found**
```json
{
  "success": false,
  "message": "Profile not found"
}
```
**Status**: 404

---

## Testing

### 1. Test Wallet Generation
```bash
# From frontend
1. Navigate to Assets page
2. Click "Generate Tron Wallet"
3. Enter PIN
4. Wait for generation
5. Verify success message
6. Check wallet appears in grid
```

### 2. Test API Directly
```bash
# Test external service
curl -X POST https://trading.watchup.site/api/generate-wallet \
  -H "Content-Type: application/json" \
  -d '{"chain": "trc"}'

# Test add-tron endpoint (requires authentication)
curl -X POST http://localhost:3000/api/wallet/add-tron \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"pin": "123456"}'
```

### 3. Test Idempotency
```bash
# Call add-tron twice with same user
# Second call should return existing wallet
```

---

## Troubleshooting

### Issue: "Failed to generate wallet from external service"
**Cause**: External service unavailable or returned error
**Solution**: 
1. Check if `trading.watchup.site` is accessible
2. Verify WALLET_SERVICE_URL in .env.local
3. Check network connectivity
4. Review server logs for details

### Issue: "Invalid PIN"
**Cause**: PIN doesn't match stored hash
**Solution**: User should enter correct PIN

### Issue: Wallet not appearing after generation
**Cause**: Frontend not refreshing properly
**Solution**: 
1. Check `handleTronGenerated` callback
2. Verify `fetchWalletStatus()` is called
3. Check browser console for errors

---

## Database Schema

### MongoDB Collection: `dashboardprofiles`

```typescript
{
  authUserId: string,
  email: string,
  wallets: {
    solana?: {
      address: string,
      encryptedPrivateKey: string
    },
    ethereum?: {
      address: string,
      encryptedPrivateKey: string
    },
    bitcoin?: {
      address: string,
      encryptedPrivateKey: string
    },
    tron?: {
      address: string,              // Base58 Tron address
      encryptedPrivateKey: string   // AES-256-GCM encrypted
    }
  },
  walletPinHash: string,  // PBKDF2 hash
  walletsGenerated: boolean
}
```

---

## Summary

✅ **Implemented**:
- External wallet service integration
- PIN verification and encryption
- Idempotent wallet generation
- Error handling and logging
- Frontend modal with progress indicator
- Assets page integration

✅ **Security**:
- Private keys encrypted with user's PIN
- PIN verified before any operation
- HTTPS communication with external service
- No sensitive data in logs

✅ **User Experience**:
- Simple PIN entry
- Visual progress indicator
- Success animation
- Automatic page refresh
- Error messages with helpful guidance

---

**Status**: ✅ Complete and ready for testing
**Last Updated**: 2024-01-15
