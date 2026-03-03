"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/app/context/authContext';
import { PinUnlockModal } from '@/components/wallet/PinUnlockModal';
import { decryptWithPIN } from '@/lib/wallet/encryption';

// Types
interface DriftAccountSummary {
  subaccountId: number;
  publicAddress: string;
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  openOrders: number;
  initialized: boolean;
}

interface DriftPosition {
  marketIndex: number;
  direction: 'long' | 'short';
  baseAmount: number;
  quoteAmount: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

interface DriftContextValue {
  // Client state
  driftClient: any | null;
  isClientReady: boolean;
  
  // Account data
  summary: DriftAccountSummary | null;
  positions: DriftPosition[];
  
  // Loading/error states
  isLoading: boolean;
  error: string | null;
  
  // Computed booleans
  isInitialized: boolean;
  canTrade: boolean;
  needsInitialization: boolean;
  
  // Methods
  initializeDriftClient: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  
  // Trading operations
  depositCollateral: (amount: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  withdrawCollateral: (amount: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  openPosition: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  closePosition: (marketIndex: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  
  // Auto-refresh control
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}

const DriftContext = createContext<DriftContextValue | undefined>(undefined);

export const useDrift = () => {
  const context = useContext(DriftContext);
  if (!context) {
    throw new Error('useDrift must be used within a DriftProvider');
  }
  return context;
};

interface DriftProviderProps {
  children: ReactNode;
}

export const DriftProvider: React.FC<DriftProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Client state
  const [driftClient, setDriftClient] = useState<any | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  
  // Account data
  const [summary, setSummary] = useState<DriftAccountSummary | null>(null);
  const [positions, setPositions] = useState<DriftPosition[]>([]);
  
  // Loading/error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PIN unlock state
  const [showPinUnlock, setShowPinUnlock] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const pinResolveRef = useRef<((pin: string) => void) | null>(null);
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Request PIN from user
  const requestPin = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      // If we already have the PIN in memory, use it
      if (userPin) {
        resolve(userPin);
        return;
      }
      
      // Otherwise, show PIN unlock modal
      pinResolveRef.current = resolve;
      setShowPinUnlock(true);
    });
  }, [userPin]);

  // Handle PIN unlock
  const handlePinUnlock = useCallback((pin: string) => {
    setUserPin(pin);
    setShowPinUnlock(false);
    
    if (pinResolveRef.current) {
      pinResolveRef.current(pin);
      pinResolveRef.current = null;
    }
  }, []);

  // Initialize Solana connection
  useEffect(() => {
    const initConnection = async () => {
      const { Connection } = await import('@solana/web3.js');
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const conn = new Connection(rpcUrl, 'confirmed');
      setConnection(conn as any);
    };
    initConnection();
  }, []);

  // Initialize Drift client when user is authenticated
  const initializeDriftClient = useCallback(async () => {
    if (!user?.userId || !connection || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      // Request PIN from user
      const pin = await requestPin();
      
      // Get user's encrypted Solana wallet from server
      const walletResponse = await fetch('/api/wallet/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      if (!walletResponse.ok) {
        const errorData = await walletResponse.json();
        throw new Error(errorData.message || 'Failed to get wallet keys');
      }
      
      const walletData = await walletResponse.json();
      
      if (!walletData.success || !walletData.wallets?.solana?.encryptedPrivateKey) {
        throw new Error('Solana wallet not found');
      }
      
      // Decrypt private key CLIENT-SIDE with user's PIN
      let decryptedPrivateKey: string;
      try {
        decryptedPrivateKey = decryptWithPIN(walletData.wallets.solana.encryptedPrivateKey, pin);
      } catch (err) {
        throw new Error('Incorrect PIN or corrupted wallet data');
      }
      
      // Dynamic import of Drift SDK and Solana
      const { DriftClient, Wallet } = await import('@drift-labs/sdk');
      const { Keypair, PublicKey: SolanaPublicKey } = await import('@solana/web3.js');
      const bs58 = (await import('bs58')).default;
      
      // Create keypair from decrypted private key
      const secretKey = bs58.decode(decryptedPrivateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Create wallet wrapper
      const wallet = new Wallet(keypair as any);
      
      // Get or create subaccount ID
      const subaccountResponse = await fetch('/api/futures/subaccount/info');
      let subaccountId = 0;
      
      if (subaccountResponse.ok) {
        const subaccountData = await subaccountResponse.json();
        if (subaccountData.success) {
          subaccountId = subaccountData.data.subaccountId;
        }
      }
      
      // Initialize Drift client
      const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
      
      const client = new DriftClient({
        connection: connection as any,
        wallet,
        programID: new SolanaPublicKey(DRIFT_PROGRAM_ID) as any,
        accountSubscription: {
          type: 'websocket',
        },
        subAccountIds: [subaccountId]
      } as any);
      
      // Subscribe to account updates
      await client.subscribe();
      
      setDriftClient(client);
      setIsClientReady(true);
      
      console.log('[DriftContext] Client initialized successfully');
      
      // Fetch initial data
      await refreshSummaryInternal(client);
      await refreshPositionsInternal(client);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Drift client';
      setError(errorMessage);
      console.error('[DriftContext] Initialization error:', err);
      
      // Clear PIN on error so user can retry
      setUserPin(null);
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [user?.userId, connection, requestPin]);

  // Refresh account summary from client
  const refreshSummaryInternal = async (client: any) => {
    if (!client) return;
    
    try {
      const user = client.getUser();
      const spotPosition = user.getSpotPosition(0); // USDC spot position
      const perpPositions = user.getPerpPositions();
      
      const totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
      const freeCollateral = user.getFreeCollateral ? Number(user.getFreeCollateral()) / 1e6 : 0;
      
      let unrealizedPnl = 0;
      let openPositions = 0;
      
      for (const position of perpPositions) {
        if (position.baseAssetAmount.toNumber() !== 0) {
          openPositions++;
          unrealizedPnl += Number(position.unrealizedPnl || 0) / 1e6;
        }
      }
      
      const leverage = totalCollateral > 0 ? (totalCollateral - freeCollateral) / totalCollateral : 0;
      const marginRatio = totalCollateral > 0 ? freeCollateral / totalCollateral : 0;
      
      setSummary({
        subaccountId: user.subAccountId || 0,
        publicAddress: user.authority.toBase58(),
        totalCollateral,
        freeCollateral,
        unrealizedPnl,
        leverage,
        marginRatio,
        openPositions,
        openOrders: 0,
        initialized: true
      });
      
    } catch (err) {
      console.error('[DriftContext] Error refreshing summary:', err);
    }
  };

  const refreshSummary = useCallback(async () => {
    if (!driftClient) return;
    await refreshSummaryInternal(driftClient);
  }, [driftClient]);

  // Refresh positions from client
  const refreshPositionsInternal = async (client: any) => {
    if (!client) return;
    
    try {
      const user = client.getUser();
      const perpPositions = user.getPerpPositions();
      
      const positionsList: DriftPosition[] = [];
      
      for (const position of perpPositions) {
        const baseAmount = position.baseAssetAmount.toNumber();
        if (baseAmount === 0) continue;
        
        const direction = baseAmount > 0 ? 'long' : 'short';
        const market = client.getPerpMarketAccount(position.marketIndex);
        const oraclePrice = client.getOracleDataForPerpMarket(position.marketIndex);
        
        positionsList.push({
          marketIndex: position.marketIndex,
          direction,
          baseAmount: Math.abs(baseAmount) / 1e9,
          quoteAmount: Math.abs(position.quoteAssetAmount.toNumber()) / 1e6,
          entryPrice: Number(position.quoteEntryAmount) / Math.abs(baseAmount),
          unrealizedPnl: Number(position.unrealizedPnl || 0) / 1e6,
          leverage: market ? Number(market.marginRatioInitial) / 10000 : 1
        });
      }
      
      setPositions(positionsList);
      
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
    }
  };

  const refreshPositions = useCallback(async () => {
    if (!driftClient) return;
    await refreshPositionsInternal(driftClient);
  }, [driftClient]);

  // Deposit collateral
  const depositCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!driftClient || !isClientReady) {
      return { success: false, error: 'Drift client not ready' };
    }
    
    try {
      setIsLoading(true);
      
      // Deposit USDC to Drift account
      const txSignature = await driftClient.deposit(
        amount * 1e6, // Convert to USDC base units
        0, // USDC market index
        driftClient.getUser().getUserAccountPublicKey()
      );
      
      // Wait for confirmation
      await connection?.confirmTransaction(txSignature, 'confirmed');
      
      // Refresh data
      await refreshSummary();
      
      return { success: true, txSignature };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit collateral';
      console.error('[DriftContext] Deposit error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [driftClient, isClientReady, connection, refreshSummary]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!driftClient || !isClientReady) {
      return { success: false, error: 'Drift client not ready' };
    }
    
    try {
      setIsLoading(true);
      
      // Withdraw USDC from Drift account
      const txSignature = await driftClient.withdraw(
        amount * 1e6, // Convert to USDC base units
        0, // USDC market index
        driftClient.getUser().getUserAccountPublicKey()
      );
      
      // Wait for confirmation
      await connection?.confirmTransaction(txSignature, 'confirmed');
      
      // Refresh data
      await refreshSummary();
      
      return { success: true, txSignature };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      console.error('[DriftContext] Withdraw error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [driftClient, isClientReady, connection, refreshSummary]);

  // Open position
  const openPosition = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    size: number,
    leverage: number
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!driftClient || !isClientReady) {
      return { success: false, error: 'Drift client not ready' };
    }
    
    try {
      setIsLoading(true);
      
      const baseAmount = size * 1e9; // Convert to base units
      const orderParams = {
        orderType: 'market' as any,
        marketIndex,
        direction: direction === 'long' ? 'long' as any : 'short' as any,
        baseAssetAmount: baseAmount,
        price: 0, // Market order
      };
      
      const txSignature = await driftClient.placePerpOrder(orderParams);
      
      // Wait for confirmation
      await connection?.confirmTransaction(txSignature, 'confirmed');
      
      // Refresh data
      await refreshSummary();
      await refreshPositions();
      
      return { success: true, txSignature };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open position';
      console.error('[DriftContext] Open position error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [driftClient, isClientReady, connection, refreshSummary, refreshPositions]);

  // Close position
  const closePosition = useCallback(async (marketIndex: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!driftClient || !isClientReady) {
      return { success: false, error: 'Drift client not ready' };
    }
    
    try {
      setIsLoading(true);
      
      const user = driftClient.getUser();
      const position = user.getPerpPosition(marketIndex);
      
      if (!position || position.baseAssetAmount.toNumber() === 0) {
        return { success: false, error: 'No position found' };
      }
      
      // Close position by placing opposite order
      const baseAmount = Math.abs(position.baseAssetAmount.toNumber());
      const direction = position.baseAssetAmount.toNumber() > 0 ? 'short' as any : 'long' as any;
      
      const orderParams = {
        orderType: 'market' as any,
        marketIndex,
        direction,
        baseAssetAmount: baseAmount,
        price: 0,
        reduceOnly: true,
      };
      
      const txSignature = await driftClient.placePerpOrder(orderParams);
      
      // Wait for confirmation
      await connection?.confirmTransaction(txSignature, 'confirmed');
      
      // Refresh data
      await refreshSummary();
      await refreshPositions();
      
      return { success: true, txSignature };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      console.error('[DriftContext] Close position error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [driftClient, isClientReady, connection, refreshSummary, refreshPositions]);

  // Auto-refresh
  const startAutoRefresh = useCallback((intervalMs: number = 30000) => {
    stopAutoRefresh();
    autoRefreshIntervalRef.current = setInterval(() => {
      refreshSummary();
      refreshPositions();
    }, intervalMs);
  }, [refreshSummary, refreshPositions]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
  }, []);

  // Initialize client when user logs in
  useEffect(() => {
    if (user?.userId && connection && !driftClient) {
      initializeDriftClient();
    }
  }, [user?.userId, connection, driftClient, initializeDriftClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      if (driftClient) {
        driftClient.unsubscribe().catch(console.error);
      }
    };
  }, [driftClient, stopAutoRefresh]);

  // Computed values
  const isInitialized = isClientReady && summary?.initialized === true;
  const needsInitialization = !isInitialized;
  const canTrade = isInitialized && (summary?.freeCollateral ?? 0) > 0 && (summary?.marginRatio ?? 0) > 0.1;

  const value: DriftContextValue = {
    driftClient,
    isClientReady,
    summary,
    positions,
    isLoading,
    error,
    isInitialized,
    canTrade,
    needsInitialization,
    initializeDriftClient,
    refreshSummary,
    refreshPositions,
    depositCollateral,
    withdrawCollateral,
    openPosition,
    closePosition,
    startAutoRefresh,
    stopAutoRefresh,
  };

  return (
    <DriftContext.Provider value={value}>
      {children}
      <PinUnlockModal
        isOpen={showPinUnlock}
        onClose={() => setShowPinUnlock(false)}
        onUnlock={handlePinUnlock}
        title="Unlock Drift Wallet"
        description="Enter your PIN to access Drift Protocol trading"
      />
    </DriftContext.Provider>
  );
};
