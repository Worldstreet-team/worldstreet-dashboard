# Futures Trading Interface

## Overview
Production-grade perpetual futures trading interface that is protocol-agnostic and chain-agnostic. The frontend handles display, preview, interaction, and state management only - all critical calculations and enforcement are handled by the backend.

## Architecture

### Core Principles
1. **Frontend never enforces leverage rules** - Display only
2. **Frontend never trusts its own liquidation calculations** - Backend is source of truth
3. **All calculations are previews only** - Backend validates everything
4. **Backend is the source of truth** - Frontend displays backend results

### State Management
Uses Zustand for global state management:
- `src/store/futuresStore.ts` - Central state store
- `src/hooks/useFuturesData.ts` - Data fetching and polling

### Components

#### Page
- `src/app/(DashboardLayout)/futures/page.tsx` - Main futures trading page

#### UI Components
- `ChainSelector` - Multi-chain selection (Solana, Arbitrum, Ethereum)
- `MarketSelector` - Dynamic market selection based on chain
- `OrderPanel` - Order creation with live preview
- `PositionPanel` - Open positions display and management
- `RiskPanel` - Collateral and risk metrics
- `WalletModal` - Futures wallet creation flow

### API Routes

All API routes accept `chain` parameter for multi-chain support:

#### GET Endpoints
- `/api/futures/wallet?chain=solana` - Get futures wallet address
- `/api/futures/markets?chain=solana` - Get available markets
- `/api/futures/positions?chain=solana` - Get open positions
- `/api/futures/collateral?chain=solana` - Get collateral data

#### POST Endpoints
- `/api/futures/wallet/create` - Create new futures wallet
- `/api/futures/preview` - Preview position before opening
- `/api/futures/open` - Open new position
- `/api/futures/close` - Close existing position

## Data Flow

### Opening a Position
1. User inputs parameters (size, leverage, side)
2. Frontend calls `/api/futures/preview` with parameters
3. Backend returns:
   - Required margin
   - Estimated liquidation price
   - Estimated fees
   - Max leverage allowed
   - Funding impact
4. Frontend displays preview data
5. User confirms
6. Frontend calls `/api/futures/open`
7. Backend validates and executes
8. Frontend refreshes positions and collateral

### Real-time Updates
- Polls every 5 seconds for:
  - Market data
  - Position updates
  - Collateral changes
- Can be upgraded to WebSocket for real-time streaming

## Multi-Chain Support

### Chain Configuration
Supported chains:
- Solana
- Arbitrum
- Ethereum

### Chain-Specific Wallets
Each chain requires a separate futures wallet:
```typescript
{
  solana: { address: "..." },
  arbitrum: { address: "..." },
  ethereum: { address: "..." }
}
```

### Adding New Chains
1. Add chain to `Chain` type in `futuresStore.ts`
2. Add chain option to `ChainSelector` component
3. Implement chain-specific backend logic
4. No frontend changes needed - fully dynamic

## Security

### Wallet Management
- Private keys NEVER exposed to frontend
- Only public addresses stored in frontend state
- Wallet creation handled securely by backend
- Keys encrypted at rest in database

### Order Validation
- All orders validated by backend
- Frontend cannot bypass margin requirements
- Liquidation calculations done by backend
- Frontend displays backend results only

## Implementation Status

### ✅ Completed
- State management setup
- All UI components
- API route structure
- Multi-chain architecture
- Wallet creation flow
- Order preview system
- Position management UI
- Risk display panel

### 🚧 TODO (Backend Integration)
- Connect to actual perpetual futures protocols:
  - Solana: Drift, Mango Markets, Zeta Markets
  - Arbitrum: GMX, Gains Network
  - Ethereum: dYdX, Perpetual Protocol
- Implement wallet key generation and storage
- Implement position opening/closing logic
- Implement real liquidation calculations
- Add WebSocket for real-time updates
- Implement margin management (add/remove)
- Add funding rate calculations
- Implement order history
- Add PnL tracking

## Usage

### For Users
1. Select chain (Solana, Arbitrum, or Ethereum)
2. Create futures wallet if first time
3. Select market from available markets
4. Configure order (side, size, leverage)
5. Review preview data
6. Confirm to open position
7. Monitor positions in real-time
8. Close positions when desired

### For Developers
```typescript
// Access futures state anywhere
import { useFuturesStore } from '@/store/futuresStore';

const { selectedChain, positions, collateral } = useFuturesStore();

// Fetch data
import { useFuturesData } from '@/hooks/useFuturesData';

const { refreshData } = useFuturesData();
```

## Testing

### Manual Testing Checklist
- [ ] Chain switching resets markets
- [ ] Wallet creation flow works
- [ ] Market selection updates preview
- [ ] Order preview updates on input change
- [ ] Position display shows correct data
- [ ] Risk panel shows accurate metrics
- [ ] Close position works
- [ ] Insufficient margin prevents order
- [ ] Leverage slider respects max leverage

### API Testing
All API routes currently return mock data. Test with:
```bash
# Get markets
curl http://localhost:3000/api/futures/markets?chain=solana

# Preview order
curl -X POST http://localhost:3000/api/futures/preview \
  -H "Content-Type: application/json" \
  -d '{"chain":"solana","market":"btc-perp","side":"long","size":0.1,"leverage":10}'
```

## Performance

### Optimizations
- Debounced preview calculations (300ms)
- Polling interval: 5 seconds (configurable)
- Zustand for efficient state updates
- Component-level memoization where needed

### Future Optimizations
- WebSocket for real-time data
- Virtual scrolling for large position lists
- Chart data caching
- Optimistic UI updates

## Compliance

### Risk Warnings
- High liquidation risk warnings displayed
- Margin ratio monitoring
- Clear liquidation price display
- Funding rate impact shown

### User Protection
- Preview before execution
- Confirmation required for closing
- Clear fee display
- Real-time PnL updates
