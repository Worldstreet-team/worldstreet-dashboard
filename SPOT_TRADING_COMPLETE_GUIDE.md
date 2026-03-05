# Complete LI.FI Spot Trading System - Implementation Guide

## Quick Reference

This guide provides the complete architecture for implementing a production-grade decentralized spot trading system using LI.FI for swaps.

## File Structure

```
src/
├── services/
│   ├── lifi/
│   │   └── LiFiService.ts          # LI.FI SDK wrapper
│   ├── spot/
│   │   ├── executeSpotSwap.ts      # Main swap execution
│   │   ├── PositionManager.ts      # Position tracking
│   │   └── PriceCalculator.ts      # Price & PnL calculations
│   └── blockchain/
│       ├── TokenService.ts         # Token operations
│       └── TransactionMonitor.ts   # TX confirmation
├── hooks/
│   ├── useSpotSwap.ts             # Swap execution hook
│   ├── usePositions.ts            # Position management
│   └── usePairBalances.ts         # Balance fetching (existing)
├── lib/
│   ├── swap/
│   │   ├── SwapExecutionLock.ts   # Race condition prevention
│   │   ├── validation.ts          # Input validation
│   │   └── decimals.ts            # Decimal handling
│   └── errors/
│       └── swapErrors.ts          # Error sanitization
├── types/
│   └── spot-trading.ts            # TypeScript definitions
└── app/api/
    ├── spot/
    │   ├── quote/route.ts         # GET quote
    │   ├── execute/route.ts       # POST execute swap
    │   └── trades/route.ts        # GET trade history
    └── positions/
        ├── route.ts               # GET/POST positions
        └── [id]/
            ├── route.ts           # GET/PATCH/DELETE position
            └── close/route.ts     # POST close position
```

## Implementation Priority

### Phase 1: Core Infrastructure (Week 1)
1. Database schema setup
2. TypeScript types
3. Decimal handling utilities
4. Error sanitization
5. Validation pipeline

### Phase 2: LI.FI Integration (Week 2)
1. LiFiService wrapper
2. Quote fetching
3. Transaction execution
4. Approval handling

### Phase 3: Position Tracking (Week 3)
1. Position creation/update logic
2. PnL calculations
3. Database operations
4. API routes

### Phase 4: Frontend Integration (Week 4)
1. useSpotSwap hook
2. usePositions hook
3. Update BinanceOrderForm
4. Update MobileTradingModal
5. Chart integration

### Phase 5: Testing & Polish (Week 5)
1. Error handling
2. Edge cases
3. Gas optimization
4. UI/UX refinement

## Critical Implementation Notes

### 1. BUY vs SELL Logic

```typescript
// BUY: Spend USDT, Get BTC
if (side === 'BUY') {
  fromToken = quoteToken; // USDT
  toToken = baseToken;    // BTC
  fromAmount = userInputAmount; // USDT amount
}

// SELL: Spend BTC, Get USDT
if (side === 'SELL') {
  fromToken = baseToken;  // BTC
  toToken = quoteToken;   // USDT
  fromAmount = userInputAmount; // BTC amount
}
```

### 2. Position Tracking Logic

```typescript
// On BUY
if (existingPosition) {
  // Increase position
  newAmount = existingAmount + boughtAmount;
  newAvgPrice = (existingCost + newCost) / newAmount;
} else {
  // Open new position
  newAmount = boughtAmount;
  newAvgPrice = executionPrice;
}

// On SELL
if (sellAmount >= positionAmount) {
  // Close position
  realizedPnL = (sellPrice - avgEntryPrice) * positionAmount;
  status = 'CLOSED';
} else {
  // Partial close
  realizedPnL = (sellPrice - avgEntryPrice) * sellAmount;
  newAmount = positionAmount - sellAmount;
}
```

### 3. Price Calculation

```typescript
// Calculate execution price from LI.FI quote
executionPrice = toAmount / fromAmount;

// For BUY BTC-USDT
// fromAmount = 1000 USDT, toAmount = 0.01 BTC
// price = 1000 / 0.01 = 100,000 USDT per BTC

// For SELL BTC-USDT
// fromAmount = 0.01 BTC, toAmount = 1000 USDT
// price = 1000 / 0.01 = 100,000 USDT per BTC
```

### 4. Decimal Safety

