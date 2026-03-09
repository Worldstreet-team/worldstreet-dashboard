/**
 * TypeScript Type Definitions for Spot Trading System
 */

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
  fromAddress?: string;
  toAddress?: string;
  privateKey?: string;
}

export interface SwapExecutionResult {
  success: boolean;
  txHash?: string;
  trade?: SpotTrade;
  position?: SpotPosition;
  error?: string;
  errorCode?: string;
}

export interface PositionHistoryEntry {
  id: string;
  positionId: string;
  tradeId: string;
  action: 'OPEN' | 'INCREASE' | 'REDUCE' | 'CLOSE';
  amountBefore: string;
  avgPriceBefore?: string;
  amountAfter: string;
  avgPriceAfter: string;
  amountDelta: string;
  realizedPnl?: string;
  createdAt: Date;
}
