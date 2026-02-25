# Backend Integration Checklist

This checklist guides backend developers through integrating the futures trading interface with actual perpetual futures protocols.

## 📋 Prerequisites

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Database setup (MongoDB/PostgreSQL)
- [ ] RPC endpoints configured for each chain:
  - [ ] Solana RPC (Helius, QuickNode, or Alchemy)
  - [ ] Arbitrum RPC (Alchemy, Infura, or QuickNode)
  - [ ] Ethereum RPC (Alchemy, Infura, or QuickNode)

### Protocol Selection
Choose one protocol per chain:

#### Solana
- [ ] Drift Protocol (`npm install @drift-labs/sdk`)
- [ ] Mango Markets (`npm install @blockworks-foundation/mango-client`)
- [ ] Zeta Markets (`npm install @zetamarkets/sdk`)

#### Arbitrum
- [ ] GMX (`npm install @gmx-io/sdk`)
- [ ] Gains Network (gTrade)

#### Ethereum
- [ ] dYdX (`npm install @dydxprotocol/v3-client`)
- [ ] Perpetual Protocol (`npm install @perp/sdk-curie`)

## 🔐 Security Implementation

### 1. Wallet Management
File: `/api/futures/wallet/create/route.ts`

- [ ] Implement secure key generation
  ```typescript
  // Solana
  import { Keypair } from '@solana/web3.js';
  const keypair = Keypair.generate();
  
  // EVM
  import { Wallet } from 'ethers';
  const wallet = Wallet.createRandom();
  ```

- [ ] Implement encryption for private keys
  ```typescript
  import crypto from 'crypto';
  
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY; // 32 bytes
  
  function encrypt(text: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
  }
  ```

- [ ] Store encrypted keys in database
  ```typescript
  await db.futuresWallets.create({
    userId,
    chain,
    address,
    encryptedPrivateKey: encrypted,
    iv,
    authTag,
    createdAt: new Date(),
  });
  ```

- [ ] Implement key retrieval and decryption
  ```typescript
  function decrypt(encrypted: string, iv: string, authTag: string) {
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  ```

### 2. Authentication
- [ ] Add user authentication middleware
- [ ] Verify user owns the wallet
- [ ] Implement rate limiting
- [ ] Add request signing (optional)

## 📊 Data Integration

### 1. Markets Data
File: `/api/futures/markets/route.ts`

#### Solana (Drift Example)
```typescript
import { DriftClient, PerpMarkets } from '@drift-labs/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

- [ ] Initialize Drift client
const connection = new Connection(process.env.SOLANA_RPC_URL);
const driftClient = new DriftClient({
  connection,
  wallet: dummyWallet, // Read-only wallet
  env: 'mainnet-beta',
});

- [ ] Fetch markets
await driftClient.subscribe();
const markets = driftClient.getPerpMarketAccounts();

- [ ] Transform to API format
const formattedMarkets = markets.map(market => ({
  id: market.marketIndex.toString(),
  symbol: `${market.name}-PERP`,
  baseAsset: market.name,
  quoteAsset: 'USD',
  markPrice: market.amm.lastMarkPriceTwap.toNumber() / 1e6,
  indexPrice: market.amm.lastOraclePriceTwap.toNumber() / 1e6,
  fundingRate: market.amm.lastFundingRate.toNumber() / 1e9,
  nextFundingTime: market.nextFundingRateTs.toNumber() * 1000,
  volume24h: market.amm.volume24h.toNumber() / 1e6,
  priceChange24h: calculatePriceChange(market),
}));
```

#### Arbitrum (GMX Example)
```typescript
import { ethers } from 'ethers';
import GMX_READER_ABI from './abis/GMXReader.json';

- [ ] Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
const reader = new ethers.Contract(GMX_READER_ADDRESS, GMX_READER_ABI, provider);

- [ ] Fetch markets
const markets = await reader.getMarkets();

- [ ] Transform to API format
// Similar transformation as above
```

### 2. Positions Data
File: `/api/futures/positions/route.ts`

- [ ] Fetch user's wallet from database
- [ ] Query protocol for open positions
- [ ] Calculate unrealized PnL
- [ ] Calculate margin ratio
- [ ] Format response

