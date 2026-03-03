# Drift SDK Installation Guide

## Overview

The Drift Master Wallet Subaccount System requires the `@drift-labs/sdk` package to interact with the Drift Protocol. The implementation is designed to work with or without the SDK installed, providing clear error messages when it's missing.

## Installation

### Step 1: Install Drift SDK

```bash
npm install @drift-labs/sdk
```

Or with yarn:

```bash
yarn add @drift-labs/sdk
```

Or with pnpm:

```bash
pnpm add @drift-labs/sdk
```

### Step 2: Verify Installation

After installation, verify the package is installed:

```bash
npm list @drift-labs/sdk
```

### Step 3: Check Solana Web3.js Version Compatibility

The Drift SDK has peer dependencies on `@solana/web3.js`. Ensure you have a compatible version:

```bash
npm list @solana/web3.js
```

If you see version conflicts, you may need to resolve them:

```bash
# Remove node_modules and lock files
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

## Current Implementation Status

### ✅ What Works Without SDK

The following components work without the Drift SDK installed:

- Database models (DriftSubaccount, FeeAuditLog)
- Type definitions
- Error handling infrastructure
- API route structure
- React context and UI components
- Service initialization framework

### ⚠️ What Requires SDK

The following operations require the Drift SDK to be installed:

- Master wallet initialization
- User client creation
- Subaccount on-chain initialization
- Collateral deposits to Drift
- Position creation/closing
- Real-time gRPC subscriptions

## Error Handling

When the SDK is not installed, you'll see clear error messages:

```
Drift SDK not installed. Please run: npm install @drift-labs/sdk
```

The system uses dynamic imports to gracefully handle missing SDK:

```typescript
try {
  const { DriftClient, Wallet } = await import('@drift-labs/sdk');
  // Use SDK...
} catch (error) {
  throw new SystemError('Drift SDK not installed...');
}
```

## Type Safety

Until the SDK is installed, placeholder types are used:

```typescript
// Placeholder types
type DriftClient = any;
type Wallet = any;
```

After SDK installation, these will be replaced with actual types from the SDK.

## Version Compatibility

### Recommended Versions

- `@drift-labs/sdk`: Latest stable version
- `@solana/web3.js`: ^1.98.0 or higher
- Node.js: 18.x or higher

### Known Issues

1. **Multiple @solana/web3.js versions**: If you have multiple versions installed, you may see TypeScript errors. Solution: Clean install dependencies.

2. **gRPC configuration**: The Drift SDK requires proper gRPC endpoint configuration. Ensure `YELLOWSTONE_GRPC_ENDPOINT` is set in your environment.

3. **Wallet compatibility**: The SDK expects Solana Keypair objects. Ensure your wallet encryption/decryption produces valid keypairs.

## Testing Without SDK

For development and testing without the full Drift SDK:

1. The system will initialize but throw errors when attempting Drift operations
2. You can test database operations, API routes, and UI components
3. Mock the Drift SDK for unit tests:

```typescript
jest.mock('@drift-labs/sdk', () => ({
  DriftClient: jest.fn(),
  Wallet: jest.fn()
}));
```

## Production Deployment

Before deploying to production:

1. ✅ Install `@drift-labs/sdk`
2. ✅ Configure all environment variables
3. ✅ Test master wallet initialization
4. ✅ Verify gRPC connectivity
5. ✅ Test subaccount creation
6. ✅ Test deposit flow end-to-end

## Troubleshooting

### Issue: "Cannot find module '@drift-labs/sdk'"

**Solution**: Install the package:
```bash
npm install @drift-labs/sdk
```

### Issue: Type incompatibility errors

**Solution**: Clean install dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: gRPC connection errors

**Solution**: Verify environment variables:
```env
YELLOWSTONE_GRPC_ENDPOINT=your_endpoint_here
YELLOWSTONE_GRPC_TOKEN=your_token_here
```

### Issue: Wallet/Keypair type errors

**Solution**: Ensure you're using the same version of `@solana/web3.js` as the Drift SDK expects. Check the SDK's peer dependencies.

## Alternative: Mock Implementation

For development without the SDK, you can create a mock implementation:

```typescript
// src/services/drift/mocks/DriftClientMock.ts
export class DriftClientMock {
  async subscribe() {
    console.log('[Mock] DriftClient subscribed');
  }
  
  async unsubscribe() {
    console.log('[Mock] DriftClient unsubscribed');
  }
  
  async deposit(amount: number) {
    console.log('[Mock] Deposit:', amount);
    return 'mock_signature';
  }
}

export class WalletMock {
  constructor(public keypair: any) {}
  
  get publicKey() {
    return this.keypair.publicKey;
  }
  
  get payer() {
    return this.keypair;
  }
}
```

Then use environment variable to switch between real and mock:

```typescript
const useMock = process.env.USE_DRIFT_MOCK === 'true';

if (useMock) {
  const { DriftClientMock, WalletMock } = await import('./mocks/DriftClientMock');
  // Use mocks...
} else {
  const { DriftClient, Wallet } = await import('@drift-labs/sdk');
  // Use real SDK...
}
```

## Support

For Drift SDK specific issues, refer to:
- [Drift Protocol Documentation](https://docs.drift.trade/)
- [Drift SDK GitHub](https://github.com/drift-labs/protocol-v2)
- [Drift Discord](https://discord.gg/drift)

For implementation issues with this system, check the logs for detailed error messages.
