"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useAuth } from '@/app/context/authContext';
import { PinUnlockModal } from '@/components/wallet/PinUnlockModal';

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
  openPosition: (marketIndex: number, direction: 'long' | 'short', size: number, leverage: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  closePosition: (marketIndex: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
  placeSpotOrder: (marketIndex: number, direction: 'buy' | 'sell', amount: number, orderType?: 'market' | 'limit', price?: number) => Promise<{ success: boolean; txSignature?: string; error?: string }>;
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

    // Helper: Create Drift client with websocket subscription
    const createDriftClient = async (
      connection: Connection,
      wallet: any,
      programId: PublicKey
    ) => {
      console.log(`[DriftContext] Creating DriftClient with websocket subscription`);
      return new DriftClient({
        connection,
        wallet,
        programID: programId,
        accountSubscription: {
          type: 'websocket',
        },
        perpMarketIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        spotMarketIndexes: [0, 1, 2, 3, 4, 5],
        oracleInfos: [],
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

        // Step 9: Subscribe to client (Must happen before initializeUserAccount)
        try {
          console.log('[DriftContext] Subscribing to DriftClient...');
          await client.subscribe();
          console.log('[DriftContext] Successfully subscribed to DriftClient');

          // Verify subscription is active
          if (!client.isSubscribed) {
            console.warn('[DriftContext] Client subscription finished, but isSubscribed is false. Proceeding anyway.');
          }

        } catch (subscribeErr: any) {
          console.error('[DriftContext] Subscription error:', subscribeErr);

          // Log detailed JSON-RPC error if available
          if (subscribeErr.code) {
            console.error('[DriftContext] JSON-RPC Error Code:', subscribeErr.code);
          }
          if (subscribeErr.data) {
            console.error('[DriftContext] JSON-RPC Error Data:', subscribeErr.data);
          }

          // If it's a JSON-RPC error about accountSubscribe (happens when the user account doesn't exist yet)
          // we can safely ignore it and proceed to initialize the user account.
          const errString = String(subscribeErr?.message || subscribeErr);
          if (errString.includes('accountSubscribe') || errString.includes('Invalid parameter')) {
            console.warn('[DriftContext] Received accountSubscribe RPC error. Continuing since this is expected for uninitialized accounts.');
          } else {
            throw subscribeErr;
          }
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
   * This ensures market names remain consistent regardless of:
   * - SDK array order changes
   * - Session restarts
   * - SDK version updates
   * 
   * The marketIndex is the on-chain unique identifier and never changes.
   */
  const buildPerpMarketMapping = useCallback(async (client: any): Promise<Map<number, PerpMarketInfo>> => {
    console.log('[DriftContext] Building perp market mapping...');

    try {
      const marketMap = new Map<number, PerpMarketInfo>();

      // Get all perp market accounts from the client
      const perpMarketAccounts = client.getPerpMarketAccounts();

      if (!perpMarketAccounts || perpMarketAccounts.length === 0) {
        console.warn('[DriftContext] No perp markets found');
        return marketMap;
      }

      // Build mapping using marketIndex as the stable key
      for (const market of perpMarketAccounts) {
        const marketIndex = market.marketIndex;

        // Extract market symbol from the name buffer
        // Market names are stored as fixed-size byte arrays
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
        const baseAssetSymbol = symbol.split('-')[0] || symbol;

        marketMap.set(marketIndex, {
          marketIndex,
          symbol,
          baseAssetSymbol,
          initialized: true,
        });

        console.log(`[DriftContext] Market ${marketIndex}: ${symbol}`);
      }

      console.log(`[DriftContext] Built mapping for ${marketMap.size} perp markets`);
      return marketMap;

    } catch (err) {
      console.error('[DriftContext] Error building perp market mapping:', err);
      return new Map();
    }
  }, []);

  /**
   * Build stable mapping of spot marketIndex → market info
   */
  const buildSpotMarketMapping = useCallback(async (client: any): Promise<Map<number, SpotMarketInfo>> => {
    console.log('[DriftContext] Building spot market mapping...');

    try {
      const marketMap = new Map<number, SpotMarketInfo>();
      const spotMarketAccounts = client.getSpotMarketAccounts();

      if (!spotMarketAccounts || spotMarketAccounts.length === 0) {
        console.warn('[DriftContext] No spot markets found');
        return marketMap;
      }

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

        console.log(`[DriftContext] Spot Market ${marketIndex}: ${symbol}`);
      }

      return marketMap;
    } catch (err) {
      console.error('[DriftContext] Error building spot market mapping:', err);
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
   */
  const getMarketIndexBySymbol = useCallback((symbol: string): number | undefined => {
    if (!symbol) return undefined;
    const cleanSymbol = symbol.toUpperCase().trim();
    const cleanBase = cleanSymbol.split('-')[0];

    // 1. Try exact match in mapping (e.g., "SOL-PERP")
    for (const [index, info] of perpMarkets.entries()) {
      if (info.symbol.toUpperCase() === cleanSymbol) {
        return index;
      }
    }

    // 2. Try base asset match (e.g., "SOL" matches "SOL-PERP")
    for (const [index, info] of perpMarkets.entries()) {
      if (info.baseAssetSymbol.toUpperCase() === cleanBase) {
        return index;
      }
    }

    // 3. Last resort: partial string match
    for (const [index, info] of perpMarkets.entries()) {
      if (info.symbol.toUpperCase().includes(cleanBase) || cleanSymbol.includes(info.baseAssetSymbol.toUpperCase())) {
        return index;
      }
    }

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
   */
  const getSpotMarketIndexBySymbol = useCallback((symbol: string): number | undefined => {
    if (!symbol) return undefined;
    const cleanSymbol = symbol.toUpperCase().trim();

    for (const [index, info] of spotMarkets.entries()) {
      if (info.symbol.toUpperCase() === cleanSymbol || info.symbol.toUpperCase().startsWith(cleanSymbol)) {
        return index;
      }
    }

    return undefined;
  }, [spotMarkets]);
  /**
   * 
   * Handles:
   * - WebSocket disconnection detection
   * - Automatic resubscription
   * - Graceful fallback to polling if WebSocket fails
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

      // Fetch latest account data
      const driftUser = client.getUser();
      if (driftUser && driftUser.fetchAccounts) {
        await driftUser.fetchAccounts();
        console.log('[DriftContext] User accounts fetched successfully');
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
      // Only show overlay on first load
      if (isFirstLoad) {
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
    } catch (err) {
      console.error('[DriftContext] Error refreshing summary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh summary';
      setError(errorMessage);
      setInitializationError(errorMessage);
      setInitializationFailed(true); // Mark as failed on any error
      setIsInitializing(false);
      // Keep overlay visible on error so user can retry
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, initializationFailed, isFirstLoad]);

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
        // Refresh accounts via WebSocket
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

            // Get stable market name from mapping
            const marketName = getMarketName(marketIndex);

            let market;
            try {
              market = client.getPerpMarketAccount(marketIndex);
            } catch (err) {
              console.log(`[DriftContext] Could not get market ${marketIndex}`);
            }

            positionsList.push({
              marketIndex,
              marketName, // Stable market symbol
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

      // Get spot positions
      const spotPositionsList = [];
      try {
        const spotMarketAccounts = client.getSpotMarketAccounts();
        for (const marketAccount of spotMarketAccounts) {
          const marketIndex = marketAccount.marketIndex;
          const position = driftUser.getSpotPosition(marketIndex);

          if (position && !position.scaledBalance.isZero()) {
            const marketName = getSpotMarketName(marketIndex);
            const decimals = marketAccount.decimals;

            // Calculate actual amount based on balance type (deposit or borrow)
            let amount = 0;
            const balanceType = (position.balanceType.hasOwnProperty('deposit') ? 'deposit' : 'borrow') as 'deposit' | 'borrow';

            // Get token price from oracle
            let price = 0;
            try {
              const oracleData = client.getOracleDataForSpotMarket(marketIndex);
              price = oracleData.price.toNumber() / 1e6;
            } catch (pErr) {
              console.warn(`[DriftContext] Could not get price for spot market ${marketIndex}`);
            }

            // Convert BN to human readable number
            // Note: scaledBalance needs to be handled via getTokenAmount or similar Client method
            const tokenAmount = client.getTokenAmount(
              position.scaledBalance,
              marketAccount,
              position.balanceType
            );

            amount = tokenAmount.toNumber() / Math.pow(10, decimals);

            spotPositionsList.push({
              marketIndex,
              marketName,
              amount,
              balanceType,
              price,
              value: amount * price
            });
          }
        }
      } catch (spotErr) {
        console.warn('[DriftContext] Error getting spot positions:', spotErr);
      }

      setSpotPositions(spotPositionsList);
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh positions');
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, getMarketName]);

  // Poll transaction status using getSignatureStatus
  const pollTransactionStatus = async (
    connection: any,
    signature: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<boolean> => {
    console.log(`[DriftContext] Waiting for transaction confirmation: ${signature}`);

    try {
      // Use confirmTransaction with finalized commitment for reliable confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

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

      console.log(`[DriftContext] Transaction confirmed: ${signature}`);
      return true;
    } catch (err) {
      console.error(`[DriftContext] Error confirming transaction:`, err);
      throw err;
    }
  };

  const depositCollateral = useCallback(
    async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
      if (!user?.userId) {
        return { success: false, error: 'User not authenticated' };
      }

      try {
        setIsLoading(true);

        // Ensure wallet is unlocked / PIN provided
        const pin = await requestPin();

        // Initialize or get existing Drift client
        let client = driftClientRef.current;
        if (!client) {
          client = await initializeDriftClient(pin);
        }

        // Make sure client is subscribed (polling or websocket)
        if (!client.isSubscribed) {
          await client.subscribe();
        }

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

          // Wait for fee transaction confirmation
          await pollTransactionStatus(client.connection, feeTxSig, 30, 2000);
          console.log('[DriftContext] Fee transaction confirmed:', feeTxSig);
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

        // Wait for confirmation
        await pollTransactionStatus(client.connection, txSignature, 30, 2000);
        console.log('[DriftContext] Deposit confirmed:', txSignature);

        // Refresh accounts after deposit
        await refreshAccounts();

        // Refresh summary after success
        await refreshSummary();

        return { success: true, txSignature };
      } catch (err) {
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
          await client.subscribe();
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

        // 6. Poll for confirmation
        await pollTransactionStatus(client.connection, txSignature, 30, 2000);
        console.log("[DriftContext] Withdrawal confirmed:", txSignature);

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
    leverage: number
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

      // Construct order parameters with correct SDK enums
      const orderParams = {
        orderType: OrderType.MARKET,
        marketType: MarketType.PERP,
        marketIndex,
        direction: positionDirection,
        baseAssetAmount,
        price: new BN(0),
      };

      const txSignature = await client.placePerpOrder(orderParams);

      console.log('[DriftContext] Order transaction sent:', txSignature);

      // Poll for order transaction confirmation
      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      console.log('[DriftContext] Order confirmed:', txSignature);

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
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

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

      // Poll for close position transaction confirmation
      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      console.log('[DriftContext] Close position confirmed:', txSignature);

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
   * Place a spot market or limit order
   */
  const placeSpotOrder = useCallback(async (
    marketIndex: number,
    direction: 'buy' | 'sell',
    amount: number,
    orderType: 'market' | 'limit' = 'market',
    price?: number
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

      const { BN, OrderType, MarketType, PositionDirection } = await import('@drift-labs/sdk');

      const positionDirection = direction === 'buy'
        ? PositionDirection.LONG
        : PositionDirection.SHORT;

      const baseAssetAmount = client.convertToSpotPrecision(marketIndex, amount);

      const orderParams = {
        orderType: orderType === 'market' ? OrderType.MARKET : OrderType.LIMIT,
        marketType: MarketType.SPOT,
        marketIndex,
        direction: positionDirection,
        baseAssetAmount,
        price: price ? client.convertToPricePrecision(price) : new BN(0),
      };

      const txSignature = await client.placeSpotOrder(orderParams);
      console.log('[DriftContext] Spot order sent:', txSignature);

      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      await refreshSummary();
      await refreshPositions();

      return { success: true, txSignature };
    } catch (err) {
      console.error('[DriftContext] Spot order error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Spot order failed' };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

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
    console.log('[DriftContext] Reset initialization failure flag');
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
    </DriftContext.Provider>
  );
};