```typescript
const wallet = await db.futuresWallets.findOne({ userId, chain });
const positions = await protocol.getPositions(wallet.address);

const formattedPositions = positions.map(pos => ({
  id: pos.id,
  market: pos.market,
  side: pos.isLong ? 'long' : 'short',
  size: pos.size,
  entryPrice: pos.entryPrice,
  markPrice: pos.markPrice,
  leverage: pos.leverage,
  liquidationPrice: pos.liquidationPrice,
  unrealizedPnL: calculatePnL(pos),
  marginRatio: calculateMarginRatio(pos),
  margin: pos.collateral,
}));
```

### 3. Collateral Data
File: `/api/futures/collateral/route.ts`

- [ ] Fetch wallet balance
- [ ] Calculate used margin from positions
- [ ] Calculate free margin
- [ ] Calculate total unrealized PnL
- [ ] Calculate funding accrued

```typescript
const balance = await protocol.getBalance(wallet.address);
const positions = await protocol.getPositions(wallet.address);

const used = positions.reduce((sum, pos) => sum + pos.margin, 0);
const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
const fundingAccrued = positions.reduce((sum, pos) => sum + pos.funding, 0);

return {
  total: balance,
  used,
  free: balance - used,
  marginRatio: used > 0 ? balance / used : 1,
  totalUnrealizedPnL: unrealizedPnL,
  fundingAccrued,
};
```

## 💼 Trading Operations

### 1. Order Preview
File: `/api/futures/preview/route.ts`

- [ ] Fetch current market price
- [ ] Calculate required margin
- [ ] Calculate liquidation price
- [ ] Calculate fees
- [ ] Calculate funding impact
- [ ] Validate against max leverage

```typescript
const market = await protocol.getMarket(marketId);
const price = limitPrice || market.markPrice;
const notionalValue = size * price;
const requiredMargin = notionalValue / leverage;

// Liquidation price calculation
const maintenanceMarginRate = 0.05; // 5%
const liquidationBuffer = notionalValue * maintenanceMarginRate;
const estimatedLiquidationPrice = side === 'long'
  ? price - (liquidationBuffer / size)
  : price + (liquidationBuffer / size);

// Fees
const takerFee = 0.0006; // 0.06%
const estimatedFee = notionalValue * takerFee;

// Funding
const fundingRate = market.fundingRate;
const hoursUntilFunding = (market.nextFundingTime - Date.now()) / 3600000;
const estimatedFundingImpact = notionalValue * fundingRate * (hoursUntilFunding / 8);

return {
  requiredMargin,
  estimatedLiquidationPrice,
  estimatedFee,
  maxLeverageAllowed: market.maxLeverage,
  estimatedFundingImpact,
};
```

### 2. Open Position
File: `/api/futures/open/route.ts`

- [ ] Validate user authentication
- [ ] Fetch and decrypt wallet keys
- [ ] Validate collateral
- [ ] Build transaction
- [ ] Sign transaction
- [ ] Submit to protocol
- [ ] Store position in database
- [ ] Return confirmation

```typescript
// 1. Validate
const wallet = await getWallet(userId, chain);
const collateral = await getCollateral(wallet);
if (collateral.free < requiredMargin) {
  throw new Error('Insufficient margin');
}

// 2. Decrypt keys
const privateKey = decrypt(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

// 3. Build transaction
const tx = await protocol.buildOpenPositionTx({
  market: marketId,
  side,
  size,
  leverage,
  orderType,
  limitPrice,
});

// 4. Sign and submit
const signedTx = await signTransaction(tx, privateKey);
const result = await protocol.submitTransaction(signedTx);

// 5. Store in database
await db.positions.create({
  userId,
  chain,
  market: marketId,
  side,
  size,
  leverage,
  entryPrice: result.executionPrice,
  txHash: result.signature,
  status: 'open',
  createdAt: new Date(),
});

return { positionId: result.positionId, txHash: result.signature };
```

### 3. Close Position
File: `/api/futures/close/route.ts`

- [ ] Validate user owns position
- [ ] Fetch position details
- [ ] Build close transaction
- [ ] Sign and submit
- [ ] Update database
- [ ] Return confirmation

