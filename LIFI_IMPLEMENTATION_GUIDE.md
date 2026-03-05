# LI.FI Implementation Guide - Part 2

## 7. DATABASE SCHEMA

### Trades Table
```sql
CREATE TABLE spot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL UNIQUE, -- Blockchain transaction hash
  chain_id INTEGER NOT NULL,
  pair VARCHAR(50) NOT NULL, -- e.g., "BTC-USDT"
  side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  
  -- Token details
  from_token_address VARCHAR(66) NOT NULL,
  from_token_symbol VARCHAR(20) NOT NULL,
  from_amount VARCHAR(78) NOT NULL, -- Store as string to preserve precision
  
  to_token_address VARCHAR(66) NOT NULL,
  to_token_symbol VARCHAR(20) NOT NULL,
  to_amount VARCHAR(78) NOT NULL,
  
  -- Pricing
  execution_price DECIMAL(36, 18) NOT NULL, -- Price at execution
  slippage_percent DECIMAL(5, 2) NOT NULL,
  
  -- Gas & fees
  gas_used VARCHAR(78),
  gas_price_gwei VARCHAR(78),
  total_fee_usd DECIMAL(18, 6),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_trades (user_id, created_at DESC),
  INDEX idx_tx_hash (tx_hash),
  INDEX idx_pair_time (pair, created_at DESC)
);
```

### Positions Table
```sql
CREATE TABLE spot_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  pair VARCHAR(50) NOT NULL, -- e.g., "BTC-USDT"
  chain_id INTEGER NOT NULL,
  
  -- Token details
  base_token_address VARCHAR(66) NOT NULL,
  base_token_symbol VARCHAR(20) NOT NULL,
  quote_token_address VARCHAR(66) NOT NULL,
  quote_token_symbol VARCHAR(20) NOT NULL,
  
  -- Position size
  total_amount VARCHAR(78) NOT NULL, -- Current position size in base token
  
  -- Cost basis
  average_entry_price DECIMAL(36, 18) NOT NULL,
  total_cost VARCHAR(78) NOT NULL, -- Total quote token spent
  
  -- PnL tracking
  realized_pnl VARCHAR(78) DEFAULT '0',
  
  -- Risk management
  take_profit_price DECIMAL(36, 18),
  stop_loss_price DECIMAL(36, 18),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  
  -- Timestamps
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, pair, chain_id, status),
  CHECK (total_amount::NUMERIC > 0 OR status = 'CLOSED'),
  
  -- Indexes
  INDEX idx_user_positions (user_id, status),
  INDEX idx_pair_positions (pair, status)
);
```

### Position History Table
```sql
CREATE TABLE position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES spot_positions(id),
  trade_id UUID NOT NULL REFERENCES spot_trades(id),
  
  action VARCHAR(20) NOT NULL CHECK (action IN ('OPEN', 'INCREASE', 'REDUCE', 'CLOSE')),
  
  -- Before state
  amount_before VARCHAR(78) NOT NULL,
  avg_price_before DECIMAL(36, 18),
  
  -- After state
  amount_after VARCHAR(78) NOT NULL,
  avg_price_after DECIMAL(36, 18) NOT NULL,
  
  -- Change
  amount_delta VARCHAR(78) NOT NULL,
  realized_pnl VARCHAR(78),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_position_history (position_id, created_at DESC)
);
```

## 8. TYPESCRIPT TYPES

```typescript
// src/types/spot-trading.ts

export interface TokenMetadata {
  symbol: string;
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export interface SwapQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string; // In smallest unit
  fromAddress: string;
  slippage: number; // In basis points (50 = 0.5%)
}

export interface SwapQuoteResponse {
  id: string;
  type: string;
  tool: string;
  action: {
    fromToken: TokenMetadata;
    toToken: TokenMetadata;
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{
      name: string;
      amount: string;
      token: TokenMetadata;
    }>;
    gasCosts: Array<{
      type: string;
      amount: string;
      amountUSD: string;
      token: TokenMetadata;
    }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit: string;
    gasPrice: string;
  };
}

export interface SpotTrade {
  id: string;
  userId: string;
  txHash: string;
  chainId: number;
  pair: string;
  side: 'BUY' | 'SELL';
  
  fromTokenAddress: string;
  fromTokenSymbol: string;
  fromAmount: string;
  
  toTokenAddress: string;
  toTokenSymbol: string;
  toAmount: string;
  
  executionPrice: string;
  slippagePercent: number;
  
  gasUsed?: string;
  gasPriceGwei?: string;
  totalFeeUsd?: string;
  
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  
  createdAt: Date;
  confirmedAt?: Date;
}

export interface SpotPosition {
  id: string;
  userId: string;
  pair: string;
  chainId: number;
  
  baseTokenAddress: string;
  baseTokenSymbol: string;
  quoteTokenAddress: string;
  quoteTokenSymbol: string;
  
  totalAmount: string; // In smallest unit
  averageEntryPrice: string;
  totalCost: string; // In smallest unit
  
  realizedPnl: string;
  
  takeProfitPrice?: string;
  stopLossPrice?: string;
  
  status: 'OPEN' | 'CLOSED';
  
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export interface PositionUpdate {
  action: 'OPEN' | 'INCREASE' | 'REDUCE' | 'CLOSE';
  amountDelta: string;
  price: string;
  realizedPnl?: string;
}

export interface SwapExecutionParams {
  userId: string;
  pair: string;
  side: 'BUY' | 'SELL';
  amount: string; // Human readable
  slippage: number; // Percentage
  baseToken: TokenMetadata;
  quoteToken: TokenMetadata;
}

export interface SwapExecutionResult {
  success: boolean;
  txHash?: string;
  trade?: SpotTrade;
  position?: SpotPosition;
  error?: string;
  errorCode?: string;
}
```

