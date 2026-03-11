"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useAuth } from '@/app/context/authContext';
import { usePathname } from 'next/navigation';
import { PinUnlockModal } from '@/components/wallet/PinUnlockModal';
import { DriftErrorModal } from '@/components/drift/DriftErrorModal';

// Dynamic imports for Drift SDK
let DriftClient: any;
let Wallet: any;

// Load Drift SDK dynamically
const loadDriftSDK = async () => {
  if (!DriftClient || !Wallet) {
    // Dynamic import, types will be available at runtime
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
  marketName: string; // Stable market symbol (e.g., "SOL-PERP")
  direction: 'long' | 'short';
  baseAmount: number;
  quoteAmount: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface PerpMarketInfo {
  marketIndex: number;
  symbol: string;
  baseAssetSymbol: string;
  initialized: boolean;
}

export interface SpotMarketInfo {
  marketIndex: number;
  symbol: string;
  decimals: number;
  initialized: boolean;
}

interface DriftSpotPosition {
  marketIndex: number;
  marketName: string;
  amount: number;
  balanceType: 'deposit' | 'borrow';
  value: number;
  price: number;
}

interface DriftOrder {
  marketIndex: number;
  marketType: 'perp' | 'spot';
  orderType: 'market' | 'limit';
  direction: 'long' | 'short' | 'buy' | 'sell';
  baseAssetAmount: string;
  price: string;
  status: 'init' | 'open' | 'filled' | 'canceled';
  orderIndex: number;
  marketName?: string; // Optional market name for display
}

interface DriftContextValue {
  // Client state
  isClientReady: boolean;
  connection: Connection | null;

  // Account data
  summary: DriftAccountSummary | null;
  walletBalance: number; // Native SOL balance

  // Market data
  perpMarkets: Map<number, PerpMarketInfo>;
  spotMarkets: Map<number, SpotMarketInfo>;
  getMarketName: (marketIndex: number) => string;
  getMarketIndexBySymbol: (symbol: string) => number | undefined;
  getSpotMarketName: (marketIndex: number) => string;
  getSpotMarketIndexBySymbol: (symbol: string) => number | undefined;

  // Positions
  positions: DriftPosition[];
  spotPositions: DriftSpotPosition[];

  // Orders
  openOrders: DriftOrder[];
  getOpenOrders: () => Promise<DriftOrder[]>;
  getAllOrders: () => Promise<DriftOrder[]>;
  cancelOrder: (orderIndex: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;

  // Loading/error states
  isLoading: boolean;
  error: string | null;
  isInitializing: boolean;
  initializationError: string | null;

  // Computed booleans
  isInitialized: boolean;
  canTrade: boolean;
  needsInitialization: boolean;

  // PIN unlock state
  showPinUnlock: boolean;
  setShowPinUnlock: (show: boolean) => void;
  handlePinUnlock: (pin: string) => void;

  // Insufficient SOL modal state
  showInsufficientSol: boolean;
  setShowInsufficientSol: (show: boolean) => void;
  solBalanceInfo: {
    required: number;
    current: number;
    address: string;
  } | null;

  // Methods
  refreshSummary: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  clearCache: () => void;
  resetInitializationFailure: () => void;

  // Trading operations
  depositCollateral: (amount: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  withdrawCollateral: (amount: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  openPosition: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number, orderType?: 'market' | 'limit' | 'stop-limit', price?: number, triggerPrice?: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  closePosition: (marketIndex: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  placeSpotOrder: (marketIndex: number, direction: 'buy' | 'sell', amount: number, orderType?: 'market' | 'limit' | 'stop-limit', price?: number, triggerPrice?: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  previewTrade: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number) => Promise<any>;
  getMarketPrice: (marketIndex: number, type?: 'perp' | 'spot') => number;

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
  const [spotPositions, setSpotPositions] = useState<DriftSpotPosition[]>([]);
  const [openOrders, setOpenOrders] = useState<DriftOrder[]>([]);

  // Market data - stable mapping from marketIndex to market info
  const [perpMarkets, setPerpMarkets] = useState<Map<number, PerpMarketInfo>>(new Map());
  const [spotMarkets, setSpotMarkets] = useState<Map<number, SpotMarketInfo>>(new Map());

  // Loading/error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first initialization
  const [showInitOverlay, setShowInitOverlay] = useState(false); // Control overlay visibility
  const [hasInitializedOnce, setHasInitializedOnce] = useState(false); // Track if initialization has ever completed successfully

  // PIN unlock state
  const [showPinUnlock, setShowPinUnlock] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const pinResolveRef = useRef<((pin: string) => void) | null>(null);

  // Insufficient SOL modal state
  const [showInsufficientSol, setShowInsufficientSol] = useState(false);
  const [solBalanceInfo, setSolBalanceInfo] = useState<{
    required: number;
    current: number;
    address: string;
  } | null>(null);

  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    details?: {
      orderSize?: string;
      minRequired?: string;
      minValue?: string;
      available?: string;
      required?: string;
    };
  } | null>(null);

  // Track initialization failure to prevent auto-retry
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const driftClientRef = useRef<any>(null);
  const [encryptedPrivateKey, setEncryptedPrivateKey] = useState<string | null>(null);

  // Clear cache on logout
  useEffect(() => {
    if (!user?.userId) {
      setUserPin(null);
      if (typeof window !== 'undefined') localStorage.removeItem('worldstreet_temp_pin');
      setIsClientReady(false);
      setSummary(null);
      setPositions([]);
      setEncryptedPrivateKey(null);
      setInitializationFailed(false);
      setHasInitializedOnce(false); // Reset initialization flag on logout
      if (driftClientRef.current) {
        // Unsubscribe from polling
        try {
          if (driftClientRef.current.isSubscribed) {
            driftClientRef.current.unsubscribe();
          }
        } catch (err) {
          console.log('[DriftContext] Error unsubscribing:', err);
        }
        driftClientRef.current = null;
      }
    }
  }, [user?.userId]);

  const pathname = usePathname();
  const isTradingPage = pathname?.includes('/futures') || pathname?.includes('/spot');

  // If we start initializing in the background (e.g. on Dashboard)
  // but then navigate to a trading page while still initializing,
  // we should show the overlay on that page.
  // BUT only if we haven't successfully initialized before
  useEffect(() => {
    if (isInitializing && isTradingPage && !showInitOverlay && !hasInitializedOnce) {
      console.log('[DriftContext] Navigated to trading page during init, showing overlay');
      setShowInitOverlay(true);
    }
  }, [isInitializing, isTradingPage, showInitOverlay, hasInitializedOnce]);

  // Fetch encrypted wallet on mount
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.userId) return;

      // Don't fetch wallet until we have a PIN
      // The wallet will be fetched when user unlocks with PIN
      console.log('[DriftContext] Waiting for PIN to fetch wallet (polling mode)');
    };

    fetchWallet();
  }, [user?.userId]);

  // Debug: Log when spotMarkets changes
  useEffect(() => {
    console.log('[DriftContext] 🔄 spotMarkets state updated:', {
      size: spotMarkets.size,
      indices: Array.from(spotMarkets.keys()).sort((a, b) => a - b),
      symbols: Array.from(spotMarkets.values()).map(m => m.symbol),
    });
  }, [spotMarkets]);
  /**
   * Initialize Drift client with robust WebSocket handling and fallback to polling
   * 
   * This function handles:
   * 1. WebSocket connection readiness detection
   * 2. User account existence check BEFORE subscribing
   * 3. Automatic fallback to polling if WebSocket fails
   * 4. Retry logic with exponential backoff
   * 5. Detailed error logging for debugging
   */
  const initializeDriftClient = useCallback(async (pin: string) => {
    const MAX_RETRIES = 1;
    const INITIAL_RETRY_DELAY = 1000;

    // Helper: Check if user account exists on-chain
    const checkUserAccountExists = async (
      connection: Connection,
      userAccountPubkey: PublicKey
    ): Promise<boolean> => {
      try {
        const accountInfo = await connection.getAccountInfo(userAccountPubkey);
        const exists = accountInfo !== null;
        console.log(`[DriftContext] User account ${userAccountPubkey.toBase58()} exists:`, exists);
        return exists;
      } catch (err) {
        console.error('[DriftContext] Error checking user account:', err);
        return false;
      }
    };

    // Helper: Create Drift client with websocket subscription and optimized transaction handling
    const createDriftClient = async (
      connection: Connection,
      wallet: any,
      programId: PublicKey
    ) => {
      console.log(`[DriftContext] Creating DriftClient with websocket subscription and optimized tx handling`);
      
      // Import transaction sender classes
      const { WhileValidTxSender } = await import('@drift-labs/sdk');
      
      // Create optimized transaction sender with retry logic
      const txSender = new WhileValidTxSender({
        connection,
        wallet,
        opts: { 
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false,
        },
        retrySleep: 2000, // Retry every 2 seconds
        timeout: 60000,   // Total timeout of 60 seconds
        additionalConnections: [], // Can add backup RPC endpoints here
      });

      return new DriftClient({
        connection,
        wallet,
        programID: programId,
        accountSubscription: {
          type: 'websocket',
        },
        // CRITICAL: Only subscribe to first 10 markets to avoid overwhelming the client
        // Drift Protocol has 60+ markets but we only need the most liquid ones
        perpMarketIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // First 10 perp markets
        // Subscribe to first 10 spot markets (USDC, SOL, mSOL, wBTC, wETH, USDT, jitoSOL, PYTH, bSOL, JTO)
        spotMarketIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // First 10 spot markets
        oracleInfos: [],
        // Use optimized transaction sender with retry logic
        txSender,
        // Enable transaction metrics for monitoring
        enableMetricsEvents: true,
        trackTxLandRate: true,
        // Configure transaction handler with blockhash caching
        txHandlerConfig: {
          blockhashCachingEnabled: true,
          blockhashCachingConfig: {
            retryCount: 5,
            retrySleepTimeMs: 100,
            staleCacheTimeMs: 1000,
          },
        },
      });
    };

    // Pre-fetch wallet private key once before potentially retrying
    let fetchedEncryptedKey = encryptedPrivateKey;

    if (!fetchedEncryptedKey) {
      console.log('[DriftContext] Fetching encrypted wallet key...');
      const response = await fetch('/api/wallet/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (!data.success || !data.wallets?.solana?.encryptedPrivateKey) {
        throw new Error(data.message || 'Failed to fetch wallet');
      }

      fetchedEncryptedKey = data.wallets.solana.encryptedPrivateKey;
      setEncryptedPrivateKey(fetchedEncryptedKey);
    }

    // Main initialization logic with retry
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[DriftContext] Initialization attempt ${attempt + 1}/${MAX_RETRIES}`);

        // Step 2: Load SDK and decrypt private key
        await loadDriftSDK();

        const { decryptWithPIN } = await import('@/lib/wallet/encryption');
        const decryptedPrivateKey = decryptWithPIN(fetchedEncryptedKey!, pin);

        const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
        const keypair = Keypair.fromSecretKey(secretKey);

        console.log('[DriftContext] Wallet keypair created:', keypair.publicKey.toBase58());

        // Step 3: Initialize connection with configurable endpoints
        const wsUrl = process.env.NEXT_PUBLIC_SOLANA_WS_URL ||
          'wss://solana-mainnet.core.chainstack.com/6b2efd9b0b11d871382ce7bf3c7c0d89';
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          'https://api.mainnet-beta.solana.com';

        console.log('[DriftContext] Connecting to RPC:', rpcUrl);
        console.log('[DriftContext] WebSocket endpoint:', wsUrl);

        const connection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          wsEndpoint: wsUrl,
        });

        // Step 4: Create wallet
        const wallet = new Wallet(keypair);

        // Step 5: Determine user account public key
        const DRIFT_PROGRAM_ID = new PublicKey(
          process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID ||
          'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'
        );

        // Derive user account PDA (subaccount 0)
        const [userAccountPubkey] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('user'),
            keypair.publicKey.toBuffer(),
            new Uint8Array([0, 0]), // subaccount 0
          ],
          DRIFT_PROGRAM_ID
        );

        console.log('[DriftContext] Derived user account PDA:', userAccountPubkey.toBase58());

        // Step 6: Check if user account exists on-chain
        const userAccountExists = await checkUserAccountExists(connection, userAccountPubkey);

        // Step 8: Create Drift client
        let client = await createDriftClient(connection, wallet, DRIFT_PROGRAM_ID);

        // Step 9: Subscribe to client
        // CRITICAL: Must subscribe BEFORE initializing account, even if account doesn't exist
        // The initializeUserAccount method requires an active subscription to work
        try {
          console.log('[DriftContext] Subscribing to DriftClient via WebSocket...');
          await client.subscribe();
          console.log('[DriftContext] Successfully subscribed to DriftClient via WebSocket');

          // Verify subscription is active
          if (!client.isSubscribed) {
            console.warn('[DriftContext] Client subscription finished, but isSubscribed is false. Proceeding anyway.');
          }

        } catch (subscribeErr: any) {
          console.error('[DriftContext] WebSocket subscription error:', subscribeErr);

          // Log detailed JSON-RPC error if available
          if (subscribeErr.code) {
            console.error('[DriftContext] JSON-RPC Error Code:', subscribeErr.code);
          }
          if (subscribeErr.data) {
            console.error('[DriftContext] JSON-RPC Error Data:', subscribeErr.data);
          }

          // WebSocket subscription failed - this is critical since we require WebSocket
          console.error('[DriftContext] CRITICAL: WebSocket subscription failed. Drift Protocol requires WebSocket for real-time updates.');
          throw new Error('WebSocket subscription failed. Please check your network connection and RPC endpoint.');
        }

        // Step 10: Initialize user account if it doesn't exist
        if (!userAccountExists) {
          console.log('[DriftContext] Initializing user account...');

          const balance = await connection.getBalance(keypair.publicKey);
          const requiredLamports = 42561280; // ~0.0425 SOL (Minimum rent)

          if (balance < requiredLamports) {
            const requiredSol = requiredLamports / 1e9;
            const currentSol = balance / 1e9;
            setSolBalanceInfo({
              required: Math.ceil(requiredSol * 100) / 100,
              current: currentSol,
              address: keypair.publicKey.toBase58(),
            });
            setShowInsufficientSol(true);
            console.warn(`[DriftContext] Insufficient SOL for initialization check. Current: ${currentSol}, Required: >${requiredSol}`);
            // Return early! Client generated but account not initialized.
          } else {
            try {
              const [txSig, newUserAccountPublicKey] = await client.initializeUserAccount(0, "worldstreet-user");
              console.log('[DriftContext] User account initialized successfully');
              console.log('[DriftContext] Init TX:', txSig);
              console.log('[DriftContext] User account public key:', newUserAccountPublicKey.toBase58());

              // Wait for account to be confirmed on-chain
              await connection.confirmTransaction(txSig, 'confirmed');
              console.log('[DriftContext] User account initialization confirmed');

            } catch (initErr: any) {
              console.error('[DriftContext] Failed to initialize user account:', initErr);

              // Check if it's an insufficient SOL error
              const errorMessage = initErr?.message || String(initErr);
              if (
                errorMessage.includes('insufficient lamports') ||
                errorMessage.includes('Transfer: insufficient') ||
                errorMessage.includes('Attempt to debit an account but found no record of a prior credit')
              ) {
                const match = errorMessage.match(/need (\d+)/);
                const actualRequired = match ? parseInt(match[1]) : requiredLamports;
                const requiredSol = actualRequired / 1e9;
                const currentSol = balance / 1e9;

                setSolBalanceInfo({
                  required: Math.ceil(requiredSol * 100) / 100,
                  current: currentSol,
                  address: keypair.publicKey.toBase58(),
                });
                setShowInsufficientSol(true);
                console.warn(`[DriftContext] Insufficient SOL: Need at least ${Math.ceil(requiredSol * 100) / 100} SOL to initialize Drift account. Continuing with uninitialized client.`);
                // Don't throw here! Let the client return uninitialized, so the UI can prompt the user to Initialize.
              } else {
                throw initErr;
              }
            }
          }
        }

        // Step 11: Verify user account is accessible (wrap in catch as it's fine if uninitialized)
        try {
          const user = client.getUser();
          const userAccount = user.getUserAccount();
          console.log('[DriftContext] User account verified:', userAccount.authority.toBase58());
        } catch (err) {
          console.log('[DriftContext] User account not initialized yet. This is expected if they have insufficient funds or are new.');
        }

        // Success!
        driftClientRef.current = client;
        console.log('[DriftContext] Drift client ready!');

        // Build market mappings after client is ready
        const [perpMapping, spotMapping] = await Promise.all([
          buildPerpMarketMapping(client),
          buildSpotMarketMapping(client)
        ]);

        setPerpMarkets(perpMapping);
        setSpotMarkets(spotMapping);

        return client;

      } catch (error: any) {
        console.error(`[DriftContext] Initialization attempt ${attempt + 1} failed:`, error);

        // Log detailed error information
        if (error.code) {
          console.error('[DriftContext] Error code:', error.code);
        }
        if (error.data) {
          console.error('[DriftContext] Error data:', JSON.stringify(error.data, null, 2));
        }

        // If this is the last attempt, throw the error
        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }

        // Exponential backoff before retry
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`[DriftContext] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to initialize Drift client after all retries');
  }, [encryptedPrivateKey]);

  /**
   * Build stable mapping of marketIndex → market info
   * 
   * CRITICAL: This function loads markets directly from the Drift client
   * Only markets that were subscribed to during initialization will be available
   * 
   * This ensures market names remain consistent regardless of:
   * - SDK array order changes
   * - Session restarts
   * - SDK version updates
   * 
   * The marketIndex is the on-chain unique identifier and never changes.
   */
  const buildPerpMarketMapping = useCallback(async (client: any): Promise<Map<number, PerpMarketInfo>> => {
    console.log('[DriftContext] 🔧 Building perp market mapping from on-chain data...');

    try {
      const marketMap = new Map<number, PerpMarketInfo>();

      // CRITICAL: Get markets directly from the Drift client
      // This returns ONLY the markets we subscribed to during initialization
      const perpMarketAccounts = client.getPerpMarketAccounts();

      console.log('[DriftContext] 📊 Raw perp market accounts:', perpMarketAccounts?.length || 0);

      if (!perpMarketAccounts || perpMarketAccounts.length === 0) {
        console.error('[DriftContext] ❌ NO PERP MARKETS FOUND!');
        console.error('[DriftContext] This means the client did not subscribe to any perp markets');
        console.error('[DriftContext] Check perpMarketIndexes in client config');
        return marketMap;
      }

      console.log('[DriftContext] 📋 Processing perp markets:');
      
      // Build mapping using marketIndex as the stable key
      for (const market of perpMarketAccounts) {
        const marketIndex = market.marketIndex;

        // CRITICAL: Extract market symbol ONLY from the on-chain name buffer
        // NEVER use market.symbol or market.baseAssetSymbol - they are unstable SDK metadata
        const nameBytes = market.name;
        let symbol = 'UNKNOWN';

        try {
          if (nameBytes && nameBytes.length > 0) {
            // Convert bytes to string and remove null terminators
            symbol = Buffer.from(nameBytes)
              .toString('utf8')
              .replace(/\0/g, '')
              .trim();
          }
        } catch (err) {
          console.warn(`[DriftContext] Error parsing market name for index ${marketIndex}:`, err);
        }

        // Extract base asset symbol (e.g., "SOL" from "SOL-PERP")
        const baseAssetSymbol = symbol.replace('-PERP', '').replace('-perp', '');

        marketMap.set(marketIndex, {
          marketIndex,
          symbol,
          baseAssetSymbol,
          initialized: true,
        });

        console.log(`[DriftContext]   ✅ Perp Market ${marketIndex}: ${symbol}`);
      }

      console.log(`[DriftContext] 🎉 Built mapping for ${marketMap.size} perp markets`);
      console.log('[DriftContext] 📝 Perp market indices:', Array.from(marketMap.keys()).sort((a, b) => a - b));
      console.log('[DriftContext] 📝 Perp market symbols:', Array.from(marketMap.values()).map(m => m.symbol));

      return marketMap;

    } catch (err) {
      console.error('[DriftContext] ❌ Error building perp market mapping:', err);
      return new Map();
    }
  }, []);

  /**
   * Build stable mapping of spot marketIndex → market info
   */
  const buildSpotMarketMapping = useCallback(async (client: any): Promise<Map<number, SpotMarketInfo>> => {
    console.log('[DriftContext] 🔧 Building spot market mapping...');

    try {
      const marketMap = new Map<number, SpotMarketInfo>();
      
      // CRITICAL: Check if client has the method
      if (typeof client.getSpotMarketAccounts !== 'function') {
        console.error('[DriftContext] ❌ client.getSpotMarketAccounts is not a function!');
        console.error('[DriftContext] Client type:', typeof client);
        console.error('[DriftContext] Client methods:', Object.keys(client).filter(k => typeof client[k] === 'function'));
        return marketMap;
      }
      
      const spotMarketAccounts = client.getSpotMarketAccounts();

      console.log('[DriftContext] 📊 Raw spot market accounts:', spotMarketAccounts?.length || 0);
      console.log('[DriftContext] 📊 Type:', Array.isArray(spotMarketAccounts) ? 'Array' : typeof spotMarketAccounts);

      if (!spotMarketAccounts || spotMarketAccounts.length === 0) {
        console.error('[DriftContext] ❌ NO SPOT MARKETS FOUND - This is the problem!');
        console.error('[DriftContext] Client has no spot market accounts. Check Drift SDK initialization.');
        console.error('[DriftContext] This means orders will fail because we cannot map symbols to market indices.');
        
        // Try to get more diagnostic info
        console.log('[DriftContext] 🔍 Diagnostic: Checking client state...');
        console.log('[DriftContext] client.isSubscribed:', client.isSubscribed);
        console.log('[DriftContext] client.connection:', !!client.connection);
        
        return marketMap;
      }

      console.log('[DriftContext] 📋 Processing spot markets:');
      for (const market of spotMarketAccounts) {
        const marketIndex = market.marketIndex;
        const nameBytes = market.name;
        let symbol = 'UNKNOWN';

        try {
          if (nameBytes && nameBytes.length > 0) {
            symbol = Buffer.from(nameBytes)
              .toString('utf8')
              .replace(/\0/g, '')
              .trim();
          }
        } catch (err) {
          console.warn(`[DriftContext] Error parsing spot market name for index ${marketIndex}:`, err);
        }

        marketMap.set(marketIndex, {
          marketIndex,
          symbol,
          decimals: market.decimals,
          initialized: true,
        });

        console.log(`[DriftContext]   ✅ Spot Market ${marketIndex}: ${symbol} (${market.decimals} decimals)`);
      }

      console.log(`[DriftContext] 🎉 Built mapping for ${marketMap.size} spot markets`);
      console.log('[DriftContext] 📝 Spot market indices:', Array.from(marketMap.keys()).sort((a, b) => a - b));
      console.log('[DriftContext] 📝 Spot market symbols:', Array.from(marketMap.values()).map(m => m.symbol));

      return marketMap;
    } catch (err) {
      console.error('[DriftContext] ❌ Error building spot market mapping:', err);
      return new Map();
    }
  }, []);

  /**
   * Helper function to get market name from marketIndex
   * Falls back to "Market {index}" if not found
   */
  const getMarketName = useCallback((marketIndex: number): string => {
    const marketInfo = perpMarkets.get(marketIndex);
    return marketInfo?.symbol || `Market ${marketIndex}`;
  }, [perpMarkets]);

  /**
   * Helper function to find marketIndex by symbol/id
   * Essential for mapping external API markets to on-chain Drift indices
   * 
   * CRITICAL: This searches the perpMarkets Map which is built from actual on-chain data
   * Only markets that were subscribed to during client initialization will be available
   */
  const getMarketIndexBySymbol = useCallback((symbol: string): number | undefined => {
    if (!symbol) {
      console.warn('[DriftContext] getMarketIndexBySymbol called with empty symbol');
      return undefined;
    }
    
    const cleanSymbol = symbol.toUpperCase().trim();
    const cleanBase = cleanSymbol.split('-')[0];

    console.log(`[DriftContext] 🔍 Searching for perp market: "${cleanSymbol}"`);
    console.log(`[DriftContext] Available perp markets:`, Array.from(perpMarkets.entries()).map(([idx, info]) => `${idx}: ${info.symbol}`));

    // 1. Try exact match in mapping (e.g., "SOL-PERP")
    for (const [index, info] of perpMarkets.entries()) {
      if (info.symbol.toUpperCase() === cleanSymbol) {
        console.log(`[DriftContext] ✅ Found exact match: ${cleanSymbol} → marketIndex ${index}`);
        return index;
      }
    }

    // 2. Try base asset match (e.g., "SOL" matches "SOL-PERP")
    for (const [index, info] of perpMarkets.entries()) {
      if (info.baseAssetSymbol.toUpperCase() === cleanBase) {
        console.log(`[DriftContext] ✅ Found base asset match: ${cleanBase} → ${info.symbol} → marketIndex ${index}`);
        return index;
      }
    }

    // 3. Last resort: partial string match
    for (const [index, info] of perpMarkets.entries()) {
      if (info.symbol.toUpperCase().includes(cleanBase) || cleanSymbol.includes(info.baseAssetSymbol.toUpperCase())) {
        console.log(`[DriftContext] ✅ Found partial match: ${cleanSymbol} → ${info.symbol} → marketIndex ${index}`);
        return index;
      }
    }

    console.error(`[DriftContext] ❌ Market NOT FOUND: ${cleanSymbol}`);
    console.error(`[DriftContext] This market is either not subscribed or doesn't exist on Drift`);
    console.error(`[DriftContext] Available markets:`, Array.from(perpMarkets.values()).map(m => m.symbol).join(', '));
    return undefined;
  }, [perpMarkets]);

  /**
   * Helper function to get spot market name from marketIndex
   */
  const getSpotMarketName = useCallback((marketIndex: number): string => {
    const marketInfo = spotMarkets.get(marketIndex);
    return marketInfo?.symbol || `Spot ${marketIndex}`;
  }, [spotMarkets]);

  /**
   * Helper function to find spot marketIndex by symbol
   * 
   * CRITICAL: This must return SPOT market indices, NOT perp market indices!
   * Spot and perp markets have separate index spaces in Drift Protocol.
   */
  const getSpotMarketIndexBySymbol = useCallback((symbol: string): number | undefined => {
    if (!symbol) {
      console.error('[DriftContext] ❌ getSpotMarketIndexBySymbol called with empty symbol');
      return undefined;
    }
    
    const cleanSymbol = symbol.toUpperCase().trim();

    console.log(`[DriftContext] 🔍 Searching for SPOT market: "${cleanSymbol}"`);
    console.log(`[DriftContext] 📊 spotMarkets.size: ${spotMarkets.size}`);
    
    if (spotMarkets.size === 0) {
      console.error('[DriftContext] ❌ CRITICAL: spotMarkets Map is EMPTY!');
      console.error('[DriftContext] This means buildSpotMarketMapping failed or returned no markets.');
      console.error('[DriftContext] Check if Drift SDK is properly initialized and has spot market data.');
      return undefined;
    }
    
    console.log(`[DriftContext] Available spot markets:`, Array.from(spotMarkets.entries()).map(([idx, info]) => `${idx}: ${info.symbol}`));

    // CRITICAL: spotMarkets is a Map<marketIndex, info>
    // The key IS the actual Drift SPOT market index
    for (const [marketIndex, info] of spotMarkets.entries()) {
      const marketSymbol = info.symbol.toUpperCase();
      
      // Exact match
      if (marketSymbol === cleanSymbol) {
        console.log(`[DriftContext] ✅ Found SPOT market (exact): ${cleanSymbol} → marketIndex ${marketIndex}`);
        return marketIndex;
      }
      
      // Prefix match (e.g., "SOL" matches "SOL")
      if (marketSymbol.startsWith(cleanSymbol)) {
        console.log(`[DriftContext] ✅ Found SPOT market (prefix): ${cleanSymbol} → ${marketSymbol} → marketIndex ${marketIndex}`);
        return marketIndex;
      }
    }

    console.error(`[DriftContext] ❌ SPOT market NOT FOUND: ${cleanSymbol}`);
    console.error(`[DriftContext] Available symbols:`, Array.from(spotMarkets.values()).map(m => m.symbol).join(', '));
    console.error(`[DriftContext] This will cause orders to fail or use wrong market!`);
    return undefined;
  }, [spotMarkets]);
  /**
   * Refresh Drift account data from on-chain state
   * 
   * CRITICAL: This function must be called after every transaction to get latest balances
   * The Drift SDK caches account data and requires explicit fetchAccounts() calls
   * 
   * Handles:
   * - WebSocket disconnection detection
   * - Automatic resubscription
   * - Explicit account data refresh via fetchAccounts()
   */
  const refreshAccounts = useCallback(async () => {
    const client = driftClientRef.current;
    if (!client) {
      console.log('[DriftContext] No client to refresh');
      return;
    }

    try {
      // Check if client is still subscribed
      if (!client.isSubscribed) {
        console.warn('[DriftContext] Client not subscribed, attempting to resubscribe...');

        try {
          await client.subscribe();
          console.log('[DriftContext] Successfully resubscribed');
        } catch (resubErr: any) {
          console.error('[DriftContext] Resubscription failed:', resubErr);

          // Log detailed error
          if (resubErr.code) {
            console.error('[DriftContext] Resubscription error code:', resubErr.code);
          }
          if (resubErr.data) {
            console.error('[DriftContext] Resubscription error data:', resubErr.data);
          }

          // If resubscription fails, we might need to recreate the client
          // For now, just log and continue - the next refresh will try again
          console.warn('[DriftContext] Will retry subscription on next refresh');
        }
      }

      // CRITICAL: Fetch latest account data from on-chain
      // This is required after every transaction to get updated balances
      const driftUser = client.getUser();
      if (driftUser && driftUser.fetchAccounts) {
        console.log('[DriftContext] Fetching latest account data from blockchain...');
        await driftUser.fetchAccounts();
        console.log('[DriftContext] Account data refreshed successfully');
      }

      console.log('[DriftContext] Accounts refreshed successfully');
    } catch (err: any) {
      console.error('[DriftContext] Error refreshing accounts:', err);

      // Log detailed error information
      if (err.code) {
        console.error('[DriftContext] Error code:', err.code);
      }
      if (err.data) {
        console.error('[DriftContext] Error data:', err.data);
      }

      // Don't throw - allow the app to continue functioning
      // The next refresh attempt will try again
    }
  }, []);
  const requestPin = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      // If we already have the PIN in memory, use it
      if (userPin) {
        console.log('[DriftContext] Using cached PIN from memory');
        resolve(userPin);
        return;
      }

      // Temporary persistence from localStorage
      const cachedPin = typeof window !== 'undefined' ? localStorage.getItem('worldstreet_temp_pin') : null;
      if (cachedPin) {
        console.log('[DriftContext] Using temporary PIN from localStorage');
        setUserPin(cachedPin);
        resolve(cachedPin);
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
    if (typeof window !== 'undefined') localStorage.setItem('worldstreet_temp_pin', pin);
    setShowPinUnlock(false);

    if (pinResolveRef.current) {
      pinResolveRef.current(pin);
      pinResolveRef.current = null;
    }
  }, []);

  // Refresh account summary from Drift client (with WebSocket)
  const refreshSummary = useCallback(async () => {
    if (!user?.userId) return;

    // Don't retry if initialization already failed
    if (initializationFailed) {
      console.log('[DriftContext] Initialization previously failed, skipping auto-retry');
      return;
    }

    try {
      // Only show overlay on first load, ONLY on trading pages, and ONLY if never initialized before
      if (isFirstLoad && isTradingPage && !hasInitializedOnce) {
        console.log('[DriftContext] First initialization on trading page, showing overlay');
        setShowInitOverlay(true);
      }
      setInitializationError(null);

      setIsInitializing(true); // Moved UI feedback earlier
      const pin = await requestPin();

      let client = driftClientRef.current;
      let bal = 0;

      if (!client) {
        console.log('[DriftContext] Initializing client for summary...');
        client = await initializeDriftClient(pin);

        if (client.wallet?.publicKey) {
          bal = await client.connection.getBalance(client.wallet.publicKey);
        }
      } else {
        // Parallelize refreshAccounts and getBalance
        const balancePromise = client.wallet?.publicKey
          ? client.connection.getBalance(client.wallet.publicKey)
          : Promise.resolve(0);

        // Refresh accounts via WebSocket
        const [_, fetchedBal] = await Promise.all([
          refreshAccounts(),
          balancePromise
        ]);

        bal = fetchedBal as number;

        // If the user manually triggered initialization via the "Initialize Account" button,
        // and they don't have an account on-chain, attempt to initialize it now.
        let needsInit = false;
        try {
          client.getUser().getUserAccount();
        } catch (e) {
          needsInit = true;
        }

        if (needsInit) {
          const requiredLamports = 42561280; // ~0.0425 SOL (Minimum rent)
          if (bal < requiredLamports) {
            const requiredSol = requiredLamports / 1e9;
            const currentSol = bal / 1e9;
            setSolBalanceInfo({
              required: Math.ceil(requiredSol * 100) / 100,
              current: currentSol,
              address: client.wallet.payer.publicKey.toBase58(),
            });
            setShowInsufficientSol(true);
            console.warn(`[DriftContext] Insufficient SOL for explicit initialization. Current: ${currentSol}, Required: >${requiredSol}`);
          } else {
            console.log('[DriftContext] User account still not initialized, attempting explicit manual initialization...');
            try {
              const [txSig] = await client.initializeUserAccount(0, "worldstreet-user");
              await client.connection.confirmTransaction(txSig, 'confirmed');
              console.log('[DriftContext] Explicit initialization successful');
            } catch (initErr: any) {
              console.error('[DriftContext] Failed to initialize user account during explicit action:', initErr);
              const errorMessage = initErr?.message || String(initErr);
              if (
                errorMessage.includes('insufficient lamports') ||
                errorMessage.includes('Transfer: insufficient') ||
                errorMessage.includes('Attempt to debit an account but found no record of a prior credit')
              ) {
                const match = errorMessage.match(/need (\d+)/);
                const actualRequired = match ? parseInt(match[1]) : requiredLamports;
                const requiredSol = actualRequired / 1e9;
                const currentSol = bal / 1e9;

                setSolBalanceInfo({
                  required: Math.ceil(requiredSol * 100) / 100,
                  current: currentSol,
                  address: client.wallet.payer.publicKey.toBase58(),
                });
                setShowInsufficientSol(true);
                // Don't throw, let it fall through to setting initialized: false
              } else {
                throw initErr;
              }
            }
          }
        }
      }

      // Proceed with setting native SOL balance
      setWalletBalance(bal / 1e9);

      // SAFE: Try to get user account
      let driftUser;
      let userAccount;
      let accountInitialized = false;

      try {
        driftUser = client.getUser();
        userAccount = driftUser.getUserAccount();
        accountInitialized = true;
        console.log('[DriftContext] User account loaded successfully');
      } catch (err) {
        console.log('[DriftContext] User account not initialized yet');
        // Account not initialized yet
        const keypair = client.wallet.payer;
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
        setIsInitializing(false);
        setShowInitOverlay(false); // Hide overlay - account just needs initialization
        setIsFirstLoad(false); // Mark first load as complete
        setHasInitializedOnce(true); // Mark successful initialization (even if account not initialized)
        return;
      }

      // If we got here, account is initialized
      const keypair = client.wallet.payer;

      let spotPosition;
      let perpPositions;
      let totalCollateral = 0;
      let freeCollateral = 0;

      try {
        spotPosition = driftUser.getSpotPosition(0);
        totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
      } catch (err) {
        console.log('[DriftContext] No spot position found');
      }

      try {
        freeCollateral = driftUser.getFreeCollateral ? Number(driftUser.getFreeCollateral()) / 1e6 : 0;
      } catch (err) {
        console.log('[DriftContext] Could not get free collateral');
      }

      let unrealizedPnl = 0;
      let openPositions = 0;

      try {
        perpPositions = driftUser.getActivePerpPositions ? driftUser.getActivePerpPositions() : [];

        if (perpPositions && Array.isArray(perpPositions)) {
          for (const position of perpPositions) {
            if (position.baseAssetAmount && position.baseAssetAmount.toNumber() !== 0) {
              openPositions++;
              unrealizedPnl += Number(position.unrealizedPnl || 0) / 1e6;
            }
          }
        }
      } catch (err) {
        console.log('[DriftContext] No perp positions found');
      }

      const leverage = totalCollateral > 0 ? (totalCollateral - freeCollateral) / totalCollateral : 0;
      const marginRatio = totalCollateral > 0 ? freeCollateral / totalCollateral : 0;

      // Fetch native SOL balance
      try {
        const balance = await client.connection.getBalance(keypair.publicKey);
        setWalletBalance(balance / 1e9);
      } catch (balErr) {
        console.warn('[DriftContext] Failed to fetch native SOL balance:', balErr);
      }

      setSummary({
        subaccountId: 0,
        publicAddress: keypair.publicKey.toBase58(),
        totalCollateral,
        freeCollateral,
        unrealizedPnl,
        leverage,
        marginRatio,
        openPositions,
        openOrders: 0,
        initialized: true,
      });

      setIsClientReady(true);
      setIsInitializing(false);
      setShowInitOverlay(false); // Hide overlay on success
      setIsFirstLoad(false); // Mark first load as complete
      setHasInitializedOnce(true); // Mark that we've successfully initialized at least once
    } catch (err) {
      console.error('[DriftContext] Error refreshing summary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh summary';
      setError(errorMessage);
      setInitializationError(errorMessage);
      setInitializationFailed(true); // Mark as failed on any error
      setIsInitializing(false);
      // Keep overlay visible on error so user can retry
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, initializationFailed, isFirstLoad, isTradingPage, hasInitializedOnce]);

  // Refresh positions from Drift client (with WebSocket)
  const refreshPositions = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        console.log('[DriftContext] Initializing client for positions...');
        client = await initializeDriftClient(pin);
      } else {
        // CRITICAL: Refresh accounts to get latest on-chain data
        console.log('[DriftContext] Refreshing accounts before fetching positions...');
        await refreshAccounts();
      }

      // SAFE: Try to get user account
      let driftUser;
      let userAccount;

      try {
        driftUser = client.getUser();
        userAccount = driftUser.getUserAccount();
      } catch (err) {
        console.log('[DriftContext] User account not initialized, no positions');
        setPositions([]);
        setSpotPositions([]);
        return;
      }

      // Get positions
      const positionsList = [];

      try {
        const perpPositions = driftUser.getActivePerpPositions ? driftUser.getActivePerpPositions() : [];

        if (perpPositions && Array.isArray(perpPositions)) {
          for (const position of perpPositions) {
            const baseAmount = position.baseAssetAmount ? position.baseAssetAmount.toNumber() : 0;
            if (baseAmount === 0) continue;

            const direction: 'long' | 'short' = baseAmount > 0 ? 'long' : 'short';
            const marketIndex = position.marketIndex;

            // CRITICAL: Get market name with proper fallback
            let marketName = getMarketName(marketIndex);
            
            // If we get a generic fallback, try to get the actual name from the market account
            if (marketName.startsWith('Market ')) {
              try {
                const marketAccount = client.getPerpMarketAccount(marketIndex);
                if (marketAccount && marketAccount.name) {
                  const nameBytes = marketAccount.name;
                  const parsedName = Buffer.from(nameBytes)
                    .toString('utf8')
                    .replace(/\0/g, '')
                    .trim();
                  if (parsedName && parsedName !== 'UNKNOWN') {
                    marketName = parsedName;
                  }
                }
              } catch (err) {
                console.warn(`[DriftContext] Could not fetch perp market name for position index ${marketIndex}`);
              }
            }

            let market;
            try {
              market = client.getPerpMarketAccount(marketIndex);
            } catch (err) {
              console.log(`[DriftContext] Could not get market ${marketIndex}`);
            }

            positionsList.push({
              marketIndex,
              marketName, // Stable market symbol with fallback
              direction,
              baseAmount: Math.abs(baseAmount) / 1e9,
              quoteAmount: Math.abs(position.quoteAssetAmount.toNumber()) / 1e6,
              entryPrice: Number(position.quoteEntryAmount) / Math.abs(baseAmount),
              unrealizedPnl: Number(position.unrealizedPnl || 0) / 1e6,
              leverage: market ? Number(market.marginRatioInitial) / 10000 : 1
            });
          }
        }
      } catch (err) {
        console.log('[DriftContext] Error getting perp positions:', err);
      }

      setPositions(positionsList);

      // Get spot positions - INCLUDE ALL MARKETS (even with 0 balance)
      const spotPositionsList = [];
      try {
        const spotMarketAccounts = client.getSpotMarketAccounts();
        
        console.log('[DriftContext] Refreshing spot positions for', spotMarketAccounts.length, 'markets');
        
        for (const marketAccount of spotMarketAccounts) {
          const marketIndex = marketAccount.marketIndex;
          const position = driftUser.getSpotPosition(marketIndex);

          // CRITICAL: Get market name with proper fallback
          let marketName = getSpotMarketName(marketIndex);
          
          // If we get a generic fallback, try to get the actual name from the market account
          if (marketName.startsWith('Spot ')) {
            try {
              const spotMarketAccount = client.getSpotMarketAccount(marketIndex);
              if (spotMarketAccount && spotMarketAccount.name) {
                const nameBytes = spotMarketAccount.name;
                const parsedName = Buffer.from(nameBytes)
                  .toString('utf8')
                  .replace(/\0/g, '')
                  .trim();
                if (parsedName && parsedName !== 'UNKNOWN') {
                  marketName = parsedName;
                }
              }
            } catch (err) {
              console.warn(`[DriftContext] Could not fetch spot market name for position index ${marketIndex}`);
            }
          }
          
          const decimals = marketAccount.decimals;

          // Calculate actual amount based on balance type (deposit or borrow)
          let amount = 0;
          let balanceType: 'deposit' | 'borrow' = 'deposit';

          // Only process if position exists and has non-zero balance
          if (position && position.scaledBalance && !position.scaledBalance.isZero()) {
            balanceType = (position.balanceType.hasOwnProperty('deposit') ? 'deposit' : 'borrow') as 'deposit' | 'borrow';

            // Convert BN to human readable number
            // IMPORTANT: getTokenAmount already returns the amount in human-readable precision
            // Do NOT divide by decimals again!
            const tokenAmount = client.getTokenAmount(
              position.scaledBalance,
              marketAccount,
              position.balanceType
            );

            // getTokenAmount returns a BN in the token's native precision
            // We just need to convert to number
            amount = tokenAmount.toNumber();
            
            console.log(`[DriftContext] Spot position ${marketName}: ${amount} (${balanceType})`);
          }

          // Get token price from oracle
          let price = 0;
          try {
            const oracleData = client.getOracleDataForSpotMarket(marketIndex);
            price = oracleData.price.toNumber() / 1e6;
          } catch (pErr) {
            console.warn(`[DriftContext] Could not get price for spot market ${marketIndex}`);
          }

          // Always push to list (even if amount is 0)
          spotPositionsList.push({
            marketIndex,
            marketName,
            amount,
            balanceType,
            price,
            value: amount * price
          });
        }
        
        console.log('[DriftContext] Total spot positions fetched:', spotPositionsList.length);
        console.log('[DriftContext] Non-zero positions:', spotPositionsList.filter(p => p.amount > 0).length);
      } catch (spotErr) {
        console.warn('[DriftContext] Error getting spot positions:', spotErr);
      }

      setSpotPositions(spotPositionsList);
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh positions');
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, getMarketName, getSpotMarketName]);

  /**
   * Start background transaction monitoring
   * Returns immediately without waiting for confirmation
   * 
   * @param connection - Solana connection with WebSocket support
   * @param signature - Transaction signature to monitor
   * @param onUpdate - Optional callback for status updates
   */
  const startTransactionMonitor = useCallback(async (
    connection: any,
    signature: string,
    onUpdate?: (status: 'pending' | 'confirming' | 'confirmed' | 'failed' | 'timeout') => void
  ): Promise<void> => {
    const { transactionMonitor } = await import('@/services/drift/TransactionMonitor');
    
    transactionMonitor.monitorTransaction(
      connection,
      signature,
      (update) => {
        console.log(`[DriftContext] Transaction ${signature} status:`, update.status);
        if (onUpdate) {
          onUpdate(update.status);
        }
        
        // Refresh data when transaction is confirmed
        if (update.status === 'confirmed') {
          console.log(`[DriftContext] Transaction confirmed, refreshing data...`);
          refreshSummary();
          refreshPositions();
        }
      }
    );
  }, [refreshSummary, refreshPositions]);

  /**
   * Poll transaction status using WebSocket subscription for real-time updates
   * 
   * DEPRECATED: Use startTransactionMonitor for background monitoring
   * This function blocks until confirmation - only use when blocking is required
   * 
   * @param connection - Solana connection with WebSocket support
   * @param signature - Transaction signature to monitor
   * @param maxAttempts - Maximum number of polling attempts (fallback only)
   * @param intervalMs - Polling interval in milliseconds (fallback only)
   * @returns Promise<boolean> - True if transaction confirmed successfully
   */
  const pollTransactionStatus = async (
    connection: any,
    signature: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<boolean> => {
    console.log(`[DriftContext] 🔔 Monitoring transaction via WebSocket: ${signature}`);

    try {
      // Get latest blockhash with finalized commitment for stability
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

      console.log(`[DriftContext] Confirming with blockhash: ${blockhash}, lastValidBlockHeight: ${lastValidBlockHeight}`);

      // CRITICAL: Use WebSocket subscription for real-time confirmation
      // This is significantly faster than polling (typically 400-800ms vs 2-4 seconds)
      const confirmationPromise = new Promise<boolean>((resolve, reject) => {
        let subscriptionId: number | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        // Set timeout for WebSocket subscription (30 seconds)
        timeoutId = setTimeout(() => {
          if (subscriptionId !== null) {
            connection.removeSignatureListener(subscriptionId);
          }
          reject(new Error('WebSocket confirmation timeout'));
        }, 30000);

        // Subscribe to transaction status updates via WebSocket
        subscriptionId = connection.onSignature(
          signature,
          (result: any, context: any) => {
            console.log(`[DriftContext] 🔔 WebSocket update for ${signature}:`, {
              slot: context.slot,
              err: result.err,
            });

            // Clear timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Check if transaction succeeded
            if (result.err) {
              console.error(`[DriftContext] ❌ Transaction failed:`, result.err);
              reject(new Error(`Transaction failed: ${JSON.stringify(result.err)}`));
            } else {
              console.log(`[DriftContext] ✅ Transaction confirmed via WebSocket: ${signature}`);
              resolve(true);
            }
          },
          'confirmed' // Commitment level
        );

        console.log(`[DriftContext] 🔔 WebSocket subscription active (ID: ${subscriptionId})`);
      });

      // Wait for WebSocket confirmation
      const confirmed = await confirmationPromise;
      return confirmed;

    } catch (err: any) {
      console.error(`[DriftContext] ❌ WebSocket confirmation error:`, err);
      
      // FALLBACK: If WebSocket fails, use traditional polling
      console.log(`[DriftContext] 🔄 Falling back to polling confirmation...`);
      
      try {
        // Get latest blockhash again for polling
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        
        // Use confirmTransaction with extended timeout
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );

        if (confirmation.value.err) {
          console.error(`[DriftContext] Transaction failed: ${signature}`, confirmation.value.err);
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`[DriftContext] Transaction confirmed via polling: ${signature}`);
        return true;
        
      } catch (pollErr: any) {
        console.error(`[DriftContext] Polling confirmation error:`, pollErr);
        
        // If blockhash expired, check if transaction actually landed
        if (pollErr.message?.includes('block height exceeded')) {
          console.log(`[DriftContext] Blockhash expired, checking if transaction landed...`);
          
          try {
            // Check transaction status directly
            const status = await connection.getSignatureStatus(signature);
            
            if (status?.value?.confirmationStatus === 'confirmed' || 
                status?.value?.confirmationStatus === 'finalized') {
              console.log(`[DriftContext] Transaction actually confirmed despite blockhash expiry`);
              return true;
            }
            
            console.error(`[DriftContext] Transaction not found or failed`);
          } catch (statusErr) {
            console.error(`[DriftContext] Error checking transaction status:`, statusErr);
          }
        }
        
        throw pollErr;
      }
    }
  };

  const depositCollateral = useCallback(
    async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
      if (!user?.userId) {
        return { success: false, error: 'User not authenticated' };
      }

      try {
        setIsLoading(true);

        console.log('=== DRIFT DEPOSIT DEBUG ===');
        console.log('[DriftContext] Deposit amount requested:', amount);

        // Ensure wallet is unlocked / PIN provided
        const pin = await requestPin();

        // Initialize or get existing Drift client
        let client = driftClientRef.current;
        if (!client) {
          client = await initializeDriftClient(pin);
        }

        // Make sure client is subscribed (polling or websocket)
        if (!client.isSubscribed) {
          console.log('[DriftContext] Client not subscribed, subscribing now...');
          await client.subscribe();
          
          // Give the subscription a moment to populate market data
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('[DriftContext] Client subscribed, checking market data availability...');
        
        // Verify the client has spot market data loaded
        try {
          const spotMarkets = client.getSpotMarketAccounts();
          console.log('[DriftContext] Spot markets available:', spotMarkets?.length || 0);
          
          if (!spotMarkets || spotMarkets.length === 0) {
            throw new Error('No spot markets loaded in client');
          }
        } catch (checkErr) {
          console.error('[DriftContext] Spot market check failed:', checkErr);
          throw new Error('Market data not available. Please refresh the page and try again.');
        }

        // Get pre-deposit balance for verification
        const driftUser = client.getUser();
        const preDepositPosition = driftUser.getSpotPosition(0);
        const usdcMarket = client.getSpotMarketAccount(0);
        
        let preDepositBalance = 0;
        if (preDepositPosition && preDepositPosition.scaledBalance && !preDepositPosition.scaledBalance.isZero()) {
          const tokenAmount = client.getTokenAmount(
            preDepositPosition.scaledBalance,
            usdcMarket,
            preDepositPosition.balanceType
          );
          preDepositBalance = tokenAmount.toNumber();
        }
        console.log('[DriftContext] Pre-deposit Drift balance:', preDepositBalance);

        // Calculate fee (5%) and net amount
        const { calculateFee } = await import('@/config/drift');
        const { fee, netAmount } = calculateFee(amount);

        console.log(`[DriftContext] Depositing ${amount} USDC: ${fee} USDC fee + ${netAmount} USDC net`);

        // Send fee to master wallet if configured
        const { DRIFT_CONFIG } = await import('@/config/drift');
        if (DRIFT_CONFIG.MASTER_WALLET_ADDRESS && fee > 0) {
          const { PublicKey, Transaction } = await import('@solana/web3.js');
          const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = await import('@solana/spl-token');

          const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

          // Get token accounts
          const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, client.wallet.publicKey);
          const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(DRIFT_CONFIG.MASTER_WALLET_ADDRESS));

          // Create fee transfer transaction
          const feeTx = new Transaction().add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              client.wallet.publicKey,
              Math.floor(fee * 1e6), // Convert to USDC base units
              [],
              TOKEN_PROGRAM_ID
            )
          );

          const { blockhash } = await client.connection.getLatestBlockhash('finalized');
          feeTx.recentBlockhash = blockhash;
          feeTx.feePayer = client.wallet.publicKey;

          feeTx.sign(client.wallet.payer);
          const feeTxSig = await client.connection.sendRawTransaction(feeTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          console.log('[DriftContext] Fee transaction sent:', feeTxSig);

          // Start background monitoring for fee transaction (non-blocking)
          startTransactionMonitor(client.connection, feeTxSig);
          console.log('[DriftContext] Background monitoring started for fee:', feeTxSig);
        }

        // Now deposit net amount to Drift
        console.log(`[DriftContext] Depositing ${netAmount} USDC to Drift (after ${fee} USDC fee)`);

        // Spot market index for USDC
        const marketIndex = 0;

        // Get user's associated token account for USDC
        const userTokenAccount = await client.getAssociatedTokenAccount(marketIndex);

        console.log('[DriftContext] User USDC token account:', userTokenAccount.toBase58());

        // Convert net amount to on‑chain BN using client method
        const depositAmountBN = client.convertToSpotPrecision(marketIndex, netAmount);

        console.log('[DriftContext] Deposit amount (BN):', depositAmountBN.toString());
        console.log('[DriftContext] Deposit amount (human):', netAmount);

        // Perform the deposit
        const txSignature = await client.deposit(
          depositAmountBN,
          marketIndex,
          userTokenAccount,
          0 // default subAccountId
        );

        console.log('[DriftContext] Deposit transaction sent:', txSignature);

        // Start background monitoring (non-blocking)
        startTransactionMonitor(client.connection, txSignature);
        console.log('[DriftContext] Background monitoring started for deposit:', txSignature);

        // Refresh accounts after deposit
        await refreshAccounts();

        // Verify deposit was successful by checking balance
        const postDepositUser = client.getUser();
        const postDepositPosition = postDepositUser.getSpotPosition(0);
        
        let postDepositBalance = 0;
        if (postDepositPosition && postDepositPosition.scaledBalance && !postDepositPosition.scaledBalance.isZero()) {
          const tokenAmount = client.getTokenAmount(
            postDepositPosition.scaledBalance,
            usdcMarket,
            postDepositPosition.balanceType
          );
          postDepositBalance = tokenAmount.toNumber();
        }

        console.log('[DriftContext] Post-deposit Drift balance:', postDepositBalance);
        console.log('[DriftContext] Balance increase:', postDepositBalance - preDepositBalance);
        console.log('=== END DEPOSIT DEBUG ===');

        // Verify the deposit actually increased the balance
        if (postDepositBalance <= preDepositBalance) {
          console.warn('[DriftContext] WARNING: Deposit did not increase balance as expected!');
          console.warn('[DriftContext] Expected increase:', netAmount);
          console.warn('[DriftContext] Actual increase:', postDepositBalance - preDepositBalance);
        }

        // Refresh summary after success
        await refreshSummary();

        return { success: true, txSignature };
      } catch (err) {
        console.log('=== DEPOSIT ERROR ===');
        const errorMessage = err instanceof Error ? err.message : 'Failed to deposit collateral';
        console.error('[DriftContext] Deposit error:', err);

        let friendly = errorMessage;
        if (errorMessage.toLowerCase().includes('insufficient')) {
          friendly = 'Insufficient USDC balance in wallet';
        }
        if (errorMessage.toLowerCase().includes('not initialized')) {
          friendly = 'Drift account not initialized. Please initialize first.';
        }
        if (errorMessage.toLowerCase().includes('not connected')) {
          friendly = 'Wallet not connected. Please unlock your wallet.';
        }

        return { success: false, error: friendly };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.userId, requestPin, initializeDriftClient, refreshAccounts, refreshSummary]
  );
  // Withdraw collateral
  const withdrawCollateral = useCallback(
    async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
      if (!user?.userId) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        setIsLoading(true);

        // 1. Ensure wallet is unlocked / PIN provided
        const pin = await requestPin();

        // 2. Initialize or get existing Drift client
        let client = driftClientRef.current;
        if (!client) {
          client = await initializeDriftClient(pin);
        }

        // Subscribe client if not already
        if (!client.isSubscribed) {
          console.log('[DriftContext] Client not subscribed, subscribing now...');
          await client.subscribe();
          
          // Give the subscription a moment to populate market data
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('[DriftContext] Client subscribed, checking market data for withdrawal...');
        
        // Verify the client has spot market data loaded
        try {
          const spotMarkets = client.getSpotMarketAccounts();
          console.log('[DriftContext] Spot markets available:', spotMarkets?.length || 0);
          
          if (!spotMarkets || spotMarkets.length === 0) {
            throw new Error('No spot markets loaded in client');
          }
        } catch (checkErr) {
          console.error('[DriftContext] Spot market check failed:', checkErr);
          throw new Error('Market data not available. Please refresh the page and try again.');
        }

        console.log(`[DriftContext] Withdrawing ${amount} USDC from Drift`);

        // 3. Convert amount to on-chain BN precision using Drift SDK
        const { BN } = await import('@drift-labs/sdk');
        const withdrawAmountBN = new BN(Math.floor(amount * 1e6)); // USDC has 6 decimals

        // 4. Get the user's USDC associated token account (ATA) via the SDK
        const marketIndex = 0; // USDC spot collateral market index
        const userTokenAccount = await client.getAssociatedTokenAccount(marketIndex);

        console.log(
          "[DriftContext] User USDC token account for withdrawal:",
          userTokenAccount.toBase58()
        );

        // 5. Call driftClient.withdraw with correct args:
        //   withdraw(amountBN, marketIndex, associatedTokenAccount)
        const txSignature = await client.withdraw(
          withdrawAmountBN,
          marketIndex,
          userTokenAccount
        );

        console.log("[DriftContext] Withdrawal transaction sent:", txSignature);

        // Start background monitoring (non-blocking)
        startTransactionMonitor(client.connection, txSignature);
        console.log('[DriftContext] Background monitoring started for withdrawal:', txSignature);

        // 7. Refresh summary after success
        await refreshSummary();

        return { success: true, txSignature };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to withdraw collateral";
        console.error("[DriftContext] Withdraw error:", err);

        let friendlyError = errorMessage;
        if (errorMessage.toLowerCase().includes("insufficient")) {
          friendlyError = "Insufficient free collateral to withdraw that amount";
        }
        if (errorMessage.toLowerCase().includes("not initialized")) {
          friendlyError = "Drift account not initialized — please initialize first.";
        }
        return { success: false, error: friendlyError };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.userId, requestPin, initializeDriftClient, refreshSummary]
  );
  // Open position
  const openPosition = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    size: number,
    leverage: number,
    orderType: 'market' | 'limit' | 'stop-limit' = 'market',
    price?: number,
    triggerPrice?: number
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }

      // Import Drift SDK enums and types
      const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

      // Convert direction string to SDK enum
      const positionDirection = direction === 'long'
        ? PositionDirection.LONG
        : PositionDirection.SHORT;

      // Convert size to proper precision using SDK method
      const baseAssetAmount = client.convertToPerpPrecision(size);

      // Get current market price for validation
      const oracleData = client.getOracleDataForPerpMarket(marketIndex);
      const marketPrice = oracleData.price.toNumber() / 1e6;

      console.log('[DriftContext] Opening position:', {
        marketIndex,
        direction,
        size,
        leverage,
        orderType,
        marketPrice,
        price,
        triggerPrice,
      });

      // Determine order type and validate prices
      let orderTypeEnum: any;
      let orderPrice: any = new BN(0);
      let triggerPriceBN: any = undefined;

      if (orderType === 'market') {
        orderTypeEnum = OrderType.MARKET;
      } else if (orderType === 'limit') {
        if (!price || price <= 0) {
          return { success: false, error: 'Limit price is required for limit orders' };
        }
        orderTypeEnum = OrderType.LIMIT;
        orderPrice = new BN(Math.floor(price * 1e6));
      } else if (orderType === 'stop-limit') {
        if (!triggerPrice || triggerPrice <= 0) {
          return { success: false, error: 'Trigger price is required for stop-limit orders' };
        }
        if (!price || price <= 0) {
          return { success: false, error: 'Limit price is required for stop-limit orders' };
        }

        // Validate trigger price vs limit price
        if (direction === 'long') {
          // For long stop-limit: trigger >= current market, limit >= trigger
          if (triggerPrice < marketPrice) {
            return { success: false, error: 'Long stop-limit trigger price must be above current market price' };
          }
          if (price < triggerPrice) {
            return { success: false, error: 'Long stop-limit limit price must be at or above trigger price' };
          }
        } else {
          // For short stop-limit: trigger <= current market, limit <= trigger
          if (triggerPrice > marketPrice) {
            return { success: false, error: 'Short stop-limit trigger price must be below current market price' };
          }
          if (price > triggerPrice) {
            return { success: false, error: 'Short stop-limit limit price must be at or below trigger price' };
          }
        }

        orderTypeEnum = OrderType.TRIGGER_LIMIT;
        orderPrice = new BN(Math.floor(price * 1e6));
        triggerPriceBN = new BN(Math.floor(triggerPrice * 1e6));
      }

      // Construct order parameters with correct SDK enums and compute unit optimization
      const orderParams: any = {
        orderType: orderTypeEnum,
        marketType: MarketType.PERP,
        marketIndex,
        direction: positionDirection,
        baseAssetAmount,
        price: orderPrice,
      };

      // Add trigger price for stop-limit orders
      if (orderType === 'stop-limit' && triggerPriceBN) {
        orderParams.triggerPrice = triggerPriceBN;
        orderParams.triggerCondition = direction === 'long'
          ? 'above' // Trigger when price goes above trigger
          : 'below'; // Trigger when price goes below trigger
      }

      // Add transaction options for faster confirmation
      const txOptions = {
        computeUnits: 300_000, // Sufficient compute units
        computeUnitsPrice: 50_000, // Priority fee in micro-lamports (0.00005 SOL per CU)
      };

      const txSignature = await client.placePerpOrder(orderParams, txOptions);

      console.log('[DriftContext] Order transaction sent:', txSignature);

      // Start background monitoring (non-blocking)
      startTransactionMonitor(client.connection, txSignature);
      console.log('[DriftContext] Background monitoring started for position:', txSignature);

      await refreshSummary();
      await refreshPositions();
      return { success: true, txSignature };
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[DriftContext] Open position error:', err);

      // Extract logs if available (for SendTransactionError)
      if (err.logs) {
        console.log('[DriftContext] Transaction Logs:', err.logs);
      } else if (typeof err.getLogs === 'function') {
        try {
          console.log('[DriftContext] Transaction Logs:', err.getLogs());
        } catch (logErr) {
          console.warn('[DriftContext] Could not fetch logs:', logErr);
        }
      }

      // Sanitize error messages for user-friendly display
      let friendlyError = 'Failed to open position';

      // Check for specific error patterns
      if (errorMessage.includes('MarketPlaceOrderPaused') || errorMessage.includes('Market is in settlement mode')) {
        friendlyError = 'Market is currently in settlement mode. Please try again in a few moments.';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('Insufficient')) {
        friendlyError = 'Insufficient collateral to open this position';
      } else if (errorMessage.includes('InvalidOracle') || errorMessage.includes('oracle')) {
        friendlyError = 'Market oracle is temporarily unavailable. Please try again.';
      } else if (errorMessage.includes('UserHasNoPositionInMarket')) {
        friendlyError = 'Unable to modify position. Please try again.';
      } else if (errorMessage.includes('MarketIndexNotInitialized')) {
        friendlyError = 'This market is not available for trading';
      } else if (errorMessage.includes('UserMaxDeposit')) {
        friendlyError = 'Maximum deposit limit reached';
      } else if (errorMessage.includes('CantDeleteUserWithCollateral')) {
        friendlyError = 'Cannot close position with active collateral';
      } else if (errorMessage.includes('slippage')) {
        friendlyError = 'Price moved too much. Please adjust your order and try again.';
      } else if (errorMessage.includes('0x17a8') || errorMessage.includes('InvalidOrderMinOrderSize')) {
        friendlyError = 'Order size is too small for this market. Please increase your position size.';
      } else if (errorMessage.includes('Transaction simulation failed')) {
        // Extract the actual error from simulation logs if possible
        const logs = err.logs || (typeof err.getLogs === 'function' ? err.getLogs() : []);
        const minOrderSizeLog = logs.find((l: string) => l.includes('InvalidOrderMinOrderSize'));

        if (minOrderSizeLog || errorMessage.includes('0x17a8')) {
          friendlyError = 'Order size is below the minimum required for this market.';

          // Try to extract exact min size from logs if present
          const sizeMatch = logs.join('\n').match(/min_order_size \((\d+)\)/);
          if (sizeMatch) {
            const minSize = parseInt(sizeMatch[1]) / 1e9;
            friendlyError = `Order size is too small. Minimum required is ${minSize} units.`;
          }
        } else if (errorMessage.includes('custom program error')) {
          const errorCodeMatch = errorMessage.match(/0x([0-9a-fA-F]+)/);
          if (errorCodeMatch) {
            friendlyError = `Transaction failed (Error: ${errorCodeMatch[0]}). Please check your balance and try again.`;
          }
        } else {
          friendlyError = 'Transaction simulation failed. Please try again.';
        }
      } else if (errorMessage.includes('blockhash not found')) {
        friendlyError = 'Network congestion. Please try again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        friendlyError = 'Transaction timed out. Please check your position and try again if needed.';
      } else if (errorMessage.includes('User rejected')) {
        friendlyError = 'Transaction was cancelled';
      }

      return { success: false, error: friendlyError };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions, startTransactionMonitor]);

  // Close position
  const closePosition = useCallback(async (marketIndex: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }

      // Get position to verify it exists
      const driftUser = client.getUser();
      const position = driftUser.getPerpPosition(marketIndex);

      if (!position || position.baseAssetAmount.toNumber() === 0) {
        return { success: false, error: 'No position found' };
      }

      // Use Drift SDK native closePosition method
      const txSignature = await client.closePosition(marketIndex);

      console.log('[DriftContext] Close position transaction sent:', txSignature);

      // Start background monitoring (non-blocking)
      startTransactionMonitor(client.connection, txSignature);
      console.log('[DriftContext] Background monitoring started for close position:', txSignature);

      await refreshSummary();
      await refreshPositions();
      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[DriftContext] Close position error:', err);

      // Sanitize error messages for user-friendly display
      let friendlyError = 'Failed to close position';

      // Check for specific error patterns
      if (errorMessage.includes('MarketPlaceOrderPaused') || errorMessage.includes('Market is in settlement mode')) {
        friendlyError = 'Market is currently in settlement mode. Please try again in a few moments.';
      } else if (errorMessage.includes('No position found') || errorMessage.includes('UserHasNoPositionInMarket')) {
        friendlyError = 'No open position found for this market';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('Insufficient')) {
        friendlyError = 'Insufficient balance to close position';
      } else if (errorMessage.includes('InvalidOracle') || errorMessage.includes('oracle')) {
        friendlyError = 'Market oracle is temporarily unavailable. Please try again.';
      } else if (errorMessage.includes('slippage')) {
        friendlyError = 'Price moved too much. Please try again.';
      } else if (errorMessage.includes('Transaction simulation failed')) {
        friendlyError = 'Transaction simulation failed. Please try again.';
      } else if (errorMessage.includes('blockhash not found')) {
        friendlyError = 'Network congestion. Please try again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        friendlyError = 'Transaction timed out. Please check your position and try again if needed.';
      } else if (errorMessage.includes('User rejected')) {
        friendlyError = 'Transaction was cancelled';
      }

      return { success: false, error: friendlyError };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

  /**
   * Place a spot market, limit, or stop-limit order
   * 
   * CRITICAL: This function must use proper Drift precision and verify collateral
   * before placing orders to avoid InsufficientCollateral errors.
   * 
   * @param marketIndex - Drift spot market index
   * @param direction - 'buy' or 'sell'
   * @param amount - Amount in USDC (quote currency)
   * @param orderType - 'market', 'limit', or 'stop-limit'
   * @param price - Limit price (required for limit and stop-limit orders)
   * @param triggerPrice - Trigger price (required for stop-limit orders)
   */
  const placeSpotOrder = useCallback(async (
    marketIndex: number,
    direction: 'buy' | 'sell',
    amount: number,
    orderType: 'market' | 'limit' | 'stop-limit' = 'market',
    price?: number,
    triggerPrice?: number
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }

      // Ensure client is subscribed to get latest account data
      if (!client.isSubscribed) {
        await client.subscribe();
      }

      // Refresh accounts to get latest balances
      await refreshAccounts();

      const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

      // Get user account for margin checks
      const driftUser = client.getUser();
      const userAccount = driftUser.getUserAccount();

      // === DIAGNOSTIC LOGGING: Pre-Order State ===
      console.log('=== DRIFT SPOT ORDER DEBUG ===');
      console.log('[DriftContext] Market Index:', marketIndex);
      console.log('[DriftContext] Direction:', direction);
      console.log('[DriftContext] Amount (input - USDC value):', amount);
      console.log('[DriftContext] Order Type:', orderType);

      // Get USDC collateral (market index 0)
      const usdcPosition = driftUser.getSpotPosition(0);
      const usdcMarket = client.getSpotMarketAccount(0);
      
      let usdcBalance = 0;
      if (usdcPosition && usdcPosition.scaledBalance && !usdcPosition.scaledBalance.isZero()) {
        const tokenAmount = client.getTokenAmount(
          usdcPosition.scaledBalance,
          usdcMarket,
          usdcPosition.balanceType
        );
        usdcBalance = tokenAmount.toNumber();
      }

      console.log('[DriftContext] USDC Balance (from Drift):', usdcBalance);

      // Get margin info
      const totalCollateral = driftUser.getTotalCollateral ? driftUser.getTotalCollateral().toNumber() / 1e6 : 0;
      const freeCollateral = driftUser.getFreeCollateral ? driftUser.getFreeCollateral().toNumber() / 1e6 : 0;
      const initialMarginReq = driftUser.getInitialMarginRequirement ? driftUser.getInitialMarginRequirement().toNumber() / 1e6 : 0;

      console.log('[DriftContext] Total Collateral:', totalCollateral);
      console.log('[DriftContext] Free Collateral:', freeCollateral);
      console.log('[DriftContext] Initial Margin Requirement:', initialMarginReq);

      // === SAFETY CHECK: Verify sufficient collateral ===
      if (freeCollateral <= 0) {
        console.error('[DriftContext] INSUFFICIENT COLLATERAL: Free collateral is', freeCollateral);
        return { 
          success: false, 
          error: `Insufficient collateral. You have ${freeCollateral.toFixed(2)} USDC free collateral. Please deposit USDC first.` 
        };
      }

      // === CRITICAL FIX: Interpret amount as USDC (quote currency) ===
      // The 'amount' parameter represents the USDC value the user wants to trade
      const quoteAmount = amount; // USDC value user wants to trade
      console.log('[DriftContext] Quote Amount (USDC):', quoteAmount);

      // Minimum order value check (prevent dust orders)
      if (quoteAmount < 1) {
        console.error('[DriftContext] ORDER TOO SMALL: Minimum order value is $1');
        
        setErrorModalData({
          title: 'Order Too Small',
          message: 'The minimum order value for spot trading is $1 USDC.',
          details: {
            orderSize: `$${quoteAmount.toFixed(2)} USDC`,
            minRequired: '$1.00 USDC',
          }
        });
        setShowErrorModal(true);
        
        return {
          success: false,
          error: 'Minimum order value is $1 USDC'
        };
      }

      // Get target market account for decimals and min order size
      const targetMarket = client.getSpotMarketAccount(marketIndex);
      console.log('[DriftContext] Target Market:', {
        index: marketIndex,
        decimals: targetMarket.decimals,
        minOrderSize: targetMarket.minOrderSize?.toString()
      });

      // Get current market price from oracle
      const oracleData = client.getOracleDataForSpotMarket(marketIndex);
      const marketPrice = oracleData.price.toNumber() / 1e6; // Convert from 6 decimals
      console.log('[DriftContext] Market Price (USDC per token):', marketPrice);

      if (marketPrice <= 0) {
        console.error('[DriftContext] INVALID MARKET PRICE:', marketPrice);
        return {
          success: false,
          error: 'Unable to get market price. Please try again.'
        };
      }

      // === CONVERT USDC TO BASE ASSET AMOUNT ===
      // Example: If SOL = $81 and user wants to buy $1 worth:
      // baseAmount = 1 / 81 = 0.0123 SOL
      const baseAmount = quoteAmount / marketPrice;
      console.log('[DriftContext] Base Amount (tokens):', baseAmount);

      // Convert to Drift precision (BN with proper decimals)
      // This scales the amount to the token's native precision
      const baseAssetAmount = client.convertToSpotPrecision(marketIndex, baseAmount);
      console.log('[DriftContext] Base Asset Amount (BN):', baseAssetAmount.toString());

      // Verify precision conversion (sanity check)
      const humanReadableAmount = baseAssetAmount.toNumber() / Math.pow(10, targetMarket.decimals);
      console.log('[DriftContext] Human Readable Amount (verification):', humanReadableAmount);

      // Check precision conversion accuracy (allow 1% tolerance for rounding)
      if (Math.abs(humanReadableAmount - baseAmount) > baseAmount * 0.01) {
        console.error('[DriftContext] PRECISION MISMATCH DETECTED');
        console.error('[DriftContext] Expected:', baseAmount, 'Got:', humanReadableAmount);
        return {
          success: false,
          error: 'Order size precision error. Please try again.'
        };
      }

      // === MINIMUM ORDER SIZE VALIDATION ===
      // Drift enforces minimum order sizes at the protocol level
      // This prevents spam and ensures orders are economically viable
      if (targetMarket.minOrderSize) {
        const minOrderSizeBN = targetMarket.minOrderSize;
        console.log('[DriftContext] Min Order Size (BN):', minOrderSizeBN.toString());
        
        const minOrderSizeHuman = minOrderSizeBN.toNumber() / Math.pow(10, targetMarket.decimals);
        console.log('[DriftContext] Min Order Size (human):', minOrderSizeHuman);

        // Check if order meets minimum size requirement
        if (baseAssetAmount.lt(minOrderSizeBN)) {
          const minOrderValueUSDC = minOrderSizeHuman * marketPrice;
          const marketName = getSpotMarketName(marketIndex);
          
          console.error('[DriftContext] ORDER BELOW MINIMUM SIZE');
          console.error('[DriftContext] Order size:', humanReadableAmount, 'tokens');
          console.error('[DriftContext] Min required:', minOrderSizeHuman, 'tokens');
          console.error('[DriftContext] Min value:', minOrderValueUSDC, 'USDC');
          
          setErrorModalData({
            title: 'Order Below Minimum Size',
            message: `Your order is below the minimum size required for ${marketName}. Please increase your order amount.`,
            details: {
              orderSize: `${humanReadableAmount.toFixed(6)} ${marketName}`,
              minRequired: `${minOrderSizeHuman.toFixed(6)} ${marketName}`,
              minValue: `~$${minOrderValueUSDC.toFixed(2)} USDC`,
            }
          });
          setShowErrorModal(true);
          
          return {
            success: false,
            error: `Order size too small. Minimum order size is ${minOrderSizeHuman.toFixed(6)} tokens (~$${minOrderValueUSDC.toFixed(2)} USDC)`
          };
        }
      }

      // Calculate notional value for collateral check
      const notionalValue = quoteAmount;
      console.log('[DriftContext] Notional Value (USDC):', notionalValue);

      // Estimate required margin (spot orders typically need ~100% margin for buys)
      const estimatedMarginRequired = direction === 'buy' ? notionalValue : 0;
      console.log('[DriftContext] Estimated Margin Required:', estimatedMarginRequired);

      // Check if user has enough free collateral
      if (direction === 'buy' && estimatedMarginRequired > freeCollateral) {
        console.error('[DriftContext] INSUFFICIENT COLLATERAL FOR ORDER');
        console.error('[DriftContext] Required:', estimatedMarginRequired, 'Available:', freeCollateral);
        
        setErrorModalData({
          title: 'Insufficient Collateral',
          message: 'You don\'t have enough free collateral to place this order. Please deposit more USDC or reduce your order size.',
          details: {
            required: `${estimatedMarginRequired.toFixed(2)} USDC`,
            available: `${freeCollateral.toFixed(2)} USDC`,
          }
        });
        setShowErrorModal(true);
        
        return {
          success: false,
          error: `Insufficient collateral. Order requires ${estimatedMarginRequired.toFixed(2)} USDC but you only have ${freeCollateral.toFixed(2)} USDC available.`
        };
      }

      const positionDirection = direction === 'buy'
        ? PositionDirection.LONG
        : PositionDirection.SHORT;

      // === ORDER TYPE HANDLING ===
      let orderTypeEnum: any;
      let orderPrice: any;
      let triggerPriceBN: any = undefined;

      if (orderType === 'market') {
        // === MARKET ORDERS: Use limit orders at oracle price to prevent revertFill ===
        // Market orders are susceptible to keeper timing issues where the filler's
        // last_active_slot doesn't match the current slot, causing revertFill.
        // Solution: Use limit orders at current oracle price with buffer for reliable execution.
        
        orderTypeEnum = OrderType.LIMIT;
        
        // Add 0.5% buffer for buys (higher price) and sells (lower price) to ensure fill
        const priceBuffer = direction === 'buy' ? 1.005 : 0.995;
        const limitPrice = marketPrice * priceBuffer;
        
        // Convert price to Drift precision (6 decimals for USDC-quoted markets)
        orderPrice = new BN(Math.floor(limitPrice * 1e6));
        
        console.log('[DriftContext] Market order → Using LIMIT at oracle price');
        console.log('[DriftContext] Oracle Price:', marketPrice);
        console.log('[DriftContext] Limit Price (with buffer):', limitPrice);
        
      } else if (orderType === 'limit') {
        // === LIMIT ORDERS: User-specified price ===
        if (!price || price <= 0) {
          return {
            success: false,
            error: 'Limit price is required for limit orders'
          };
        }
        
        orderTypeEnum = OrderType.LIMIT;
        
        // Convert user price to Drift precision
        orderPrice = new BN(Math.floor(price * 1e6));
        
        console.log('[DriftContext] Limit order at user price:', price);
        
      } else if (orderType === 'stop-limit') {
        // === STOP-LIMIT ORDERS: Trigger price + limit price ===
        if (!triggerPrice || triggerPrice <= 0) {
          return {
            success: false,
            error: 'Trigger price is required for stop-limit orders'
          };
        }
        
        if (!price || price <= 0) {
          return {
            success: false,
            error: 'Limit price is required for stop-limit orders'
          };
        }
        
        // Validate trigger price vs limit price
        if (direction === 'buy') {
          // For buy stop-limit: trigger >= current market, limit >= trigger
          if (triggerPrice < marketPrice) {
            return {
              success: false,
              error: 'Buy stop-limit trigger price must be above current market price'
            };
          }
          if (price < triggerPrice) {
            return {
              success: false,
              error: 'Buy stop-limit price must be at or above trigger price'
            };
          }
        } else {
          // For sell stop-limit: trigger <= current market, limit <= trigger
          if (triggerPrice > marketPrice) {
            return {
              success: false,
              error: 'Sell stop-limit trigger price must be below current market price'
            };
          }
          if (price > triggerPrice) {
            return {
              success: false,
              error: 'Sell stop-limit price must be at or below trigger price'
            };
          }
        }
        
        orderTypeEnum = OrderType.TRIGGER_LIMIT;
        
        // Convert prices to Drift precision
        orderPrice = new BN(Math.floor(price * 1e6));
        triggerPriceBN = new BN(Math.floor(triggerPrice * 1e6));
        
        console.log('[DriftContext] Stop-limit order');
        console.log('[DriftContext] Trigger Price:', triggerPrice);
        console.log('[DriftContext] Limit Price:', price);
        
      } else {
        return {
          success: false,
          error: `Unsupported order type: ${orderType}`
        };
      }

      const orderParams: any = {
        orderType: orderTypeEnum,
        marketType: MarketType.SPOT,
        marketIndex,
        direction: positionDirection,
        baseAssetAmount,
        price: orderPrice,
      };

      // Add trigger price for stop-limit orders
      if (orderType === 'stop-limit' && triggerPriceBN) {
        orderParams.triggerPrice = triggerPriceBN;
        orderParams.triggerCondition = direction === 'buy' 
          ? 'above' // Trigger when price goes above trigger
          : 'below'; // Trigger when price goes below trigger
      }

      // Verify we're using a SPOT market
      const targetMarketName = getSpotMarketName(marketIndex);
      console.log('[DriftContext] 🚨 FINAL ORDER VERIFICATION:', {
        orderType: orderType,
        marketIndex,
        marketName: targetMarketName,
        marketType: orderParams.marketType === MarketType.SPOT ? 'SPOT ✅' : 'PERP ❌',
        direction,
        baseAssetAmount: orderParams.baseAssetAmount.toString(),
        price: orderParams.price.toString(),
        triggerPrice: triggerPriceBN?.toString(),
        humanReadablePrice: orderType === 'market' ? marketPrice * (direction === 'buy' ? 1.005 : 0.995) : price,
        humanReadableTrigger: triggerPrice,
      });
      
      // CRITICAL: Verify this is actually a spot market
      if (orderParams.marketType !== MarketType.SPOT) {
        console.error('[DriftContext] ❌ CRITICAL ERROR: marketType is NOT SPOT!');
        return {
          success: false,
          error: 'Internal error: Order params have wrong market type'
        };
      }
      
      console.log('=== END DEBUG ===');

      // Add transaction options for faster confirmation with increased priority
      const txOptions = {
        computeUnits: 500_000, // Sufficient compute units
        computeUnitsPrice: 200_000, // Doubled priority fee to reduce slot-spanning (0.0002 SOL per CU)
      };

      const txSignature = await client.placeSpotOrder(orderParams, txOptions);
      console.log('[DriftContext] Spot order sent:', txSignature);

      // Start background monitoring (non-blocking)
      startTransactionMonitor(client.connection, txSignature);
      console.log('[DriftContext] Background monitoring started for spot order:', txSignature);
      
      // CRITICAL: Slot buffer delay to prevent revertFill timing issues
      // This ensures the keeper's last_active_slot matches the validation slot
      // Increased from 1500ms to 2500ms for better slot synchronization
      console.log('[DriftContext] Waiting for slot synchronization...');
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // CRITICAL: Force refresh account data from blockchain
      // This fetches the latest balances after the transaction
      console.log('[DriftContext] Refreshing account data after transaction...');
      await refreshAccounts();
      
      // Refresh summary and positions to update UI
      console.log('[DriftContext] Refreshing positions and summary...');
      await Promise.all([
        refreshSummary(),
        refreshPositions()
      ]);
      
      console.log('[DriftContext] All data refreshed successfully');

      return { success: true, txSignature };
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[DriftContext] ❌ Spot order error:', err);
      console.error('[DriftContext] ❌ Error type:', typeof err);
      console.error('[DriftContext] ❌ Error constructor:', err?.constructor?.name);

      // Extract logs if available (for SendTransactionError)
      if (err.logs) {
        console.error('[DriftContext] 📋 Transaction Logs:', err.logs);
      } else if (typeof err.getLogs === 'function') {
        try {
          const logs = err.getLogs();
          console.error('[DriftContext] 📋 Transaction Logs:', logs);
        } catch (logErr) {
          console.warn('[DriftContext] Could not fetch logs:', logErr);
        }
      }
      
      // Log full error object for debugging
      console.error('[DriftContext] 📋 Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));

      // Sanitize error messages for user-friendly display
      let friendlyError = 'Failed to place spot order';
      let errorTitle = 'Order Failed';
      let errorDetails: any = undefined;

      // Check for specific error patterns
      if (errorMessage.includes('InsufficientCollateral') || errorMessage.includes('0x1773')) {
        errorTitle = 'Insufficient Collateral';
        friendlyError = 'You need more USDC collateral to place this order.';
        // Note: freeCollateral and estimatedMarginRequired are out of scope here
        // They would need to be captured before the try block if needed in error details
      } else if (errorMessage.includes('MarketPlaceOrderPaused') || errorMessage.includes('Market is in settlement mode')) {
        errorTitle = 'Market Unavailable';
        friendlyError = 'This market is currently in settlement mode. Please try again in a few moments.';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('Insufficient')) {
        errorTitle = 'Insufficient Balance';
        friendlyError = 'You don\'t have enough balance to place this order.';
      } else if (errorMessage.includes('InvalidOracle') || errorMessage.includes('oracle')) {
        errorTitle = 'Oracle Error';
        friendlyError = 'Market price data is temporarily unavailable. Please try again.';
      } else if (errorMessage.includes('slippage')) {
        errorTitle = 'Price Movement';
        friendlyError = 'Price moved significantly. Please adjust your order and try again.';
      } else if (errorMessage.includes('0x17a8') || errorMessage.includes('InvalidOrderMinOrderSize')) {
        errorTitle = 'Order Too Small';
        friendlyError = 'Your order size is below the minimum required for this market.';
      } else if (errorMessage.includes('Transaction simulation failed')) {
        // Extract the actual error from simulation logs if possible
        const logs = err.logs || (typeof err.getLogs === 'function' ? err.getLogs() : []);
        const insufficientCollateralLog = logs.find((l: string) => l.includes('InsufficientCollateral'));
        
        if (insufficientCollateralLog || errorMessage.includes('0x1773')) {
          errorTitle = 'Insufficient Collateral';
          friendlyError = 'You need more USDC collateral to place this order.';
        } else {
          errorTitle = 'Simulation Failed';
          friendlyError = 'Transaction simulation failed. Please check your balance and try again.';
        }
      } else if (errorMessage.includes('blockhash not found')) {
        errorTitle = 'Network Congestion';
        friendlyError = 'The Solana network is congested. Please try again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorTitle = 'Transaction Timeout';
        friendlyError = 'Transaction timed out. Please try again.';
      } else if (errorMessage.includes('User rejected')) {
        errorTitle = 'Transaction Cancelled';
        friendlyError = 'You cancelled the transaction.';
      }

      // Show error modal
      setErrorModalData({
        title: errorTitle,
        message: friendlyError,
        details: errorDetails,
      });
      setShowErrorModal(true);

      return { success: false, error: friendlyError };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions, refreshAccounts, getSpotMarketName]);

  /**
   * Get all open orders for the user with detailed status information
   * 
   * Returns orders with status 'open' that are waiting to be filled by keepers
   * Includes auction status, fill progress, and timing information
   */
  const getOpenOrders = useCallback(async (): Promise<DriftOrder[]> => {
    const client = driftClientRef.current;
    if (!client) {
      console.log('[DriftContext] No client available to get orders');
      return [];
    }

    try {
      const driftUser = client.getUser();
      
      // Use the built-in method to get open orders
      const openOrders = driftUser.getOpenOrders();
      
      console.log(`[DriftContext] Found ${openOrders.length} raw open orders from SDK`);
      
      // Import required enums
      const { OrderStatus, MarketType, OrderType, PositionDirection } = await import('@drift-labs/sdk');
      
      // Get current slot for auction timing
      const currentSlot = await client.connection.getSlot();
      
      const orders: DriftOrder[] = openOrders.map((order: any, index: number) => {
        // Use proper enum comparisons instead of hardcoded values
        const marketType = order.marketType === MarketType.SPOT ? 'spot' : 'perp';
        const orderType = order.orderType === OrderType.MARKET ? 'market' : 'limit';
        
        // Use proper enum for direction
        let direction: 'long' | 'short' | 'buy' | 'sell';
        if (marketType === 'spot') {
          direction = order.direction === PositionDirection.LONG ? 'buy' : 'sell';
        } else {
          direction = order.direction === PositionDirection.LONG ? 'long' : 'short';
        }
        
        // Calculate fill progress
        const totalAmount = order.baseAssetAmount.toNumber();
        const filledAmount = order.baseAssetAmountFilled.toNumber();
        const fillPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0;
        
        // Check auction status
        const auctionEndSlot = order.slot.toNumber() + order.auctionDuration;
        const isInAuction = currentSlot < auctionEndSlot;
        const slotsRemaining = Math.max(0, auctionEndSlot - currentSlot);
        
        // CRITICAL: Get market name with proper fallback
        let marketName: string;
        if (marketType === 'spot') {
          marketName = getSpotMarketName(order.marketIndex);
          // If we get a generic fallback, try to get the actual name from the market account
          if (marketName.startsWith('Spot ')) {
            try {
              const marketAccount = client.getSpotMarketAccount(order.marketIndex);
              if (marketAccount && marketAccount.name) {
                const nameBytes = marketAccount.name;
                const parsedName = Buffer.from(nameBytes)
                  .toString('utf8')
                  .replace(/\0/g, '')
                  .trim();
                if (parsedName && parsedName !== 'UNKNOWN') {
                  marketName = parsedName;
                }
              }
            } catch (err) {
              console.warn(`[DriftContext] Could not fetch spot market name for index ${order.marketIndex}`);
            }
          }
        } else {
          marketName = getMarketName(order.marketIndex);
          // If we get a generic fallback, try to get the actual name from the market account
          if (marketName.startsWith('Market ')) {
            try {
              const marketAccount = client.getPerpMarketAccount(order.marketIndex);
              if (marketAccount && marketAccount.name) {
                const nameBytes = marketAccount.name;
                const parsedName = Buffer.from(nameBytes)
                  .toString('utf8')
                  .replace(/\0/g, '')
                  .trim();
                if (parsedName && parsedName !== 'UNKNOWN') {
                  marketName = parsedName;
                }
              }
            } catch (err) {
              console.warn(`[DriftContext] Could not fetch perp market name for index ${order.marketIndex}`);
            }
          }
        }
        
        console.log(`[DriftContext] Order ${index + 1}/${openOrders.length}:`, {
          orderId: order.orderId,
          marketIndex: order.marketIndex,
          marketName,
          marketType,
          orderType,
          direction,
          fillPercentage: fillPercentage.toFixed(2) + '%',
          isInAuction,
          slotsRemaining,
        });
        
        return {
          marketIndex: order.marketIndex,
          marketType,
          orderType,
          direction,
          baseAssetAmount: order.baseAssetAmount.toString(),
          price: order.price.toString(),
          status: 'open',
          orderIndex: order.orderId,
          marketName, // Add marketName to the returned order object
        };
      });
      
      const spotOrders = orders.filter(o => o.marketType === 'spot');
      const perpOrders = orders.filter(o => o.marketType === 'perp');
      
      console.log(`[DriftContext] Found ${orders.length} total open orders (${spotOrders.length} spot, ${perpOrders.length} perp)`);
      
      setOpenOrders(orders);
      return orders;
      
    } catch (err) {
      console.error('[DriftContext] Error getting open orders:', err);
      return [];
    }
  }, [getSpotMarketName, getMarketName]);

  /**
   * Get ALL orders (open, filled, cancelled) for the user
   * 
   * Returns all orders from user account, excluding only INIT status orders
   * Includes status information for each order
   */
  /**
   * Get ALL orders (open, filled, cancelled) for the user
   * Returns BOTH spot and perp orders for portfolio view
   */
  const getAllOrders = useCallback(async (): Promise<DriftOrder[]> => {
    const client = driftClientRef.current;
    if (!client) {
      console.log('[DriftContext] No client available to get orders');
      return [];
    }

    try {
      const driftUser = client.getUser();
      const userAccount = driftUser.getUserAccount();

      // Import all required enums
      const { OrderStatus, MarketType, OrderType, PositionDirection } = await import('@drift-labs/sdk');

      // Get ALL orders from user account (not just open ones)
      const allOrders = userAccount.orders.filter((order: any) =>
        order.status !== OrderStatus.INIT // Skip uninitialized orders
      );

      console.log(`[DriftContext] Found ${allOrders.length} total orders (all types) in user account`);

      const orders: DriftOrder[] = [];
      let spotOrderCount = 0;
      let perpOrderCount = 0;

      for (let i = 0; i < allOrders.length; i++) {
        const order = allOrders[i];

        // Map status to human-readable string
        let statusText: 'open' | 'filled' | 'canceled' | 'init';
        switch (order.status) {
          case OrderStatus.OPEN:
            statusText = 'open';
            break;
          case OrderStatus.FILLED:
            statusText = 'filled';
            break;
          case OrderStatus.CANCELED:
            statusText = 'canceled';
            break;
          default:
            statusText = 'init';
        }

        const isSpot = order.marketType === MarketType.SPOT;
        const marketType = isSpot ? 'spot' : 'perp';
        
        if (isSpot) {
          spotOrderCount++;
        } else {
          perpOrderCount++;
        }

        const orderType = order.orderType === OrderType.MARKET ? 'market' : 'limit';
        const direction = isSpot
          ? (order.direction === PositionDirection.LONG ? 'buy' : 'sell')
          : (order.direction === PositionDirection.LONG ? 'long' : 'short');

        // Calculate fill progress
        const totalAmount = order.baseAssetAmount.toNumber();
        const filledAmount = order.baseAssetAmountFilled.toNumber();
        const fillPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0;

        // CRITICAL: Get market name with proper fallback
        let marketName: string;
        if (isSpot) {
          marketName = getSpotMarketName(order.marketIndex);
          // If we get a generic fallback, try to get the actual name from the market account
          if (marketName.startsWith('Spot ')) {
            try {
              const marketAccount = client.getSpotMarketAccount(order.marketIndex);
              if (marketAccount && marketAccount.name) {
                const nameBytes = marketAccount.name;
                const parsedName = Buffer.from(nameBytes)
                  .toString('utf8')
                  .replace(/\0/g, '')
                  .trim();
                if (parsedName && parsedName !== 'UNKNOWN') {
                  marketName = parsedName;
                }
              }
            } catch (err) {
              console.warn(`[DriftContext] Could not fetch spot market name for index ${order.marketIndex}`);
            }
          }
        } else {
          marketName = getMarketName(order.marketIndex);
          // If we get a generic fallback, try to get the actual name from the market account
          if (marketName.startsWith('Market ')) {
            try {
              const marketAccount = client.getPerpMarketAccount(order.marketIndex);
              if (marketAccount && marketAccount.name) {
                const nameBytes = marketAccount.name;
                const parsedName = Buffer.from(nameBytes)
                  .toString('utf8')
                  .replace(/\0/g, '')
                  .trim();
                if (parsedName && parsedName !== 'UNKNOWN') {
                  marketName = `Market ${order.marketIndex}`;
                }
              }
            } catch (err) {
              console.warn(`[DriftContext] Could not fetch perp market name for index ${order.marketIndex}`);
            }
          }
        }

        console.log(`[DriftContext] Order ${i + 1} (${marketType} - ${statusText}):`, {
          orderId: order.orderId,
          marketIndex: order.marketIndex,
          marketName,
          direction,
          orderType,
          fillPercentage: fillPercentage.toFixed(2) + '%',
        });

        orders.push({
          marketIndex: order.marketIndex,
          marketType,
          orderType,
          direction,
          baseAssetAmount: order.baseAssetAmount.toString(),
          price: order.price.toString(),
          status: statusText,
          orderIndex: order.orderId,
          marketName, // Add marketName to the returned order object
        });
      }

      console.log(`[DriftContext] Returning ${orders.length} orders (${spotOrderCount} spot, ${perpOrderCount} perp)`);
      
      return orders;
    } catch (err) {
      console.error('[DriftContext] Error getting all orders:', err);
      return [];
    }
  }, [getSpotMarketName, getMarketName]);

  /**
   * Cancel an open order
   * 
   * @param orderIndex - Index of the order in the user's orders array
   */
  const cancelOrder = useCallback(async (
    orderIndex: number
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }

      console.log(`[DriftContext] Cancelling order at index ${orderIndex}`);

      // Cancel the order
      const txSignature = await client.cancelOrder(orderIndex);

      console.log('[DriftContext] Cancel order transaction sent:', txSignature);

      // Start background monitoring (non-blocking)
      startTransactionMonitor(client.connection, txSignature);
      console.log('[DriftContext] Background monitoring started for cancel order:', txSignature);

      // Refresh orders list
      await getOpenOrders();

      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      console.error('[DriftContext] Cancel order error:', err);

      let friendlyError = 'Failed to cancel order';
      if (errorMessage.includes('Order not found')) {
        friendlyError = 'Order not found or already filled';
      } else if (errorMessage.includes('Invalid order')) {
        friendlyError = 'Invalid order index';
      }

      return { success: false, error: friendlyError };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, getOpenOrders]);

  // Helper to get current oracle price from Drift
  const getMarketPrice = useCallback((marketIndex: number, type: 'perp' | 'spot' = 'perp'): number => {
    if (!driftClientRef.current) return 0;
    try {
      const oracleData = type === 'perp'
        ? driftClientRef.current.getOracleDataForPerpMarket(marketIndex)
        : driftClientRef.current.getOracleDataForSpotMarket(marketIndex);
      return oracleData.price.toNumber() / 1e6;
    } catch (err) {
      return 0;
    }
  }, []);

  // Preview trade locally using Drift SDK
  const previewTrade = useCallback(async (
    marketIndex: number,
    direction: 'long' | 'short',
    size: number,
    leverage: number
  ): Promise<any> => {
    if (!user?.userId) {
      throw new Error('User not authenticated');
    }

    try {
      const pin = await requestPin();

      let client = driftClientRef.current;
      if (!client) {
        client = await initializeDriftClient(pin);
      }

      // Ensure client is subscribed
      if (!client.isSubscribed) {
        await client.subscribe();
      }

      // Refresh accounts to get latest data
      await refreshAccounts();

      // Get user and market data
      const driftUser = client.getUser();
      const perpMarket = client.getPerpMarketAccount(marketIndex);
      const oracleData = client.getOracleDataForPerpMarket(marketIndex);

      // Import BN from Drift SDK
      const { BN } = await import('@drift-labs/sdk');

      // Use SDK precision helper for base asset amount
      const baseAssetAmount = client.convertToPerpPrecision(size);

      // Get current oracle price
      const oraclePrice = oracleData.price.toNumber() / 1e6; // Convert from 6 decimals

      // Calculate notional value
      const notionalValue = size * oraclePrice;

      // Calculate required margin based on leverage
      const requiredMargin = notionalValue / leverage;

      // Estimate trading fee (0.1% for taker)
      const estimatedFee = notionalValue * 0.001;

      // Total required = margin + fee
      const totalRequired = requiredMargin + estimatedFee;

      // Get user's free collateral
      let freeCollateral = 0;
      let totalCollateral = 0;

      try {
        freeCollateral = driftUser.getFreeCollateral
          ? driftUser.getFreeCollateral().toNumber() / 1e6
          : 0;
        const spotPosition = driftUser.getSpotPosition(0); // USDC
        totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
      } catch (err) {
        console.log('[DriftContext] Could not get collateral info:', err);
      }

      // Check if user has enough margin
      const marginCheckPassed = freeCollateral >= totalRequired;

      // Calculate estimated liquidation price
      // For long: liq price = entry - (margin / size)
      // For short: liq price = entry + (margin / size)
      const maintenanceMarginRatio = 0.05; // 5% maintenance margin
      const maintenanceMargin = notionalValue * maintenanceMarginRatio;
      const buffer = (requiredMargin - maintenanceMargin) / size;

      let estimatedLiquidationPrice;
      if (direction === 'long') {
        estimatedLiquidationPrice = oraclePrice - buffer;
      } else {
        estimatedLiquidationPrice = oraclePrice + buffer;
      }

      // Get funding rate
      let fundingRate = 0;
      try {
        if (perpMarket.amm?.lastFundingRate) {
          fundingRate = perpMarket.amm.lastFundingRate.toNumber() / 1e9;
        }
      } catch (err) {
        console.log('[DriftContext] Could not get funding rate');
      }

      // Estimate funding impact (funding rate * position size * 8 hours)
      const estimatedFundingImpact = fundingRate * notionalValue * (8 / 24);

      // Get market constraints
      const minOrderSize = perpMarket.orderStepSize
        ? perpMarket.orderStepSize.toNumber() / 1e9
        : 0;

      const minOrderSizeFromAmm = perpMarket.amm?.minOrderSize
        ? perpMarket.amm.minOrderSize.toNumber() / 1e9
        : 0;

      const effectiveMinSize = Math.max(minOrderSize, minOrderSizeFromAmm);

      // Check if size is valid
      const sizeTooSmall = size < effectiveMinSize;

      // Get max leverage for this market
      const maxLeverageAllowed = perpMarket.marginRatioInitial
        ? Math.floor(10000 / perpMarket.marginRatioInitial)
        : 10;

      return {
        market: Buffer.from(perpMarket.name).toString('utf8').replace(/\0/g, ''),
        side: direction.toUpperCase(),
        size,
        leverage,
        entryPrice: oraclePrice,
        notionalValue,
        requiredMargin,
        estimatedFee,
        totalRequired,
        userCollateral: totalCollateral,
        freeCollateral,
        marginCheckPassed,
        liquidationPrice: estimatedLiquidationPrice,
        estimatedLiquidationPrice,
        maintenanceMargin,
        fundingImpact: estimatedFundingImpact,
        estimatedFundingImpact,
        maxLeverageAllowed,
        minOrderSize: effectiveMinSize,
        sizeTooSmall,
        isPlaceholder: false,
      };
    } catch (err) {
      console.error('[DriftContext] Preview trade error:', err);
      throw err;
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts]);

  // Auto-refresh with WebSocket (every 10 seconds for UI updates)
  const startAutoRefresh = useCallback((intervalMs: number = 10000) => {
    stopAutoRefresh();
    console.log(`[DriftContext] Starting auto-refresh with WebSocket every ${intervalMs}ms`);
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
    if (typeof window !== 'undefined') localStorage.removeItem('worldstreet_temp_pin');
    console.log('[DriftContext] Cleared cached PIN');
  }, []);

  // Reset initialization failure flag (called when user clicks "Try Again")
  const resetInitializationFailure = useCallback(() => {
    setInitializationFailed(false);
    setError(null);
    setInitializationError(null);
    setIsFirstLoad(true); // Treat retry as first load to show overlay
    setShowInitOverlay(true); // Show overlay for retry
    setHasInitializedOnce(false); // Reset initialization flag to allow overlay on retry
    console.log('[DriftContext] Reset initialization failure flag');
  }, []);

  // Initialize data when user logs in
  useEffect(() => {
    if (user?.userId && !isClientReady && !isInitializing) {
      console.log('[DriftContext] Fetching initial data');
      refreshSummary();
      refreshPositions();
    }
  }, [user?.userId, isClientReady]); // Fix infinite loop by removing unstable deps

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
    connection: driftClientRef.current?.connection || null,
    summary,
    isLoading,
    error,
    isInitializing: showInitOverlay && isInitializing,
    initializationError,
    isInitialized,
    canTrade,
    needsInitialization,
    showPinUnlock,
    setShowPinUnlock,
    handlePinUnlock,
    showInsufficientSol,
    setShowInsufficientSol,
    solBalanceInfo,
    refreshSummary,
    refreshPositions,
    clearCache,
    resetInitializationFailure,
    depositCollateral,
    withdrawCollateral,
    openPosition,
    closePosition,
    placeSpotOrder,
    previewTrade,
    perpMarkets,
    spotMarkets,
    positions,
    spotPositions,
    openOrders,
    getOpenOrders,
    getAllOrders,
    cancelOrder,
    walletBalance,
    getSpotMarketIndexBySymbol,
    getMarketName,
    getMarketIndexBySymbol,
    getSpotMarketName,
    getMarketPrice,
    startAutoRefresh,
    stopAutoRefresh,
  };

  return (
    <DriftContext.Provider value={value}>
      {children}
      <PinUnlockModal
        isOpen={showPinUnlock}
        onUnlock={handlePinUnlock}
        onClose={() => setShowPinUnlock(false)}
      />
      <DriftErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorModalData(null);
        }}
        error={errorModalData}
      />
    </DriftContext.Provider>
  );
};
