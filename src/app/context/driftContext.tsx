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
  const [cachedEncryptedKeys, setCachedEncryptedKeys] = useState<any>(null);
  const pinResolveRef = useRef<((pin: string) => void) | null>(null);
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Clear cache on logout
  useEffect(() => {
    if (!user?.userId) {
      setCachedEncryptedKeys(null);
      setUserPin(null);
      setDriftClient(null);
      setIsClientReady(false);
      if (typeof window !== 'undefined') {
        // Clear all cached keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('drift_encrypted_keys_')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  }, [user?.userId]);

  // Request PIN from user
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

  // Initialize Solana connection with Ankr RPC (WebSocket support)
  useEffect(() => {
    const initConnection = async () => {
      const { Connection } = await import('@solana/web3.js');
      // Use Ankr RPC with WebSocket support
      const rpcUrl = 'https://rpc.ankr.com/solana/701746b6d4fe4674bd2a69164cebbcf717b533e80af1bb8d7d04199c04f6f7a9';
      const wsUrl = 'wss://rpc.ankr.com/solana/ws/701746b6d4fe4674bd2a69164cebbcf717b533e80af1bb8d7d04199c04f6f7a9';
      
      const conn = new Connection(rpcUrl, {
        commitment: 'confirmed',
        wsEndpoint: wsUrl,
      });
      setConnection(conn as any);
      console.log('[DriftContext] Connection initialized with Ankr RPC and WebSocket');
    };
    initConnection();
  }, []);

  // Initialize Drift client when user is authenticated
  const initializeDriftClient = useCallback(async () => {
    if (!user?.userId || !connection || isInitializingRef.current) return;
    
    // Prevent re-initialization if client is already ready
    if (isClientReady && driftClient) {
      console.log('[DriftContext] Client already initialized, skipping');
      return;
    }
    
    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      let encryptedPrivateKey: string;
      let pin: string;
      
      // Check if we have cached encrypted keys
      const cacheKey = `drift_encrypted_keys_${user.userId}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        console.log('[DriftContext] Using cached encrypted keys');
        try {
          const parsed = JSON.parse(cachedData);
          encryptedPrivateKey = parsed.solana?.encryptedPrivateKey;
          
          if (!encryptedPrivateKey) {
            throw new Error('No Solana key in cache');
          }
          
          // Request PIN to decrypt cached keys
          pin = await requestPin();
        } catch (err) {
          console.error('[DriftContext] Cache invalid, fetching from server');
          localStorage.removeItem(cacheKey);
          // Fall through to server fetch
          encryptedPrivateKey = '';
        }
      }
      
      if (!encryptedPrivateKey) {
        console.log('[DriftContext] Fetching encrypted keys from server');
        
        // Request PIN from user first
        pin = await requestPin();
        
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
        
        encryptedPrivateKey = walletData.wallets.solana.encryptedPrivateKey;
        
        // Cache encrypted keys in localStorage for future use
        localStorage.setItem(cacheKey, JSON.stringify(walletData.wallets));
        setCachedEncryptedKeys(walletData.wallets);
        console.log('[DriftContext] Cached encrypted keys to localStorage');
      }
      
      // Decrypt private key CLIENT-SIDE with user's PIN
      let decryptedPrivateKey: string;
      try {
        decryptedPrivateKey = decryptWithPIN(encryptedPrivateKey, pin!);
      } catch (err) {
        // Clear cached keys if decryption fails (might be corrupted)
        const cacheKey = `drift_encrypted_keys_${user.userId}`;
        localStorage.removeItem(cacheKey);
        setCachedEncryptedKeys(null);
        throw new Error('Incorrect PIN or corrupted wallet data');
      }
      
      // Dynamic import of Drift SDK and Solana
      const { DriftClient, Wallet } = await import('@drift-labs/sdk');
      const { Keypair, PublicKey: SolanaPublicKey } = await import('@solana/web3.js');
      
      // CRITICAL: Solana private keys are stored as BASE64 (not base58!)
      // The encryption system stores the raw 64-byte secret key as base64
      // DO NOT use bs58.decode() - that's for public addresses only
      console.log('[DriftContext] Decoding private key from base64 format');
      const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
      const keypair = Keypair.fromSecretKey(secretKey);
      console.log('[DriftContext] Keypair created successfully, public key:', keypair.publicKey.toBase58());
      
      // Create wallet wrapper
      const wallet = new Wallet(keypair as any);
      
      // Use subaccount ID 0 (default for all users)
      // Each user's wallet has its own Drift account, subaccount 0 is the main account
      const subaccountId = 0;
      console.log('[DriftContext] Using subaccount ID:', subaccountId);
      
      // Initialize Drift client
      const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
      
      console.log('[DriftContext] Creating Drift client with WebSocket subscription (Ankr RPC)');
      
      const client = new DriftClient({
        connection: connection as any,
        wallet,
        programID: new SolanaPublicKey(DRIFT_PROGRAM_ID) as any,
        accountSubscription: {
          type: 'websocket',
          // Real-time updates via WebSocket
          // Ankr provides reliable WebSocket support for instant account updates
        },
        subAccountIds: [subaccountId]
      } as any);
      
      // Subscribe to account updates (using WebSocket with Ankr RPC)
      await client.subscribe();
      
      console.log('[DriftContext] Subscribed to Drift account updates (WebSocket mode)');
      
      // Check if user account exists, if not, initialize it
      try {
        const user = client.getUser();
        
        // Wait a bit for subscription to load data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let accountData;
        try {
          accountData = user.getUserAccount();
        } catch (err) {
          console.log('[DriftContext] Account data not available yet');
          accountData = null;
        }
        
        if (!accountData) {
          console.log('[DriftContext] Drift account not found, initializing...');
          
          // Initialize Drift account (this creates the on-chain account)
          const initTx = await client.initializeUser();
          await connection?.confirmTransaction(initTx, 'confirmed');
          
          console.log('[DriftContext] Drift account initialized successfully');
          
          // Wait for account data to load
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('[DriftContext] Drift account already exists');
        }
      } catch (err) {
        console.error('[DriftContext] Error checking/initializing account:', err);
        // Continue anyway, the account might exist but not loaded yet
      }
      
      setDriftClient(client);
      setIsClientReady(true);
      
      console.log('[DriftContext] Client initialized successfully');
      
      // Wait briefly for initial WebSocket data to arrive
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      // Ensure account data is loaded
      const user = client.getUser();
      if (!user) {
        console.warn('[DriftContext] User not found, skipping summary refresh');
        return;
      }

      // Check if account data is loaded
      let accountData;
      try {
        accountData = user.getUserAccount();
      } catch (err) {
        console.warn('[DriftContext] Account not subscribed yet, skipping summary refresh');
        return;
      }
      
      // Check if accountData exists and has data property
      if (!accountData) {
        console.warn('[DriftContext] Account data not loaded yet, skipping summary refresh');
        return;
      }
      
      const spotPosition = user.getSpotPosition(0); // USDC spot position
      const perpPositions = user.getPerpPositions();
      
      const totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
      const freeCollateral = user.getFreeCollateral ? Number(user.getFreeCollateral()) / 1e6 : 0;
      
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
      if (!user) {
        console.warn('[DriftContext] User not found, skipping positions refresh');
        return;
      }

      // Check if account data is loaded
      let accountData;
      try {
        accountData = user.getUserAccount();
      } catch (err) {
        console.warn('[DriftContext] Account not subscribed yet, skipping positions refresh');
        return;
      }
      
      // Check if accountData exists
      if (!accountData) {
        console.warn('[DriftContext] Account data not loaded yet, skipping positions refresh');
        return;
      }
      
      const perpPositions = user.getPerpPositions();
      
      const positionsList: DriftPosition[] = [];
      
      if (perpPositions && Array.isArray(perpPositions)) {
        for (const position of perpPositions) {
          const baseAmount = position.baseAssetAmount ? position.baseAssetAmount.toNumber() : 0;
          if (baseAmount === 0) continue;
          
          const direction = baseAmount > 0 ? 'long' : 'short';
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

  // Clear cached keys and PIN (useful for troubleshooting or logout)
  const clearCache = useCallback(() => {
    if (user?.userId) {
      const cacheKey = `drift_encrypted_keys_${user.userId}`;
      localStorage.removeItem(cacheKey);
      setCachedEncryptedKeys(null);
      setUserPin(null);
      console.log('[DriftContext] Cleared cached keys and PIN');
    }
  }, [user?.userId]);

  // Initialize client when user logs in (only once)
  useEffect(() => {
    if (user?.userId && connection && !driftClient && !isInitializingRef.current) {
      console.log('[DriftContext] Triggering initialization');
      initializeDriftClient();
    }
  }, [user?.userId, connection, driftClient, initializeDriftClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      if (driftClient) {
        driftClient.unsubscribe().catch((err: any) => {
          console.error('[DriftContext] Error unsubscribing:', err);
        });
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
