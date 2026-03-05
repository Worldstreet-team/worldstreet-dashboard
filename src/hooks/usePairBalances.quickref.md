# usePairBalances - Quick Reference

## Import
```tsx
import { usePairBalances } from '@/hooks/usePairBalances';
```

## Basic Usage
```tsx
const { tokenIn, tokenOut, loading, error, refetch } = usePairBalances(
  userId,        // string | undefined
  'BTC-USDT',   // trading pair
  'ethereum'    // optional chain
);
```

## Return Values
| Property | Type | Description |
|----------|------|-------------|
| `tokenIn` | `number` | Base asset balance (what you're selling) |
| `tokenOut` | `number` | Quote asset balance (what you're buying with) |
| `loading` | `boolean` | True while fetching |
| `error` | `string \| null` | Error message if failed |
| `refetch` | `() => Promise<void>` | Manual refetch function |

## Common Patterns

### Buy/Sell Form
```tsx
const { tokenIn: sellBalance, tokenOut: buyBalance } = usePairBalances(
  user?.userId,
  selectedPair
);

const currentBalance = side === 'buy' ? buyBalance : sellBalance;
```

### With Loading State
```tsx
const { tokenIn, loading } = usePairBalances(userId, pair);

return loading ? <Spinner /> : <div>{tokenIn}</div>;
```

### With Error Handling
```tsx
const { tokenIn, error } = usePairBalances(userId, pair);

if (error) return <Alert>{error}</Alert>;
```

### Refetch After Trade
```tsx
const { refetch } = usePairBalances(userId, pair);

const handleTrade = async () => {
  await executeTrade();
  await refetch();
};
```

### Multi-Chain
```tsx
const ethBalances = usePairBalances(userId, 'ETH-USDT', 'ethereum');
const solBalances = usePairBalances(userId, 'SOL-USDT', 'solana');
```

## Pair Format
- ✅ `'BTC-USDT'` - Correct
- ✅ `'ETH-USDC'` - Correct
- ❌ `'BTC/USDT'` - Wrong (use dash, not slash)
- ❌ `'BTCUSDT'` - Wrong (needs separator)

## Chain Values
- `'ethereum'`
- `'solana'`
- `'bitcoin'`
- `undefined` (fetches all chains)

## Tips
1. Always check `loading` before displaying balances
2. Handle `error` state for better UX
3. Call `refetch()` after trades to update balances
4. Use React Query version for automatic caching
5. Balance defaults to 0 if not found (no dummy data)

## React Query Version
```tsx
import { usePairBalancesQuery } from '@/hooks/usePairBalancesQuery';

const { tokenIn, tokenOut, isRefetching } = usePairBalancesQuery(
  userId,
  'BTC-USDT'
);
```

Benefits: Auto-caching, auto-refresh, shared state

## Full Documentation
See `src/hooks/usePairBalances.md` for complete guide
