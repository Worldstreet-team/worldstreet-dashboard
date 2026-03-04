"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useAuth } from '@/app/context/authContext';

// Dynamic imports for Drift SDK
let DriftClient: any;
let Wallet: any;

// Load Drift SDK dynamically
const loadDriftSDK = async () => {
  if (!DriftClient || !Wallet) {
    // @ts-expect-error - Dynamic import, types will be available at runtime
    const sdk = await import('@drift-labs/sdk');
    DriftClient = sdk.DriftClient;
    Wallet = sdk.Wallet;
  }
};

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
  
  // PIN unlock state (for futures page)
  showPinUnlock: boolean;
  setShowPinUnlock: (show: boolean) => void;
  handlePinUnlock: (pin: string) => void;
  
  // Methods
  refreshSummary: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  clearCache: () => void;
  
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
  const [isClientReady, setIsClientReady] = useState(false);
  
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
  const driftClientRef = useRef<any>(null);
  const [encryptedPrivateKey, setEncryptedPrivateKey] = useState<string | null>(null);

  // Clear cache on logout
  useEffect(() => {
    if (!user?.userId) {
      setUserPin(null);
      setIsClientReady(false);
      setSummary(null);
      setPositions([]);
      setEncryptedPrivateKey(null);
      if (driftClientRef.current) {
        try {
          driftClientRef.current.unsubscribe();
        } catch (err) {
          console.log('[DriftContext] Cleanup error (ignored):', err);
        }
        driftClientRef.current = null;
      }
    }
  }, [user?.userId]);

  // Fetch encrypted wallet on mount
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.userId) return;
      
      try {
        const response = await fetch('/api/wallet/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.userId })
        });
        
        const data = await response.json();
        
        if (data.success && data.data?.solana?.encryptedPrivateKey) {
          setEncryptedPrivateKey(data.data.solana.encryptedPrivateKey);
        }
      } catch (err) {
        console.error('[DriftContext] Error fetching wallet:', err);
      }
    };
    
    fetchWallet();
  }, [user?.userId]);

  // Initialize Drift client
  const initializeDriftClient = useCallback(async (pin: string) => {
    if (!encryptedPrivateKey) {
      throw new Error('No encrypted wallet found');
    }
    
    // Load SDK
    await loadDriftSDK();
    
    // Decrypt private key
    const { decryptWithPIN } = await import('@/lib/wallet/encryption');
    const decryptedPrivateKey = decryptWithPIN(encryptedPrivateKey, pin);
    
    // Create keypair
    const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
    const keypair = Keypair.fromSecretKey(secretKey);
    
    // Initialize connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Create Drift client
    const wallet = new Wallet(keypair);
    const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    const client = new DriftClient({
  connection,
  wallet,
  env: 'mainnet-beta',
  accountSubscription: {
    type: 'polling',
    accountLoader: undefined, // optional
  },
});
    
    // Subscribe to account updates
    await client.fetchAccounts();
    
    // Wait briefly for data to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    driftClientRef.current = client;
    return client;
  }, [encryptedPrivateKey]);
  const requestPin = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      // If we already have the PIN in memory, use it
      if (userPin) {
        console.log('[DriftContext] Using cached PIN from memory');
        resolve(userPin);
        return;
      }
      
      // If modal is already showing, don't show it again
      if (showPinUnlock) {
        console.log('[DriftContext] PIN modal already showing, waiting...');
        return;
      }
      
      // Otherwise, show PIN unlock modal
      console.log('[DriftContext] Showing PIN unlock modal');
      pinResolveRef.current = resolve;
      setShowPinUnlock(true);
    });
  }, [userPin, showPinUnlock]);

  // Handle PIN unlock
  const handlePinUnlock = useCallback((pin: string) => {
    setUserPin(pin);
    setShowPinUnlock(false);
    
    if (pinResolveRef.current) {
      pinResolveRef.current(pin);
      pinResolveRef.current = null;
    }
  }, []);

  // Refresh account summary from Drift client
  const refreshSummary = useCallback(async () => {
    if (!user?.userId || !encryptedPrivateKey) return;
    
    try {
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      const driftUser = client.getUser();
      const keypair = client.wallet.payer;
      
      let accountData;
      try {
        accountData = driftUser.getUserAccount();
      } catch (err) {
        // Account not initialized yet
        setSummary({
          initialized: false,
          publicAddress: keypair.publicKey.toBase58(),
          subaccountId: 0,
          totalCollateral: 0,
          freeCollateral: 0,
          unrealizedPnl: 0,
          leverage: 0,
          marginRatio: 0,
          openPositions: 0,
          openOrders: 0,
        });
        setIsClientReady(true);
        return;
      }
      
      const spotPosition = driftUser.getSpotPosition(0);
      const perpPositions = driftUser.getPerpPositions();
      
      const totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
      const freeCollateral = driftUser.getFreeCollateral ? Number(driftUser.getFreeCollateral()) / 1e6 : 0;
      
      let unrealizedPnl = 0;
      let openPositions = 0;
      
      if (perpPositions && Array.isArray(perpPositions)) {
        for (const position of perpPositions) {
          if (position.baseAssetAmount && position.baseAssetAmount.toNumber() !== 0) {
            openPositions++;
            unrealizedPnl += Number(position.unrealizedPnl || 0) / 1e6;
          }
        }
      }
      
      const leverage = totalCollateral > 0 ? (totalCollateral - freeCollateral) / totalCollateral : 0;
      const marginRatio = totalCollateral > 0 ? freeCollateral / totalCollateral : 0;
      
      setSummary({
        initialized: true,
        subaccountId: 0,
        publicAddress: keypair.publicKey.toBase58(),
        totalCollateral,
        freeCollateral,
        unrealizedPnl,
        leverage,
        marginRatio,
        openPositions,
        openOrders: 0,
      });
      setIsClientReady(true);
    } catch (err) {
      console.error('[DriftContext] Error refreshing summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh summary');
    }
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient]);

  // Refresh positions from Drift client
  const refreshPositions = useCallback(async () => {
    if (!user?.userId || !encryptedPrivateKey) return;
    
    try {
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      const driftUser = client.getUser();
      
      let accountData;
      try {
        accountData = driftUser.getUserAccount();
      } catch (err) {
        // Account not initialized yet
        setPositions([]);
        return;
      }
      
      const perpPositions = driftUser.getPerpPositions();
      const positionsList = [];
      
      if (perpPositions && Array.isArray(perpPositions)) {
        for (const position of perpPositions) {
          const baseAmount = position.baseAssetAmount ? position.baseAssetAmount.toNumber() : 0;
          if (baseAmount === 0) continue;
          
          const direction: 'long' | 'short' = baseAmount > 0 ? 'long' : 'short';
          const market = client.getPerpMarketAccount(position.marketIndex);
          
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
      }
      
      setPositions(positionsList);
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh positions');
    }
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient]);

  // Deposit collateral with fee
  const depositCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId || !encryptedPrivateKey) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      // Calculate fee (5%)
      const { calculateFee } = await import('@/config/drift');
      const { fee, netAmount } = calculateFee(amount);
      
      // First, send fee to master wallet if configured
      const { DRIFT_CONFIG } = await import('@/config/drift');
      if (DRIFT_CONFIG.MASTER_WALLET_ADDRESS) {
        const { SystemProgram, Transaction } = await import('@solana/web3.js');
        const { PublicKey } = await import('@solana/web3.js');
        
        const feeTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: client.wallet.publicKey,
            toPubkey: new PublicKey(DRIFT_CONFIG.MASTER_WALLET_ADDRESS),
            lamports: Math.floor(fee * 1e9), // Convert SOL to lamports
          })
        );
        
        const feeTxSignature = await client.connection.sendTransaction(feeTransaction, [client.wallet.payer]);
        await client.connection.confirmTransaction(feeTxSignature, 'confirmed');
        console.log('[DriftContext] Fee sent:', feeTxSignature);
      }
      
      // Then deposit net amount to Drift
      const txSignature = await client.deposit(
        netAmount * 1e6, // Convert to USDC base units
        0, // USDC market index
        client.getUser().getUserAccountPublicKey()
      );
      
      // Wait for confirmation
      await client.connection.confirmTransaction(txSignature, 'confirmed');
      
      await refreshSummary();
      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit collateral';
      console.error('[DriftContext] Deposit error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient, refreshSummary]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId || !encryptedPrivateKey) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      // Withdraw USDC
      const txSignature = await client.withdraw(
        amount * 1e6, // Convert to USDC base units
        0, // USDC market index
        client.getUser().getUserAccountPublicKey()
      );
      
      // Wait for confirmation
      await client.connection.confirmTransaction(txSignature, 'confirmed');
      
      await refreshSummary();
      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      console.error('[DriftContext] Withdraw error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient, refreshSummary]);

  // Open position
  const openPosition = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    size: number,
    leverage: number
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId || !encryptedPrivateKey) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      // Place order
      const baseAmount = size * 1e9;
      const orderParams = {
        orderType: 'market',
        marketIndex,
        direction,
        baseAssetAmount: baseAmount,
        price: 0,
      };
      
      const txSignature = await client.placePerpOrder(orderParams);
      
      // Wait for confirmation
      await client.connection.confirmTransaction(txSignature, 'confirmed');
      
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
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

  // Close position
  const closePosition = useCallback(async (marketIndex: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId || !encryptedPrivateKey) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }
      
      // Get position
      const driftUser = client.getUser();
      const position = driftUser.getPerpPosition(marketIndex);
      
      if (!position || position.baseAssetAmount.toNumber() === 0) {
        return { success: false, error: 'No position found' };
      }
      
      // Close position by placing opposite order
      const baseAmount = Math.abs(position.baseAssetAmount.toNumber());
      const direction = position.baseAssetAmount.toNumber() > 0 ? 'short' : 'long';
      
      const orderParams = {
        orderType: 'market',
        marketIndex,
        direction,
        baseAssetAmount: baseAmount,
        price: 0,
        reduceOnly: true,
      };
      
      const txSignature = await client.placePerpOrder(orderParams);
      
      // Wait for confirmation
      await client.connection.confirmTransaction(txSignature, 'confirmed');
      
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
  }, [user?.userId, encryptedPrivateKey, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

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

  // Clear cached PIN
  const clearCache = useCallback(() => {
    setUserPin(null);
    console.log('[DriftContext] Cleared cached PIN');
  }, []);

  // Initialize data when user logs in
  useEffect(() => {
    if (user?.userId && !isClientReady) {
      console.log('[DriftContext] Fetching initial data');
      refreshSummary();
      refreshPositions();
    }
  }, [user?.userId, isClientReady, refreshSummary, refreshPositions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  // Computed values
  const isInitialized = isClientReady && summary?.initialized === true;
  const needsInitialization = !isInitialized;
  const canTrade = isInitialized && (summary?.freeCollateral ?? 0) > 0 && (summary?.marginRatio ?? 0) > 0.1;

  const value: DriftContextValue = {
    isClientReady,
    summary,
    positions,
    isLoading,
    error,
    isInitialized,
    canTrade,
    needsInitialization,
    showPinUnlock,
    setShowPinUnlock,
    handlePinUnlock,
    refreshSummary,
    refreshPositions,
    clearCache,
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
    </DriftContext.Provider>
  );
};
