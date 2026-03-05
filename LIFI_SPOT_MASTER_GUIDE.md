# LI.FI Spot Trading - Complete Implementation Guide

## 📋 OVERVIEW

This is a production-grade decentralized spot trading system using LI.FI for on-chain swaps with position tracking that simulates traditional exchange behavior.

## ✅ COMPLETED WORK

### Phase 1: Database Schema & Types ✓
- [x] MongoDB models created:
  - `src/models/SpotTrade.ts` - Trade records
  - `src/models/SpotPosition.ts` - Position tracking
  - `src/models/PositionHistory.ts` - Position change history
- [x] TypeScript types: `src/types/spot-trading.ts`

### Phase 2: Core Utilities ✓
- [x] Decimal handling: `src/lib/swap/decimals.ts`
  - `toSmallestUnit()` - Convert human readable to bigint
  - `fromSmallestUnit()` - Convert bigint to human readable
  - `calculateExecutionPrice()` - Price calculation
  - `calculateAveragePrice()` - Average entry price
  - `calculateRealizedPnL()` - PnL calculation
- [x] Validation pipeline: `src/lib/swap/validation.ts`
  - Complete pre-swap validation
  - Slippage validation
  - Balance checks
- [x] Error handling: `src/lib/errors/swapErrors.ts`
  - User-friendly error messages
  - Error code mapping
  - Error sanitization
- [x] Execution lock: `src/lib/swap/SwapExecutionLock.ts`
  - Prevents double-click
  - Race condition prevention

### Phase 3: Architecture Documentation ✓
- [x] `LIFI_SPOT_ARCHITECTURE.md` - Core concepts
- [x] `LIFI_IMPLEMENTATION_GUIDE.md` - Implementation details
- [x] `SPOT_TRADING_COMPLETE_GUIDE.md` - Complete roadmap
- [x] `LIFI_SPOT_MASTER_GUIDE.md` - This file

## 🚧 REMAINING WORK

### Phase 4: LI.FI Service Integration
**File:** `src/services/lifi/LiFiService.ts`

**Status:** Needs implementation

**Tasks:**
1. Install LI.FI SDK: `npm install @lifi/sdk viem`
2. Implement complete LiFiService class:
   - `getQuote()` - Fetch swap quotes
   - `executeSwap()` - Execute transactions
   - `checkAllowance()` - Check token approvals
   - `approveToken()` - Approve token spending
   - `isQuoteValid()` - Validate quote freshness

**Reference:** See `LIFI_IMPLEMENTATION_GUIDE.md` section 9 for skeleton code

### Phase 5: Swap Execution Service
**File:** `src/services/spot/executeSpotSwap.ts`

**Status:** Skeleton exists, needs completion

**Tasks:**
1. Complete `validate()` method using validation pipeline
2. Implement `handleApproval()` for token approvals
3. Implement `executeTransaction()` for blockchain execution
4. Implement `waitForConfirmation()` for tx monitoring
5. Implement `createTradeRecord()` for database insertion
6. Implement `updatePosition()` for position tracking
7. Implement `calculatePrice()` using decimal utilities

**Critical Logic:**
```typescript
// BUY: Spend USDT, Get BTC
if (side === 'BUY') {
  fromToken = quoteToken; // USDT
  toToken = baseToken;    // BTC
}

// SELL: Spend BTC, Get USDT
if (side === 'SELL') {
  fromToken = baseToken;  // BTC
  toToken = quoteToken;   // USDT
}
```

### Phase 6: Position Manager Service
**File:** `src/services/spot/PositionManager.ts` (NEW)

**Status:** Not created

**Tasks:**
1. Create PositionManager class
2. Implement position creation logic
3. Implement position update logic (increase/reduce)
4. Implement position close logic
5. Implement PnL calculations
6. Implement position history tracking

**Key Methods:**
- `openPosition()` - Create new position
- `increasePosition()` - Add to existing position
- `reducePosition()` - Partial close
- `closePosition()` - Full close
- `calculateUnrealizedPnL()` - Current PnL
- `updateTPSL()` - Update take profit/stop loss

### Phase 7: API Routes

#### Quote Route
**File:** `src/app/api/spot/quote/route.ts` (NEW)

**Endpoint:** `GET /api/spot/quote`

**Query Params:**
- `pair` - Trading pair (e.g., "BTC-USDT")
- `side` - "BUY" or "SELL"
- `amount` - Human readable amount
- `slippage` - Slippage percentage

**Response:**
```typescript
{
  quote: SwapQuoteResponse,
  executionPrice: string,
  estimatedGas: string,
  timestamp: number
}
```

#### Execute Route
**File:** `src/app/api/spot/execute/route.ts` (NEW)

**Endpoint:** `POST /api/spot/execute`

**Body:**
```typescript
{
  userId: string,
  pair: string,
  side: 'BUY' | 'SELL',
  amount: string,
  slippage: number,
  baseToken: TokenMetadata,
  quoteToken: TokenMetadata
}
```

**Response:**
```typescript
{
  success: boolean,
  txHash?: string,
  trade?: SpotTrade,
  position?: SpotPosition,
  error?: string
}
```

#### Positions Route
**File:** `src/app/api/positions/route.ts` (EXISTS - needs update)

**Endpoint:** `GET /api/positions`

**Query Params:**
- `userId` - User ID
- `pair` - Optional pair filter
- `status` - Optional status filter ("OPEN" or "CLOSED")

**Response:**
```typescript
{
  positions: SpotPosition[]
}
```

