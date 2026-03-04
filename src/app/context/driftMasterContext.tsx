"use client";

/**
 * DRIFT MASTER WALLET CONTEXT
 * 
 * This context manages the master wallet for Drift Protocol.
 * The master wallet collects trading fees from users.
 * 
 * Architecture:
 * - driftContext.tsx: Client-side trading with user's own wallet (uses PIN-decrypted keys)
 * - driftMasterContext.tsx: Master wallet operations (uses client-side Drift SDK)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useAuth } from '@/app/context/authContext';
import {
  SubaccountInfo,
  DepositResult,
  PositionParams,
  MasterWalletInfo,
  DriftContextValue as MasterDriftContextValue
} from '@/types/drift-master-wallet';

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

const DriftMasterContext = createContext<MasterDriftContextValue | undefined>(undefined);

export const useDriftMaster = () => {
  const context = useContext(DriftMasterContext);
  if (!context) {
    throw new Error('useDriftMaster must be used within a DriftMasterProvider');
  }
  return context;
};

interface DriftMasterProviderProps {
  children: ReactNode;
}

export const DriftMasterProvider: React.FC<DriftMasterProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [masterWallet, setMasterWallet] = useState<MasterWalletInfo | null>(null);
  const [subaccountInfo, setSubaccountInfo] = useState<SubaccountInfo | null>(null);
  const [isInitializingSubaccount, setIsInitializingSubaccount] = useState(false);
  const [isDepositingCollateral, setIsDepositingCollateral] = useState(false);
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [isClosingPosition, setIsClosingPosition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const masterClientRef = useRef<any>(null);
  const userClientRef = useRef<any>(null);
  
  // Initialize master Drift client
  const initializeMasterClient = useCallback(async () => {
    if (masterClientRef.current) {
      return masterClientRef.current;
    }
    
    await loadDriftSDK();
    
    // Get master wallet private key from environment
    const masterPrivateKey = process.env.NEXT_PUBLIC_DRIFT_MASTER_PRIVATE_KEY;
    if (!masterPrivateKey) {
      throw new Error('Master wallet private key not configured');
    }
    
    const secretKey = new Uint8Array(Buffer.from(masterPrivateKey, 'base64'));
    const keypair = Keypair.fromSecretKey(secretKey);
    
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const wallet = new Wallet(keypair);
    const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    const client = new DriftClient({
      connection,
      wallet,
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      accountSubscription: {
        type: 'websocket',
        resubTimeoutMs: 30000,
      },
      subAccountIds: [0]
    });
    
    await client.subscribe();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    masterClientRef.current = client;
    return client;
  }, []);
  
  // Initialize user Drift client
  const initializeUserClient = useCallback(async (pin: string) => {
    if (userClientRef.current) {
      return userClientRef.current;
    }
    
    await loadDriftSDK();
    
    // Fetch user's encrypted wallet
    const response = await fetch('/api/wallet/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.userId })
    });
    
    const data = await response.json();
    if (!data.success || !data.data?.solana?.encryptedPrivateKey) {
      throw new Error('Solana wallet not found');
    }
    
    // Decrypt private key
    const { decryptWithPIN } = await import('@/lib/wallet/encryption');
    const decryptedPrivateKey = decryptWithPIN(data.data.solana.encryptedPrivateKey, pin);
    
    const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
    const keypair = Keypair.fromSecretKey(secretKey);
    
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const wallet = new Wallet(keypair);
    const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    const client = new DriftClient({
      connection,
      wallet,
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      accountSubscription: {
        type: 'websocket',
        resubTimeoutMs: 30000,
      },
      subAccountIds: [0]
    });
    
    await client.subscribe();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    userClientRef.current = client;
    return client;
  }, [user?.userId]);
  
  // Master wallet operations
  const refreshMasterWallet = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      const client = await initializeMasterClient();
      const balance = await client.connection.getBalance(client.wallet.publicKey);
      
      // Get fees from Drift user account
      const driftUser = client.getUser();
      let totalFeesCollected = 0;
      
      try {
        const accountData = driftUser.getUserAccount();
        // Calculate fees from account data if available
        totalFeesCollected = 0; // Placeholder - implement fee calculation
      } catch (err) {
        console.log('[DriftMasterContext] Account not initialized yet');
      }
      
      setMasterWallet({
        address: client.wallet.publicKey.toBase58(),
        balance: balance / 1e9, // Convert lamports to SOL
        totalFeesCollected
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch master wallet');
    }
  }, [user?.userId, initializeMasterClient]);
  
  // Subaccount operations (deprecated - using client-side architecture now)
  const refreshSubaccountInfo = useCallback(async () => {
    if (!user?.userId) return;
    
    // This is deprecated in the new client-side architecture
    // Each user manages their own Drift account via driftContext.tsx
    console.warn('[DriftMasterContext] refreshSubaccountInfo is deprecated');
  }, [user?.userId]);
  
  const initializeSubaccount = useCallback(async (): Promise<{ success: boolean; error?: string; data?: any }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    setIsInitializingSubaccount(true);
    setError(null);
    
    try {
      const response = await fetch('/api/futures/subaccount/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize subaccount');
      }
      
      await refreshSubaccountInfo();
      
      return { success: true, data: data.data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsInitializingSubaccount(false);
    }
  }, [user?.userId, refreshSubaccountInfo]);
  
  // Collateral operations
  const depositCollateral = useCallback(async (amount: number): Promise<DepositResult> => {
    if (!user?.userId) {
      throw new Error('User not authenticated');
    }
    
    setIsDepositingCollateral(true);
    setError(null);
    
    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to deposit collateral');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDepositingCollateral(false);
    }
  }, [user?.userId]);
  
  // Position operations (placeholders)
  const createPosition = useCallback(async (params: PositionParams): Promise<any> => {
    if (!user?.userId) {
      throw new Error('User not authenticated');
    }
    
    setIsCreatingPosition(true);
    setError(null);
    
    try {
      const response = await fetch('/api/futures/position/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create position');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreatingPosition(false);
    }
  }, [user?.userId]);
  
  const closePosition = useCallback(async (params: any): Promise<any> => {
    if (!user?.userId) {
      throw new Error('User not authenticated');
    }
    
    setIsClosingPosition(true);
    setError(null);
    
    try {
      const response = await fetch('/api/futures/position/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to close position');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsClosingPosition(false);
    }
  }, [user?.userId]);
  
  // Utility functions
  const getUserClient = useCallback(async () => {
    return userClientRef.current;
  }, []);
  
  const getMasterClient = useCallback(async () => {
    return masterClientRef.current || await initializeMasterClient();
  }, [initializeMasterClient]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const value: MasterDriftContextValue = {
    masterWallet,
    refreshMasterWallet,
    subaccountInfo,
    initializeSubaccount,
    refreshSubaccountInfo,
    depositCollateral,
    createPosition,
    closePosition,
    isInitializingSubaccount,
    isDepositingCollateral,
    isCreatingPosition,
    isClosingPosition,
    error,
    clearError,
    getUserClient,
    getMasterClient
  };
  
  return <DriftMasterContext.Provider value={value}>{children}</DriftMasterContext.Provider>;
};
