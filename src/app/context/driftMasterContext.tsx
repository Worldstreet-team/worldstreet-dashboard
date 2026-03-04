"use client";

/**
 * DRIFT MASTER WALLET CONTEXT
 * 
 * This context is for READ-ONLY operations on the master wallet.
 * The master wallet ONLY receives trading fees from users.
 * 
 * IMPORTANT: This context does NOT need or use any private keys!
 * - Master wallet private key stays in server environment variables
 * - All operations here are API calls to server endpoints
 * - Users sign their own transactions with their PIN-decrypted keys (see driftContext.tsx)
 * 
 * Architecture:
 * - driftContext.tsx: Client-side trading with user's own wallet (uses PIN-decrypted keys)
 * - driftMasterContext.tsx: Read-only master wallet info (no private keys needed)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/app/context/authContext';
import {
  SubaccountInfo,
  DepositResult,
  PositionParams,
  MasterWalletInfo,
  DriftContextValue as MasterDriftContextValue
} from '@/types/drift-master-wallet';

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
  
  // Master wallet operations
  const refreshMasterWallet = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      const response = await fetch('/api/futures/master/balance');
      const data = await response.json();
      
      if (data.success) {
        const feesResponse = await fetch('/api/futures/master/fees');
        const feesData = await feesResponse.json();
        
        setMasterWallet({
          address: data.data.address,
          balance: data.data.balance,
          totalFeesCollected: feesData.success ? feesData.data.totalFeesCollected : 0
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch master wallet');
    }
  }, [user?.userId]);
  
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
    // This would be implemented if needed for direct client access
    return null;
  }, []);
  
  const getMasterClient = useCallback(async () => {
    // This would be implemented if needed for direct client access
    return null;
  }, []);
  
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