#### Trade History Route
**File:** `src/app/api/spot/trades/route.ts` (NEW)

**Endpoint:** `GET /api/spot/trades`

**Query Params:**
- `userId` - User ID
- `pair` - Optional pair filter
- `limit` - Optional limit (default 50)

**Response:**
```typescript
{
  trades: SpotTrade[]
}
```

### Phase 8: Frontend Hooks

#### useSpotSwap Hook
**File:** `src/hooks/useSpotSwap.ts` (NEW)

**Status:** Not created

**Purpose:** Execute swaps from frontend

**Interface:**
```typescript
interface UseSpotSwapReturn {
  executeSwap: (params: SwapParams) => Promise<SwapExecutionResult>;
  getQuote: (params: QuoteParams) => Promise<SwapQuoteResponse>;
  isExecuting: boolean;
  error: string | null;
}
```

**Usage:**
```typescript
const { executeSwap, isExecuting } = useSpotSwap();

const handleTrade = async () => {
  const result = await executeSwap({
    pair: 'BTC-USDT',
    side: 'BUY',
    amount: '100',
    slippage: 0.5,
  });
  
  if (result.success) {
    // Handle success
  }
};
```

#### usePositions Hook
**File:** `src/hooks/usePositions.ts` (NEW)

**Status:** Not created

**Purpose:** Fetch and manage positions

**Interface:**
```typescript
interface UsePositionsReturn {
  positions: SpotPosition[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  updateTPSL: (positionId: string, tp?: string, sl?: string) => Promise<void>;
}
```

### Phase 9: UI Integration

#### Update BinanceOrderForm
**File:** `src/components/spot/BinanceOrderForm.tsx`

**Changes Needed:**
1. Import `useSpotSwap` hook
2. Replace `executeTrade()` with actual swap execution
3. Add loading states during execution
4. Show transaction hash on success
5. Handle errors from swap service

**Example:**
```typescript
import { useSpotSwap } from '@/hooks/useSpotSwap';

const { executeSwap, isExecuting } = useSpotSwap();

const executeTrade = async () => {
  const result = await executeSwap({
    pair: selectedPair,
    side: activeTab,
    amount: amount,
    slippage: 0.5,
  });
  
  if (result.success) {
    setSuccess(`Trade executed! TX: ${result.txHash}`);
    await refetchBalances();
  } else {
    setError(result.error);
  }
};
```

#### Update MobileTradingModal
**File:** `src/components/spot/MobileTradingModal.tsx`

**Changes Needed:**
Same as BinanceOrderForm - integrate useSpotSwap hook

#### Update LiveChart
**File:** `src/components/spot/LiveChart.tsx`

**Changes Needed:**
1. Import `usePositions` hook
2. Display entry price lines for open positions
3. Display TP/SL lines if set
4. Show position info on hover

**Example:**
```typescript
import { usePositions } from '@/hooks/usePositions';

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
  }
}, [positions]);
```

## 📦 DEPENDENCIES TO INSTALL

```bash
npm install @lifi/sdk viem
```

## 🔑 KEY CONCEPTS

### BUY vs SELL Logic
```typescript
// BUY BTC-USDT: Spend USDT, Get BTC
fromToken = USDT (quote)
toToken = BTC (base)

// SELL BTC-USDT: Spend BTC, Get USDT
fromToken = BTC (base)
toToken = USDT (quote)
```

### Position Tracking
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

### Decimal Safety
```typescript
// ALWAYS use parseUnits/formatUnits
import { parseUnits, formatUnits } from 'viem';

// Convert user input to smallest unit
const amountInWei = parseUnits('1.5', 18);

// Convert back for display
const humanReadable = formatUnits(amountInWei, 18);

// NEVER do this:
const wrong = amount * (10 ** decimals); // ❌ Precision loss!
```

## 🎯 IMPLEMENTATION PRIORITY

1. **Week 1:** Complete LiFiService and executeSpotSwap
2. **Week 2:** Create PositionManager and API routes
3. **Week 3:** Build frontend hooks (useSpotSwap, usePositions)
4. **Week 4:** Integrate with UI components
5. **Week 5:** Testing, error handling, polish

## 🧪 TESTING CHECKLIST

- [ ] Test BUY operation on testnet
- [ ] Test SELL operation on testnet
- [ ] Test position opening
- [ ] Test position increase
- [ ] Test position reduce
- [ ] Test position close
- [ ] Test insufficient balance error
- [ ] Test slippage exceeded error
- [ ] Test user rejection
- [ ] Test double-click prevention
- [ ] Test quote expiration
- [ ] Test decimal precision
- [ ] Test PnL calculations
- [ ] Test TP/SL functionality

## 📚 REFERENCE DOCUMENTS

- `LIFI_SPOT_ARCHITECTURE.md` - Core architectural concepts
- `LIFI_IMPLEMENTATION_GUIDE.md` - Database schema and LI.FI integration
- `SPOT_TRADING_COMPLETE_GUIDE.md` - Complete implementation roadmap

## 🚀 NEXT STEPS

1. Install dependencies: `npm install @lifi/sdk viem`
2. Complete `src/services/lifi/LiFiService.ts`
3. Complete `src/services/spot/executeSpotSwap.ts`
4. Create `src/services/spot/PositionManager.ts`
5. Create API routes
6. Create frontend hooks
7. Update UI components
8. Test on testnet
9. Deploy to production

---

**Status:** Phase 1-3 Complete ✓ | Phase 4-9 In Progress 🚧
