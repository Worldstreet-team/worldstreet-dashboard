# USDT Chain Mapping Guide

## Overview
This document explains how the system determines which blockchain's USDT to use for different trading pairs.

## Chain Mapping Table

| Trading Pair | Base Asset | Quote Asset | USDT Chain Used | Reason |
|--------------|------------|-------------|-----------------|---------|
| BTC-USDT | BTC | USDT | **EVM (Ethereum)** | Bitcoin trading typically uses Ethereum USDT |
| ETH-USDT | ETH | USDT | **EVM (Ethereum)** | Native Ethereum asset uses Ethereum USDT |
| SOL-USDT | SOL | USDT | **SOL (Solana)** | Solana trading uses Solana USDT |
| TRX-USDT | TRX | USDT | **TRON** | Tron trading uses Tron USDT |
| Other-USDT | Other | USDT | **TRON (default)** | Default fallback to Tron USDT |

## Decision Flow

```
┌─────────────────────────────────────┐
│   User Selects Trading Pair         │
│   Example: BTC-USDT                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Extract Base Asset (BTC)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Determine USDT Chain               │
│                                      │
│   BTC or ETH → EVM                   │
│   SOL → Solana                       │
│   Other → Tron (default)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Fetch Balances with Chain          │
│   /api/users/[userId]/balances       │
│   ?assets=BTC,USDT&chain=evm         │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │             │
        ▼             ▼
   USDT Found    USDT Not Found
        │             │
        │             ▼
        │      ┌─────────────────────┐
        │      │ Try Preferred Chain  │
        │      │ (EVM/SOL/TRON)       │
        │      └──────┬───────────────┘
        │             │
        │             ▼
        │      ┌──────┴──────┐
        │      │             │
        │      ▼             ▼
        │   Found        Not Found
        │      │             │
        │      │             ▼
        │      │      ┌─────────────────┐
        │      │      │ Fallback to Tron │
        │      │      └──────┬───────────┘
        │      │             │
        └──────┴─────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Display USDT Balance               │
│   in Trading Interface               │
└─────────────────────────────────────┘
```

## Code Implementation

### Component Level (BinanceOrderForm.tsx, MobileTradingModal.tsx)

```typescript
// Determine chain based on the base asset
const getChainForPair = (pair: string): string => {
  const [baseAsset] = pair.split('-');
  const asset = baseAsset.toUpperCase();
  
  if (asset === 'ETH' || asset === 'BTC') {
    return 'evm'; // Ethereum chain
  } else if (asset === 'SOL') {
    return 'sol'; // Solana chain
  }
  
  return 'tron'; // Default to Tron
};

const effectiveChain = chain || getChainForPair(selectedPair);
```

### Hook Level (usePairBalances.ts)

```typescript
// Determine which chain to use for USDT
const getUSDTChain = (baseAsset: string): 'tron' | 'evm' | 'sol' => {
  const asset = baseAsset.toUpperCase();
  
  if (asset === 'ETH' || asset === 'BTC') {
    return 'evm';
  } else if (asset === 'SOL') {
    return 'sol';
  }
  
  return 'tron';
};

// Fetch USDT from appropriate chain
if (quoteAsset.toUpperCase() === 'USDT' && tokenOutValue === 0) {
  const usdtChain = getUSDTChain(baseAsset);
  
  if (usdtChain === 'tron') {
    // Fetch from Tron wallet
  } else if (usdtChain === 'evm' || usdtChain === 'sol') {
    // Fetch from specific chain
    // Fallback to Tron if not found
  }
}
```

## Examples

### Example 1: BTC-USDT Trading
```
User: Selects BTC-USDT pair
System: Determines chain = 'evm'
System: Fetches BTC balance from spot
System: Fetches USDT from EVM chain
Display: "Available: 1000.00 USDT" (from Ethereum)
```

### Example 2: SOL-USDT Trading
```
User: Selects SOL-USDT pair
System: Determines chain = 'sol'
System: Fetches SOL balance from spot
System: Fetches USDT from Solana chain
Display: "Available: 500.00 USDT" (from Solana)
```

### Example 3: Fallback Scenario
```
User: Selects BTC-USDT pair
System: Determines chain = 'evm'
System: Fetches BTC balance from spot
System: Tries to fetch USDT from EVM → Not found (0)
System: Falls back to Tron wallet
System: Finds USDT on Tron → 750.00
Display: "Available: 750.00 USDT" (from Tron fallback)
```

## Benefits of Chain-Aware Approach

1. **Accuracy**: Shows USDT from the most relevant chain for each trading pair
2. **Flexibility**: Supports multiple USDT sources across different blockchains
3. **Reliability**: Fallback mechanism ensures USDT is found if available anywhere
4. **User Experience**: Seamless trading without manual chain selection
5. **Scalability**: Easy to add new chains and assets

## Adding New Chains

To add support for a new chain (e.g., Polygon):

1. Update `getChainForPair()` in components:
```typescript
if (asset === 'MATIC') {
  return 'polygon';
}
```

2. Update `getUSDTChain()` in hook:
```typescript
if (asset === 'MATIC') {
  return 'polygon';
}
```

3. Ensure backend API supports the new chain parameter

## Troubleshooting

### USDT shows 0 even though I have USDT
- Check browser console for logs
- Verify which chain the USDT is on
- Ensure the chain is supported for your trading pair
- Check if fallback to Tron is working

### Wrong USDT balance displayed
- Verify the trading pair
- Check if you have USDT on multiple chains
- Review console logs to see which chain was used
- Ensure the chain mapping is correct for your pair

### Balance not updating after trade
- Call `refetchBalances()` after trade execution
- Check if the trade was successful
- Verify the balance API is responding correctly