## 9. LI.FI INTEGRATION SERVICE

```typescript
// src/services/lifi/LiFiService.ts

import { LiFi, RouteOptions, Route } from '@lifi/sdk';
import { SwapQuoteRequest, SwapQuoteResponse } from '@/types/spot-trading';

export class LiFiService {
  private lifi: LiFi;
  private readonly QUOTE_TIMEOUT = 30000; // 30 seconds
  private readonly QUOTE_TTL = 60000; // 60 seconds
  
  constructor() {
    this.lifi = new LiFi({
      integrator: 'worldstreet-spot-trading',
    });
  }
  
  /**
   * Get swap quote from LI.FI
   */
  async getQuote(params: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    try {
      const routeOptions: RouteOptions = {
        fromChainId: params.fromChain,
        toChainId: params.toChain,
        fromTokenAddress: params.fromToken,
        toTokenAddress: params.toToken,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        
        slippage: params.slippage / 10000, // Convert basis points to decimal
        
        // Optimization options
        order: 'RECOMMENDED', // Best route
        allowSwitchChain: false, // Same chain only
        
        // Preferences
        preferBridges: [],
        preferExchanges: ['uniswap', 'sushiswap', 'pancakeswap'],
      };
      
      const routes = await Promise.race([
        this.lifi.getRoutes(routeOptions),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Quote timeout')), this.QUOTE_TIMEOUT)
        ),
      ]);
      
      if (!routes || routes.routes.length === 0) {
        throw new Error('NO_ROUTE_FOUND');
      }
      
      // Get best route
      const bestRoute = routes.routes[0];
      
      return this.formatRoute(bestRoute);
    } catch (error) {
      console.error('[LiFiService] Quote error:', error);
      throw error;
    }
  }
  
  /**
   * Execute swap transaction
   */
  async executeSwap(
    route: Route,
    signer: any // ethers Signer or viem WalletClient
  ): Promise<string> {
    try {
      const execution = await this.lifi.executeRoute(signer, route);
      
      // Wait for transaction
      const process = execution.processes[0];
      await process.txHash;
      
      return process.txHash;
    } catch (error) {
      console.error('[LiFiService] Execution error:', error);
      throw error;
    }
  }
  
  /**
   * Check if quote is still valid
   */
  isQuoteValid(quoteTimestamp: number): boolean {
    return Date.now() - quoteTimestamp < this.QUOTE_TTL;
  }
  
  /**
   * Format route for our system
   */
  private formatRoute(route: Route): SwapQuoteResponse {
    const step = route.steps[0];
    const action = step.action;
    const estimate = step.estimate;
    
    return {
      id: route.id,
      type: step.type,
      tool: step.tool,
      action: {
        fromToken: action.fromToken,
        toToken: action.toToken,
        fromAmount: action.fromAmount,
        toAmount: estimate.toAmount,
        slippage: action.slippage,
      },
      estimate: {
        fromAmount: estimate.fromAmount,
        toAmount: estimate.toAmount,
        toAmountMin: estimate.toAmountMin,
        approvalAddress: estimate.approvalAddress,
        executionDuration: estimate.executionDuration,
        feeCosts: estimate.feeCosts || [],
        gasCosts: estimate.gasCosts || [],
      },
      transactionRequest: step.transactionRequest,
    };
  }
  
  /**
   * Get token allowance
   */
  async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    chainId: number
  ): Promise<bigint> {
    // Implementation depends on your web3 library
    // Return current allowance
    return 0n;
  }
  
  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint,
    signer: any
  ): Promise<string> {
    // Implementation depends on your web3 library
    // Return approval tx hash
    return '';
  }
}

export const lifiService = new LiFiService();
```

---

**Continue to Part 3 for API routes and hooks implementation.**
