import { create } from 'zustand';

export type Chain = 'solana' | 'arbitrum' | 'ethereum';
export type OrderSide = 'long' | 'short';
export type OrderType = 'market' | 'limit';

export interface Market {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  volume24h: number;
  priceChange24h: number;
}

// Legacy Position interface - no longer used
// Positions are now managed by PositionPanel using Drift API
export interface Position {
  id: string;
  market: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  markPrice?: number; // Optional to prevent errors
  leverage: number;
  liquidationPrice?: number;
  unrealizedPnL: number;
  marginRatio?: number;
  margin: number;
}

export interface Collateral {
  total: number;
  used: number;
  free: number;
  marginRatio: number;
  totalUnrealizedPnL: number;
  fundingAccrued: number;
}

export interface PreviewData {
  requiredMargin: number;
  estimatedLiquidationPrice: number;
  estimatedFee: number;
  maxLeverageAllowed: number;
  estimatedFundingImpact: number;
  // New margin validation fields
  totalRequired: number;
  freeCollateral: number;
  marginCheckPassed: boolean;
  notionalValue?: number;
  maintenanceMargin?: number;
}

export interface WalletAddresses {
  solana?: string;
  arbitrum?: string;
  ethereum?: string;
}

interface FuturesState {
  selectedChain: Chain;
  selectedMarket: Market | null;
  markets: Market[];
  positions: Position[];
  collateral: Collateral | null;
  walletAddresses: WalletAddresses;
  previewData: PreviewData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSelectedChain: (chain: Chain) => void;
  setSelectedMarket: (market: Market | null) => void;
  setMarkets: (markets: Market[]) => void;
  setPositions: (positions: Position[]) => void;
  setCollateral: (collateral: Collateral) => void;
  setWalletAddresses: (addresses: WalletAddresses) => void;
  setPreviewData: (data: PreviewData | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  selectedChain: 'solana' as Chain,
  selectedMarket: null,
  markets: [],
  positions: [],
  collateral: null,
  walletAddresses: {},
  previewData: null,
  isLoading: false,
  error: null,
};

export const useFuturesStore = create<FuturesState>((set) => ({
  ...initialState,
  
  setSelectedChain: (chain) => set({ selectedChain: chain, selectedMarket: null }),
  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setMarkets: (markets) => set({ markets }),
  setPositions: (positions) => set({ positions }),
  setCollateral: (collateral) => set({ collateral }),
  setWalletAddresses: (addresses) => set({ walletAddresses: addresses }),
  setPreviewData: (data) => set({ previewData: data }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
