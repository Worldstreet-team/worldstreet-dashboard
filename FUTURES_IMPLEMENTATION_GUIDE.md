# Futures Trading Implementation Guide

## 🎯 Overview

This guide covers the complete implementation of a production-grade, multi-chain perpetual futures trading interface for WorldStreet Dashboard.

## ✅ What's Been Implemented

### 1. State Management
- **Zustand Store** (`src/store/futuresStore.ts`)
  - Chain selection (Solana, Arbitrum, Ethereum)
  - Market data management
  - Position tracking
  - Collateral management
  - Preview data handling
  - Wallet addresses per chain

### 2. Data Fetching Hook
- **useFuturesData** (`src/hooks/useFuturesData.ts`)
  - Automatic polling every 5 seconds
  - Market data fetching
  - Position updates
  - Collateral updates
  - Wallet verification

### 3. UI Components

#### ChainSelector (`src/components/futures/ChainSelector.tsx`)
- Dropdown for chain selection
- Supports Solana, Arbitrum, Ethereum
- Resets market selection on chain change

#### MarketSelector (`src/components/futures/MarketSelector.tsx`)
- Dynamic market list based on selected chain
- Displays mark price and 24h change
- Updates when chain changes

#### OrderPanel (`src/components/futures/OrderPanel.tsx`)
- Long/Short toggle
- Market/Limit order types
- Size input
- Leverage slider (1x-20x)
- Live preview with:
  - Required margin
  - Estimated liquidation price
  - Estimated fees
  - Funding impact
- Validates sufficient margin
- Debounced preview updates (300ms)

#### PositionPanel (`src/components/futures/PositionPanel.tsx`)
- Table view of open positions
- Shows: Market, Side, Size, Entry, Mark, PnL, Leverage, Liquidation, Margin Ratio
- Close position button
- Color-coded PnL (green/red)
- Risk highlighting for low margin ratio

#### RiskPanel (`src/components/futures/RiskPanel.tsx`)
- Total collateral display
- Used/Free margin breakdown
- Margin ratio monitoring
- Total unrealized PnL
- Funding accrued
- High risk warning (margin ratio < 20%)

#### WalletModal (`src/components/futures/WalletModal.tsx`)
- First-time wallet creation flow
- Chain-specific wallet generation
- Security information display
- Confirmation dialog

### 4. Main Page
- **Futures Page** (`src/app/(DashboardLayout)/futures/page.tsx`)
  - Responsive grid layout
  - Header with chain/market selectors
  - Wallet address display
  - Chart placeholder (ready for TradingView integration)
  - Position management
  - Order entry
  - Risk monitoring

### 5. API Routes (Stubs)

All routes support `?chain=` parameter:

- `GET /api/futures/wallet` - Fetch wallet address
- `POST /api/futures/wallet/create` - Create new wallet
- `GET /api/futures/markets` - Get available markets
- `GET /api/futures/positions` - Get open positions
- `GET /api/futures/collateral` - Get collateral data
- `POST /api/futures/preview` - Preview order before execution
- `POST /api/futures/open` - Open new position
- `POST /api/futures/close` - Close existing position

### 6. Navigation
- Updated sidebar with Futures link
- Badge indicator on Futures menu item
- Proper routing to `/futures`

## 🚧 Backend Integration Required

### Priority 1: Protocol Integration

#### Solana Protocols
Choose one or more:
- **Drift Protocol** - Most popular, high liquidity
- **Mango Markets** - Decentralized, open-source
- **Zeta Markets** - Options + futures

Implementation steps:
```typescript
// Example: Drift Protocol Integration
import { DriftClient } from '@drift-labs/sdk';

// In /api/futures/markets/route.ts
const driftClient = new DriftClient({
  connection,
  wallet,
  env: 'mainnet-beta'
});

const markets = await driftClient.getPerpMarkets();
```

#### Arbitrum Protocols
Choose one or more:
- **GMX** - Most liquid, proven track record
- **Gains Network** - gTrade platform

#### Ethereum Protocols
- **dYdX** - Largest derivatives DEX
- **Perpetual Protocol** - vAMM model

### Priority 2: Wallet Management

```typescript
// Backend implementation needed
// /api/futures/wallet/create/route.ts

import { Keypair } from '@solana/web3.js';
import { Wallet } from 'ethers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { chain, userId } = await request.json();
  
  let keypair, address, privateKey;
  
  if (chain === 'solana') {
    keypair = Keypair.generate();
    address = keypair.publicKey.toString();
    privateKey = Buffer.from(keypair.secretKey).toString('base64');
  } else {
    // EVM chains
    const wallet = Wallet.createRandom();
    address = wallet.address;
    privateKey = wallet.privateKey;
  }
  
  // Encrypt private key
  const encryptedKey = encryptPrivateKey(privateKey);
  
  // Store in database
  await db.futuresWallets.create({
    userId,
    chain,
    address,
    encryptedPrivateKey: encryptedKey,
  });
  
  return NextResponse.json({ address });
}
```

### Priority 3: Position Management

```typescript
// /api/futures/open/route.ts

export async function POST(request: NextRequest) {
  const { chain, market, side, size, leverage } = await request.json();
  
  // 1. Fetch user's wallet
  const wallet = await getUserFuturesWallet(userId, chain);
  
  // 2. Validate collateral
  const collateral = await getCollateral(wallet);
  const requiredMargin = calculateRequiredMargin(size, leverage);
  
  if (collateral.free < requiredMargin) {
    return NextResponse.json(
      { error: 'Insufficient margin' },
      { status: 400 }
    );
  }
  
  // 3. Execute on protocol
  if (chain === 'solana') {
    // Drift example
    const tx = await driftClient.openPosition({
      marketIndex,
      direction: side === 'long' ? PositionDirection.LONG : PositionDirection.SHORT,
      baseAssetAmount: size,
      leverage,
    });
  }
  
  // 4. Store position in database
  const position = await db.positions.create({
    userId,
    chain,
    market,
    side,
    size,
    leverage,
    entryPrice,
    txHash: tx.signature,
  });
  
  return NextResponse.json({ position });
}
```

