# usePairBalances Hook Documentation

## Overview

The `usePairBalances` hook provides a clean, reusable way to fetch and manage cryptocurrency balances for trading pairs in your React components. It automatically handles loading states, errors, and refetching when dependencies change.

## Features

- ✅ Automatic balance fetching for trading pairs
- ✅ Chain-aware (supports multiple blockchains)
- ✅ TypeScript support with full type safety
- ✅ Loading and error state management
- ✅ Manual refetch capability
- ✅ No dummy data - defaults to 0
- ✅ Memory leak prevention with proper cleanup
- ✅ Optimized with useCallback to prevent unnecessary re-renders

## Installation

The hook is already included in your project at `src/hooks/usePairBalances.ts`.

For the React Query version with caching:
```bash
npm install @tanstack/react-query
# or
yarn add @tanstack/react-query
```

## Basic Usage

### Simple Implementation

```tsx
import { usePairBalances } from '@/hooks/usePairBalances';
import { useAuth } from '@/app/context/authContext';

function TradingForm() {
  const { user } = useAuth();
  const { tokenIn, tokenOut, loading, error, refetch } = usePairBalances(
    user?.userId,
    'BTC-USDT',
    'ethereum' // optional chain parameter
  );

  if (loading) return <div>Loading balances...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>BTC Balance: {tokenIn}</p>
      <p>USDT Balance: {tokenOut}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### With React Query (Recommended for Production)

```tsx
import { usePairBalancesQuery } from '@/hooks/usePairBalancesQuery';
import { useAuth } from '@/app/context/authContext';