```typescript
const position = await db.positions.findOne({ id: positionId, userId });
if (!position) throw new Error('Position not found');

const wallet = await getWallet(userId, chain);
const privateKey = decrypt(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

const tx = await protocol.buildClosePositionTx(position.protocolPositionId);
const signedTx = await signTransaction(tx, privateKey);
const result = await protocol.submitTransaction(signedTx);

await db.positions.updateOne(
  { id: positionId },
  { 
    status: 'closed',
    exitPrice: result.executionPrice,
    realizedPnL: result.pnl,
    closedAt: new Date(),
  }
);

return { success: true, pnl: result.pnl };
```

## 🔄 Real-time Updates

### Option 1: Polling (Current)
- [x] Already implemented (5s interval)
- [ ] Optimize polling frequency based on activity
- [ ] Add exponential backoff on errors

### Option 2: WebSocket (Recommended)
File: `/api/futures/ws/route.ts`

- [ ] Set up WebSocket server
- [ ] Subscribe to protocol events
- [ ] Forward updates to clients
- [ ] Handle reconnections

```typescript
import { Server } from 'socket.io';

const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('subscribe', async ({ chain, userId }) => {
    const wallet = await getWallet(userId, chain);
    
    // Subscribe to protocol updates
    protocol.on('positionUpdate', (data) => {
      socket.emit('position', data);
    });
    
    protocol.on('priceUpdate', (data) => {
      socket.emit('price', data);
    });
  });
});
```

## 🧪 Testing

### Unit Tests
- [ ] Test wallet creation
- [ ] Test encryption/decryption
- [ ] Test preview calculations
- [ ] Test position opening
- [ ] Test position closing

### Integration Tests
- [ ] Test full trading flow on testnet
- [ ] Test error handling
- [ ] Test edge cases (insufficient margin, etc.)
- [ ] Test concurrent operations

### Load Tests
- [ ] Test with 100 concurrent users
- [ ] Test with 1000 positions
- [ ] Test WebSocket scalability
- [ ] Measure response times

## 📈 Monitoring

### Logging
- [ ] Log all trades
- [ ] Log all errors
- [ ] Log performance metrics
- [ ] Set up log aggregation (DataDog, Splunk)

### Alerts
- [ ] Alert on failed transactions
- [ ] Alert on high error rates
- [ ] Alert on slow response times
- [ ] Alert on liquidations

### Metrics
- [ ] Track trading volume
- [ ] Track active users
- [ ] Track error rates
- [ ] Track response times

## 🚀 Deployment

### Environment Variables
```env
# Database
DATABASE_URL=

# Encryption
ENCRYPTION_KEY=

# RPC Endpoints
SOLANA_RPC_URL=
ARBITRUM_RPC_URL=
ETHEREUM_RPC_URL=

# Protocol Keys (if needed)
DRIFT_PROGRAM_ID=
GMX_READER_ADDRESS=
DYDX_API_KEY=
```

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team trained on operations

### Deployment Steps
1. [ ] Deploy to staging
2. [ ] Run smoke tests
3. [ ] Deploy to production
4. [ ] Monitor closely for 24 hours
5. [ ] Gather feedback
6. [ ] Iterate

## 📚 Documentation

### Code Documentation
- [ ] Add JSDoc comments
- [ ] Document complex algorithms
- [ ] Add inline comments for tricky parts
- [ ] Update README files

### API Documentation
- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Add authentication details

### Operational Documentation
- [ ] Write runbook for common issues
- [ ] Document deployment process
- [ ] Document rollback process
- [ ] Create troubleshooting guide

## 🆘 Support

### For Questions
1. Review the implementation guide
2. Check protocol documentation
3. Review existing code comments
4. Ask in team chat

### For Issues
1. Check logs
2. Review monitoring dashboards
3. Check protocol status pages
4. Contact protocol support if needed

---

## ✅ Sign-off

Once all items are checked:
- [ ] Backend lead review
- [ ] Security team review
- [ ] QA team sign-off
- [ ] Product team approval
- [ ] Ready for production deployment

**Estimated completion time: 2-3 weeks**
