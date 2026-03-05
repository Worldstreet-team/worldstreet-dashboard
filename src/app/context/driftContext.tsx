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
  
  // Insufficient SOL modal state
  const [showInsufficientSol, setShowInsufficientSol] = useState(false);
  const [solBalanceInfo, setSolBalanceInfo] = useState<{
    required: number;
    current: number;
    address: string;
  } | null>(null);
  
  // Track initialization failure to prevent auto-retry
  const [initializationFailed, setInitializationFailed] = useState(false);
  
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

  // Initialize Drift client with polling (SAFE VERSION)
  const initializeDriftClient = useCallback(async (pin: string) => {
    try {
      // Fetch encrypted wallet with PIN
      let fetchedEncryptedKey = encryptedPrivateKey;
      
      if (!fetchedEncryptedKey) {
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
      
      // Load SDK
      await loadDriftSDK();
      
      // Decrypt private key
      const { decryptWithPIN } = await import('@/lib/wallet/encryption');
      const decryptedPrivateKey = decryptWithPIN(fetchedEncryptedKey!, pin);
      
      // Create keypair
      const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Initialize connection
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      
      // Create wallet and LOAD IT
      const wallet = new Wallet(keypair);
      console.log('[DriftContext] Wallet created, loading...');
      
      // Create Drift client with POLLING (no WebSocket)
      const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
      
      // Import BulkAccountLoader for polling
      const { BulkAccountLoader } = await import('@drift-labs/sdk');
      const accountLoader = new BulkAccountLoader(connection, 'confirmed', 1000);
      
      const client = new DriftClient({
        connection,
        wallet,
        programID: new PublicKey(DRIFT_PROGRAM_ID),
        accountSubscription: {
          type: 'polling',
          accountLoader,
        },
      });
      
      console.log('[DriftContext] DriftClient created, subscribing...');
      
      // Subscribe to the client (required even for polling mode)
      await client.subscribe();
      
      console.log('[DriftContext] Client subscribed, checking user account...');
      
      // Check if user account is initialized
      try {
        const user = client.getUser();
        const userAccount = user.getUserAccount();
        console.log('[DriftContext] User account found:', userAccount.authority.toBase58());
      } catch (err) {
        // User account not initialized, initialize it
        console.log('[DriftContext] User account not initialized, initializing...');
        try {
          await client.initializeUserAccount();
          console.log('[DriftContext] User account initialized successfully');
        } catch (initErr: any) {
          console.error('[DriftContext] Failed to initialize user account:', initErr);
          
          // Check if it's an insufficient SOL error
          const errorMessage = initErr?.message || String(initErr);
          if (errorMessage.includes('insufficient lamports') || errorMessage.includes('Transfer: insufficient')) {
            // Parse the error to get required amount
            const match = errorMessage.match(/need (\d+)/);
            const requiredLamports = match ? parseInt(match[1]) : 2561280; // Default from error
            const requiredSol = requiredLamports / 1e9;
            
            // Get current balance
            const balance = await connection.getBalance(keypair.publicKey);
            const currentSol = balance / 1e9;
            
            // Show insufficient SOL modal
            setSolBalanceInfo({
              required: Math.ceil(requiredSol * 100) / 100, // Round up to 2 decimals
              current: currentSol,
              address: keypair.publicKey.toBase58(),
            });
            setShowInsufficientSol(true);
            setInitializationFailed(true); // Mark initialization as failed
            
            throw new Error(`Insufficient SOL: Need at least ${Math.ceil(requiredSol * 100) / 100} SOL to initialize Drift account`);
          }
          
          // Re-throw other errors
          throw initErr;
        }
      }
      
      driftClientRef.current = client;
      console.log('[DriftContext] Drift client ready!');
      return client;
    } catch (error) {
      console.error('[DriftContext] Error initializing Drift client:', error);
      throw error;
    }
  }, [encryptedPrivateKey]);

  // Refresh accounts from Drift (polling) - SAFE VERSION
  const refreshAccounts = useCallback(async () => {
    const client = driftClientRef.current;
    if (!client) {
      console.log('[DriftContext] No client to refresh');
      return;
    }
    
    try {
      // With polling + subscription, accounts are automatically refreshed
      // We just need to ensure the subscription is active
      if (!client.isSubscribed) {
        console.log('[DriftContext] Client not subscribed, subscribing...');
        await client.subscribe();
      }
      console.log('[DriftContext] Accounts refreshed via polling subscription');
    } catch (err) {
      console.error('[DriftContext] Error refreshing accounts:', err);
      // Don't throw, just log
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

  // Refresh account summary from Drift client (with polling) - SAFE VERSION
  const refreshSummary = useCallback(async () => {
    if (!user?.userId) return;
    
    // Don't retry if initialization already failed
    if (initializationFailed) {
      console.log('[DriftContext] Initialization previously failed, skipping auto-retry');
      return;
    }
    
    try {
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        console.log('[DriftContext] Initializing client for summary...');
        client = await initializeDriftClient(pin);
      } else {
        // Refresh accounts via polling
        await refreshAccounts();
      }
      
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
        perpPositions = driftUser.getPerpPositions();
        
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
      setInitializationFailed(true); // Mark as failed on any error
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts, initializationFailed]);

  // Refresh positions from Drift client (with polling) - SAFE VERSION
  const refreshPositions = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      const pin = await requestPin();
      
      let client = driftClientRef.current;
      if (!client) {
        console.log('[DriftContext] Initializing client for positions...');
        client = await initializeDriftClient(pin);
      } else {
        // Refresh accounts via polling
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
        const perpPositions = driftUser.getPerpPositions();
        
        if (perpPositions && Array.isArray(perpPositions)) {
          for (const position of perpPositions) {
            const baseAmount = position.baseAssetAmount ? position.baseAssetAmount.toNumber() : 0;
            if (baseAmount === 0) continue;
            
            const direction: 'long' | 'short' = baseAmount > 0 ? 'long' : 'short';
            
            let market;
            try {
              market = client.getPerpMarketAccount(position.marketIndex);
            } catch (err) {
              console.log(`[DriftContext] Could not get market ${position.marketIndex}`);
            }
            
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
      } catch (err) {
        console.log('[DriftContext] Error getting perp positions:', err);
      }
      
      setPositions(positionsList);
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh positions');
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshAccounts]);

  // Poll transaction status using getSignatureStatus
  const pollTransactionStatus = async (
    connection: any,
    signature: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<boolean> => {
    console.log(`[DriftContext] Polling transaction status: ${signature}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
          console.log(`[DriftContext] Transaction confirmed: ${signature}`);
          return true;
        }
        
        if (status?.value?.err) {
          console.error(`[DriftContext] Transaction failed: ${signature}`, status.value.err);
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        
        console.log(`[DriftContext] Attempt ${attempt + 1}/${maxAttempts}: Transaction pending...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (err) {
        console.error(`[DriftContext] Error polling transaction:`, err);
        if (attempt === maxAttempts - 1) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  };

  // Deposit collateral with fee
  const depositCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
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
      
      // Calculate fee (5%)
      const { calculateFee } = await import('@/config/drift');
      const { fee, netAmount } = calculateFee(amount);
      
      console.log(`[DriftContext] Depositing ${amount} USDC: ${fee} USDC fee + ${netAmount} USDC collateral`);
      
      // First, send fee to master wallet if configured (in USDC)
      const { DRIFT_CONFIG } = await import('@/config/drift');
      if (DRIFT_CONFIG.MASTER_WALLET_ADDRESS) {
        const { PublicKey } = await import('@solana/web3.js');
        const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = await import('@solana/spl-token');
        const { Transaction } = await import('@solana/web3.js');
        
        // USDC mint address on Solana mainnet
        const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        
        // Get associated token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          client.wallet.publicKey
        );
        
        const toTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          new PublicKey(DRIFT_CONFIG.MASTER_WALLET_ADDRESS)
        );
        
        // Create transfer instruction for fee (in USDC base units: 6 decimals)
        const feeTransaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            client.wallet.publicKey,
            Math.floor(fee * 1e6), // Convert USDC to base units
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        // Get recent blockhash
        const { blockhash } = await client.connection.getLatestBlockhash('finalized');
        feeTransaction.recentBlockhash = blockhash;
        feeTransaction.feePayer = client.wallet.publicKey;
        
        // Sign and send fee transaction
        feeTransaction.sign(client.wallet.payer);
        const feeTxSignature = await client.connection.sendRawTransaction(feeTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log('[DriftContext] Fee transaction sent:', feeTxSignature);
        
        // Poll for fee transaction confirmation
        await pollTransactionStatus(client.connection, feeTxSignature, 30, 2000);
        console.log('[DriftContext] Fee sent to master wallet confirmed:', feeTxSignature);
      }
      
      // Then deposit net amount to Drift
      // Import BN for proper amount encoding
      const BN = (await import('bn.js')).default;
      const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
      const { Transaction } = await import('@solana/web3.js');
      
      const depositAmount = new BN(Math.floor(netAmount * 1e6)); // Convert to USDC base units (6 decimals)
      
      // USDC mint address on Solana mainnet
      const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      
      // Get user's USDC associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        client.wallet.publicKey
      );
      
      // Check if the token account exists, if not create it
      const accountInfo = await client.connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        console.log('[DriftContext] Creating USDC token account...');
        const createAtaIx = createAssociatedTokenAccountInstruction(
          client.wallet.publicKey, // payer
          userTokenAccount, // ata
          client.wallet.publicKey, // owner
          USDC_MINT // mint
        );
        
        const createAtaTx = new Transaction().add(createAtaIx);
        const { blockhash } = await client.connection.getLatestBlockhash('finalized');
        createAtaTx.recentBlockhash = blockhash;
        createAtaTx.feePayer = client.wallet.publicKey;
        
        createAtaTx.sign(client.wallet.payer);
        const createAtaSig = await client.connection.sendRawTransaction(createAtaTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        await pollTransactionStatus(client.connection, createAtaSig, 30, 2000);
        console.log('[DriftContext] USDC token account created:', createAtaSig);
      }
      
      const txSignature = await client.deposit(
        depositAmount,
        0, // USDC market index
        client.getUser().getUserAccountPublicKey(),
        userTokenAccount // Pass the user's token account explicitly
      );
      
      console.log('[DriftContext] Deposit transaction sent:', txSignature);
      
      // Poll for deposit transaction confirmation
      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      console.log('[DriftContext] Collateral deposited to Drift confirmed:', txSignature);
      
      await refreshSummary();
      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit collateral';
      console.error('[DriftContext] Deposit error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
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
      
      console.log(`[DriftContext] Withdrawing ${amount} USDC from Drift`);
      
      // Withdraw USDC
      // Import BN for proper amount encoding
      const BN = (await import('bn.js')).default;
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      
      const withdrawAmount = new BN(Math.floor(amount * 1e6)); // Convert to USDC base units (6 decimals)
      
      // USDC mint address on Solana mainnet
      const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      
      // Get user's USDC associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        client.wallet.publicKey
      );
      
      const txSignature = await client.withdraw(
        withdrawAmount,
        0, // USDC market index
        client.getUser().getUserAccountPublicKey(),
        userTokenAccount // Pass the user's token account explicitly
      );
      
      console.log('[DriftContext] Withdrawal transaction sent:', txSignature);
      
      // Poll for withdrawal transaction confirmation
      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      console.log('[DriftContext] Withdrawal confirmed:', txSignature);
      
      await refreshSummary();
      return { success: true, txSignature };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      console.error('[DriftContext] Withdraw error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary]);

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
      
      // Place order
      // Import BN for proper amount encoding
      const BN = (await import('bn.js')).default;
      const baseAmount = new BN(Math.floor(size * 1e9));
      
      const orderParams = {
        orderType: 'market',
        marketIndex,
        direction,
        baseAssetAmount: baseAmount,
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open position';
      console.error('[DriftContext] Open position error:', err);
      return { success: false, error: errorMessage };
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
      
      // Get position
      const driftUser = client.getUser();
      const position = driftUser.getPerpPosition(marketIndex);
      
      if (!position || position.baseAssetAmount.toNumber() === 0) {
        return { success: false, error: 'No position found' };
      }
      
      // Close position by placing opposite order
      // Import BN for proper amount encoding
      const BN = (await import('bn.js')).default;
      const baseAmount = new BN(Math.abs(position.baseAssetAmount.toNumber()));
      const direction = position.baseAssetAmount.toNumber() > 0 ? 'short' : 'long';
      
      const orderParams = {
        orderType: 'market',
        marketIndex,
        direction,
        baseAssetAmount: baseAmount,
        price: new BN(0),
        reduceOnly: true,
      };
      
      const txSignature = await client.placePerpOrder(orderParams);
      
      console.log('[DriftContext] Close position transaction sent:', txSignature);
      
      // Poll for close position transaction confirmation
      await pollTransactionStatus(client.connection, txSignature, 30, 2000);
      console.log('[DriftContext] Close position confirmed:', txSignature);
      
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
  }, [user?.userId, requestPin, initializeDriftClient, refreshSummary, refreshPositions]);

  // Auto-refresh with polling (every 5 seconds)
  const startAutoRefresh = useCallback((intervalMs: number = 5000) => {
    stopAutoRefresh();
    console.log(`[DriftContext] Starting auto-refresh polling every ${intervalMs}ms`);
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

  // Reset initialization failure flag (called when user clicks "Try Again")
  const resetInitializationFailure = useCallback(() => {
    setInitializationFailed(false);
    setError(null);
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
    startAutoRefresh,
    stopAutoRefresh,
  };

  return (
    <DriftContext.Provider value={value}>
      {children}
    </DriftContext.Provider>
  );
};