function TradingForm() {
  const { user } = useAuth();
  const { 
    tokenIn, 
    tokenOut, 
    loading, 
    error, 
    refetch,
    isRefetching 
  } = usePairBalancesQuery(
    user?.userId,
    'BTC-USDT',
    'ethereum'
  );

  return (
    <div>
      <p>BTC Balance: {tokenIn} {isRefetching && '(updating...)'}</p>
      <p>USDT Balance: {tokenOut}</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## API Reference

### usePairBalances

```typescript
function usePairBalances(
  userId: string | undefined,
  selectedPair: string,
  chain?: string
): UsePairBalancesReturn
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string \| undefined` | Yes | User ID to fetch balances for. If undefined, returns 0 balances |
| `selectedPair` | `string` | Yes | Trading pair in format "BASE-QUOTE" (e.g., "BTC-USDT") |
| `chain` | `string` | No | Blockchain network (e.g., "ethereum", "solana", "bitcoin") |

#### Return Value

```typescript
interface UsePairBalancesReturn {
  tokenIn: number;      // Balance of base asset (what you're selling)
  tokenOut: number;     // Balance of quote asset (what you're buying with)
  loading: boolean;     // True while fetching balances
  error: string | null; // Error message if fetch failed
  refetch: () => Promise<void>; // Function to manually refetch balances
}
```

### usePairBalancesQuery (React Query Version)

Same API as `usePairBalances` but with additional features:

```typescript
interface UsePairBalancesQueryReturn extends UsePairBalancesReturn {
  isRefetching: boolean; // True when refetching in background
}
```

#### Additional Features

- **Automatic caching**: Data is cached for 30 seconds
- **Auto-refetch**: Automatically refetches every 60 seconds
- **Window focus refetch**: Refetches when user returns to tab
- **Retry logic**: Automatically retries failed requests with exponential backoff
- **Optimistic updates**: Supports optimistic UI updates

## Integration Examples

### BinanceOrderForm Integration

```tsx
import { usePairBalances } from '@/hooks/usePairBalances';

interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain?: string;
}

export default function BinanceOrderForm({ 
  selectedPair, 
  onTradeExecuted,
  chain 
}: BinanceOrderFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  // Fetch balances for the selected pair
  const { 
    tokenIn: sellBalance,  // Base asset balance (e.g., BTC)
    tokenOut: buyBalance,  // Quote asset balance (e.g., USDT)
    loading: loadingBalances,
    refetch: refetchBalances 
  } = usePairBalances(user?.userId, selectedPair, chain);

  const [tokenIn, tokenOut] = selectedPair.split('-');
  
  // Current balance based on buy/sell tab
  const currentBalance = activeTab === 'buy' ? buyBalance : sellBalance;
  const currentToken = activeTab === 'buy' ? tokenOut : tokenIn;

  const executeTrade = async () => {
    try {
      // Execute trade logic...
      await tradeAPI.execute();
      
      // Refetch balances after successful trade
      await refetchBalances();
      
      onTradeExecuted?.();
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  return (
    <div>
      <div>
        Available: {loadingBalances ? '...' : currentBalance.toFixed(6)} {currentToken}
      </div>
      {/* Rest of form... */}
    </div>
  );
}
```

### Multi-Chain Support

```tsx
function MultiChainTrading() {
  const { user } = useAuth();
  const [selectedChain, setSelectedChain] = useState<'ethereum' | 'solana'>('ethereum');
  
  const { tokenIn, tokenOut, loading } = usePairBalances(
    user?.userId,
    'ETH-USDT',
    selectedChain
  );

  return (
    <div>
      <select value={selectedChain} onChange={(e) => setSelectedChain(e.target.value)}>
        <option value="ethereum">Ethereum</option>
        <option value="solana">Solana</option>
      </select>
      
      <p>ETH Balance ({selectedChain}): {tokenIn}</p>
      <p>USDT Balance ({selectedChain}): {tokenOut}</p>
    </div>
  );
}
```

### With Global Cache Invalidation (React Query)

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { PAIR_BALANCES_QUERY_KEY } from '@/hooks/usePairBalancesQuery';

function TradingInterface() {
  const queryClient = useQueryClient();
  const { tokenIn, tokenOut } = usePairBalancesQuery(
    user?.userId,
    'BTC-USDT'
  );

  const executeTrade = async () => {
    await tradeAPI.execute();
    
    // Invalidate all balance queries across the app
    queryClient.invalidateQueries({ 
      queryKey: [PAIR_BALANCES_QUERY_KEY] 
    });
  };

  return (
    // ...
  );
}
```

## Best Practices

### 1. Always Handle Loading States

```tsx
const { tokenIn, tokenOut, loading } = usePairBalances(userId, pair);

if (loading) {
  return <Skeleton />;
}

return <div>Balance: {tokenIn}</div>;
```

### 2. Display Errors to Users

```tsx
const { tokenIn, tokenOut, error } = usePairBalances(userId, pair);

if (error) {
  return (
    <Alert variant="error">
      Failed to load balances: {error}
      <button onClick={refetch}>Retry</button>
    </Alert>
  );
}
```

### 3. Refetch After Trades

```tsx
const { refetch } = usePairBalances(userId, pair);

const handleTrade = async () => {
  await executeTrade();
  await refetch(); // Update balances immediately
};
```

### 4. Use React Query for Better UX

```tsx
// Provides automatic background updates and caching
const { tokenIn, tokenOut, isRefetching } = usePairBalancesQuery(
  userId,
  pair
);

// Show subtle indicator during background refresh
{isRefetching && <RefreshIcon className="animate-spin" />}
```

## Performance Considerations

### Basic Hook
- Fetches on mount and when dependencies change
- No caching - each component instance fetches independently
- Good for simple use cases

### React Query Hook
- Shared cache across all components
- Automatic background updates
- Deduplicates simultaneous requests
- Better for complex apps with multiple components showing balances

## Troubleshooting

### Balances showing as 0

1. Check if user is authenticated: `userId` must be defined
2. Verify API endpoint is working: `/api/users/:userId/balances`
3. Check browser console for error messages
4. Ensure backend returns correct format:
   ```json
   {
     "balances": [
       {
         "asset": "BTC",
         "available_balance": "0.5",
         "chain": "ethereum"
       }
     ]
   }
   ```

### Hook not refetching

1. Ensure dependencies are changing (userId, selectedPair, chain)
2. Call `refetch()` manually after trades
3. For React Query version, check if query is enabled

### Memory leaks

The hook properly cleans up on unmount. If you see warnings:
1. Ensure you're not calling `refetch()` after component unmounts
2. Use React Query version which handles this automatically

## Migration Guide

### From Manual Fetch to Hook

**Before:**
```tsx
const [balance, setBalance] = useState(0);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchBalance = async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/balances`);
    const data = await res.json();
    setBalance(data.balances[0].available_balance);
    setLoading(false);
  };
  fetchBalance();
}, [userId]);
```

**After:**
```tsx
const { tokenIn, loading } = usePairBalances(userId, 'BTC-USDT');
```

## TypeScript Support

The hook is fully typed. TypeScript will catch:
- Invalid pair formats
- Missing required parameters
- Incorrect return value usage

```typescript
// ✅ Correct
const { tokenIn, tokenOut } = usePairBalances(userId, 'BTC-USDT');

// ❌ TypeScript error - missing pair
const { tokenIn } = usePairBalances(userId);

// ❌ TypeScript error - wrong return type
const balance: string = usePairBalances(userId, 'BTC-USDT').tokenIn;
```

## Support

For issues or questions:
1. Check the console for error messages
2. Verify API endpoint is working
3. Review this documentation
4. Check the hook source code at `src/hooks/usePairBalances.ts`