### Priority 4: Real-time Data

Replace polling with WebSocket:

```typescript
// Create WebSocket server
// /api/futures/ws/route.ts

import { Server } from 'socket.io';

export function GET(request: NextRequest) {
  const io = new Server(server);
  
  io.on('connection', (socket) => {
    socket.on('subscribe', ({ chain, markets }) => {
      // Subscribe to protocol's WebSocket
      // Forward updates to client
    });
  });
}

// Update useFuturesData.ts
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000/api/futures/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setMarkets(data.markets);
    setPositions(data.positions);
  };
  
  return () => ws.close();
}, [selectedChain]);
```

## 📊 Chart Integration

### TradingView Integration

```typescript
// Install TradingView library
npm install @tradingview/charting-library

// Create component
// src/components/futures/TradingChart.tsx

import { widget } from '@tradingview/charting-library';

export const TradingChart = () => {
  const { selectedMarket } = useFuturesStore();
  
  useEffect(() => {
    const tvWidget = new widget({
      symbol: selectedMarket?.symbol || 'BTC-PERP',
      datafeed: new Datafeed(), // Custom datafeed
      container: 'tv_chart_container',
      library_path: '/charting_library/',
      locale: 'en',
      theme: 'dark',
    });
    
    return () => tvWidget.remove();
  }, [selectedMarket]);
  
  return <div id="tv_chart_container" className="h-96" />;
};
```

## 🔐 Security Checklist

- [ ] Private keys encrypted at rest
- [ ] Private keys never sent to frontend
- [ ] All orders validated by backend
- [ ] Rate limiting on API routes
- [ ] User authentication required
- [ ] Transaction signing on backend
- [ ] Audit logs for all trades
- [ ] IP whitelisting for API access (optional)

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test store
describe('futuresStore', () => {
  it('should update selected chain', () => {
    const { setSelectedChain, selectedChain } = useFuturesStore.getState();
    setSelectedChain('arbitrum');
    expect(selectedChain).toBe('arbitrum');
  });
});

// Test components
describe('OrderPanel', () => {
  it('should disable submit when insufficient margin', () => {
    render(<OrderPanel />);
    // Test logic
  });
});
```

### Integration Tests
```typescript
// Test API routes
describe('POST /api/futures/open', () => {
  it('should open position with valid params', async () => {
    const response = await fetch('/api/futures/open', {
      method: 'POST',
      body: JSON.stringify({
        chain: 'solana',
        market: 'btc-perp',
        side: 'long',
        size: 0.1,
        leverage: 10,
      }),
    });
    
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests
```typescript
// Playwright/Cypress
describe('Futures Trading Flow', () => {
  it('should complete full trading flow', () => {
    cy.visit('/futures');
    cy.get('[data-testid="chain-selector"]').select('solana');
    cy.get('[data-testid="market-selector"]').select('BTC-PERP');
    cy.get('[data-testid="size-input"]').type('0.1');
    cy.get('[data-testid="leverage-slider"]').invoke('val', 10);
    cy.get('[data-testid="submit-order"]').click();
    cy.contains('Position opened successfully');
  });
});
```

## 📈 Performance Optimization

### Current
- Polling: 5 seconds
- Preview debounce: 300ms
- Zustand for state management

### Recommended
- [ ] Implement WebSocket for real-time updates
- [ ] Add React Query for server state caching
- [ ] Implement virtual scrolling for position lists
- [ ] Add service worker for offline support
- [ ] Optimize bundle size with code splitting

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Protocol SDKs installed
- [ ] RPC endpoints configured
- [ ] WebSocket server running
- [ ] SSL certificates installed
- [ ] Monitoring setup (Sentry, DataDog)
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit completed

## 📚 Additional Features to Consider

### Phase 2
- [ ] Stop-loss / Take-profit orders
- [ ] Trailing stops
- [ ] Order history
- [ ] Trade analytics dashboard
- [ ] Portfolio performance tracking
- [ ] Risk calculator tool
- [ ] Paper trading mode

### Phase 3
- [ ] Copy trading
- [ ] Social trading features
- [ ] Advanced charting tools
- [ ] Custom indicators
- [ ] Trading bots integration
- [ ] Mobile app
- [ ] API for external traders

## 🆘 Troubleshooting

### Common Issues

**Issue: Preview not updating**
- Check network tab for API errors
- Verify debounce is working
- Check console for errors

**Issue: Position not opening**
- Verify wallet has sufficient collateral
- Check protocol connection
- Verify transaction signing

**Issue: Real-time data not updating**
- Check polling interval
- Verify API routes returning data
- Check WebSocket connection (if implemented)

## 📞 Support

For implementation questions:
1. Check the README in `/futures` directory
2. Review API route implementations
3. Check component documentation
4. Review protocol-specific docs

## 🎓 Learning Resources

- [Drift Protocol Docs](https://docs.drift.trade/)
- [GMX Docs](https://docs.gmx.io/)
- [dYdX Docs](https://docs.dydx.exchange/)
- [Perpetual Futures Trading Guide](https://www.binance.com/en/support/faq/perpetual-futures-trading)