```typescript
// ALWAYS use parseUnits/formatUnits
import { parseUnits, formatUnits } from 'viem';

// Convert user input to smallest unit
const amountInWei = parseUnits('1.5', 18); // 1500000000000000000n

// Convert back for display
const humanReadable = formatUnits(amountInWei, 18); // "1.5"

// NEVER do this:
const wrong = amount * (10 ** decimals); // ❌ Precision loss!
```

### 5. Error Handling Pattern

```typescript
try {
  // Attempt operation
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  // Sanitize for user
  const userMessage = sanitizeError(error);
  const errorCode = getErrorCode(error);
  
  // Log full error for debugging
  console.error('[Operation] Full error:', error);
  
  // Return safe message
  return { 
    success: false, 
    error: userMessage,
    code: errorCode 
  };
}
```

## API Route Examples

### POST /api/spot/execute

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  const result = await spotSwapExecutor.execute({
    userId: body.userId,
    pair: body.pair,
    side: body.side,
    amount: body.amount,
    slippage: body.slippage,
    baseToken: body.baseToken,
    quoteToken: body.quoteToken,
  });
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, code: result.errorCode },
      { status: 400 }
    );
  }
  
  return NextResponse.json(result);
}
```

### GET /api/positions

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  const positions = await db.query(`
    SELECT * FROM spot_positions
    WHERE user_id = $1 AND status = 'OPEN'
    ORDER BY opened_at DESC
  `, [userId]);
  
  return NextResponse.json({ positions });
}
```

## Frontend Integration

### Update BinanceOrderForm.tsx

```typescript
import { useSpotSwap } from '@/hooks/useSpotSwap';

const { executeSwap, isExecuting } = useSpotSwap();

const handleTrade = async () => {
  const result = await executeSwap({
    pair: selectedPair,
    side: activeTab,
    amount: amount,
    slippage: 0.5,
  });
  
  if (result.success) {
    setSuccess('Trade executed successfully!');
    await refetchBalances();
    await refetchPositions();
  } else {
    setError(result.error);
  }
};
```

### Chart Integration

```typescript
// In LiveChart component
const { positions } = usePositions(selectedPair);

useEffect(() => {
  if (positions.length > 0) {
    const position = positions[0];
    
    // Add entry price line
    chart.addPriceLine({
      price: parseFloat(position.averageEntryPrice),
      color: '#0ecb81',
      label: 'Entry',
    });
    
    // Add TP/SL if set
    if (position.takeProfitPrice) {
      chart.addPriceLine({
        price: parseFloat(position.takeProfitPrice),
        color: '#0ecb81',
        label: 'TP',
      });
    }
  }
}, [positions]);
```

## Security Checklist

- [ ] Validate all user inputs
- [ ] Use bigint for all token amounts
- [ ] Prevent double-click execution
- [ ] Validate contract addresses
- [ ] Check chain IDs match
- [ ] Verify transaction receipts
- [ ] Sanitize all errors
- [ ] Use idempotency keys (txHash)
- [ ] Rate limit API routes
- [ ] Validate user owns wallet
- [ ] Check slippage bounds
- [ ] Verify token approvals
- [ ] Handle quote expiration
- [ ] Implement gas estimation
- [ ] Add transaction timeouts

## Testing Strategy

1. **Unit Tests**: Validation, decimal conversion, price calculation
2. **Integration Tests**: LI.FI quote fetching, position updates
3. **E2E Tests**: Full swap flow on testnet
4. **Edge Cases**: Zero amounts, max values, precision limits
5. **Error Scenarios**: Network failures, user rejection, slippage

## Monitoring & Observability

```typescript
// Log all critical operations
console.log('[SpotSwap] Executing:', {
  userId,
  pair,
  side,
  amount,
  timestamp: Date.now(),
});

// Track metrics
metrics.increment('spot.swap.executed');
metrics.timing('spot.swap.duration', duration);
metrics.gauge('spot.position.count', positionCount);
```

## Next Steps

1. Review existing codebase for conflicts
2. Set up database tables
3. Install LI.FI SDK: `npm install @lifi/sdk`
4. Implement core services
5. Create API routes
6. Build frontend hooks
7. Update UI components
8. Test on testnet
9. Deploy to production

## Support Resources

- LI.FI Docs: https://docs.li.fi/
- Viem Docs: https://viem.sh/
- This codebase: See LIFI_SPOT_ARCHITECTURE.md and LIFI_IMPLEMENTATION_GUIDE.md

---

**This is a production-grade system. Take time to implement each phase carefully.**
