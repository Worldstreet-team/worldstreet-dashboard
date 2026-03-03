import { DriftClient, Wallet } from '@drift-labs/sdk';
import { Connection } from '@solana/web3.js';

// ── Core Types ─────────────────────────────────────────────────────────────

export interface SubaccountInfo {
  userId: string;
  subaccountId: number;
  futuresWalletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositResult {
  success: boolean;
  feeAmount: number;
  collateralAmount: number;
  feeSignature: string;
  depositSignature: string;
  totalAmount: number;
}

export interface PositionParams {
  marketIndex: number;
  direction: 'long' | 'short';
  baseAssetAmount: number;
  leverage: number;
  reduceOnly?: boolean;
  price?: number;
}

export interface UserClientData {
  driftClient: DriftClient;
  wallet: Wallet;
  connection: Connection;
  subaccountId: number;
  lastAccessed: number;
}

// ── Context Types ──────────────────────────────────────────────────────────

export interface MasterWalletInfo {
  address: string;
  balance: number;
  totalFeesCollected: number;
}

export interface DriftContextValue {
  // Master wallet operations
  masterWallet: MasterWalletInfo | null;
  refreshMasterWallet: () => Promise<void>;
  
  // Subaccount operations
  subaccountInfo: SubaccountInfo | null;
  initializeSubaccount: () => Promise<{ success: boolean; error?: string; data?: any }>;
  refreshSubaccountInfo: () => Promise<void>;
  
  // Collateral operations
  depositCollateral: (amount: number) => Promise<DepositResult>;
  
  // Position operations (placeholders)
  createPosition: (params: PositionParams) => Promise<any>;
  closePosition: (params: any) => Promise<any>;
  
  // Loading states
  isInitializingSubaccount: boolean;
  isDepositingCollateral: boolean;
  isCreatingPosition: boolean;
  isClosingPosition: boolean;
  
  // Error states
  error: string | null;
  clearError: () => void;
  
  // Utility
  getUserClient: () => Promise<UserClientData | null>;
  getMasterClient: () => Promise<DriftClient | null>;
}

// ── Fee Summary Types ──────────────────────────────────────────────────────

export interface FeeSummary {
  totalFeesCollected: number;
  numberOfDeposits: number;
  averageFeeAmount: number;
  lastFeeTimestamp: Date | null;
}

// ── Health Check Types ─────────────────────────────────────────────────────

export interface HealthCheckResult {
  healthy: boolean;
  masterWallet: {
    connected: boolean;
    balance: number;
    aboveThreshold: boolean;
  };
  database: {
    connected: boolean;
    responseTimeMs: number;
  };
  grpc: {
    connected: boolean;
  };
  activeClients: number;
  timestamp: Date;
}
