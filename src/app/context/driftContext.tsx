"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/app/context/authContext';

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

  // Clear cache on logout
  useEffect(() => {
    if (!user?.userId) {
      setUserPin(null);
      setIsClientReady(false);
      setSummary(null);
      setPositions([]);
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

  // Refresh account summary from API
  const refreshSummary = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      const pin = await requestPin();
      
      const response = await fetch('/api/drift/client/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
        setIsClientReady(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('[DriftContext] Error refreshing summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh summary');
    }
  }, [user?.userId, requestPin]);

  // Refresh positions from API
  const refreshPositions = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      const pin = await requestPin();
      
      const response = await fetch('/api/drift/client/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPositions(data.data.positions);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh positions');
    }
  }, [user?.userId, requestPin]);

  // Deposit collateral
  const depositCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      const response = await fetch('/api/drift/client/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin, amount })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshSummary();
        return { success: true, txSignature: data.data.txSignature };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit collateral';
      console.error('[DriftContext] Deposit error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, refreshSummary]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      const response = await fetch('/api/drift/client/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin, amount })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshSummary();
        return { success: true, txSignature: data.data.txSignature };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      console.error('[DriftContext] Withdraw error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, refreshSummary]);

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
      
      const response = await fetch('/api/drift/client/open-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin, marketIndex, direction, size })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshSummary();
        await refreshPositions();
        return { success: true, txSignature: data.data.txSignature };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open position';
      console.error('[DriftContext] Open position error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, refreshSummary, refreshPositions]);

  // Close position
  const closePosition = useCallback(async (marketIndex: number): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setIsLoading(true);
      const pin = await requestPin();
      
      const response = await fetch('/api/drift/client/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, pin, marketIndex })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshSummary();
        await refreshPositions();
        return { success: true, txSignature: data.data.txSignature };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close position';
      console.error('[DriftContext] Close position error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, requestPin, refreshSummary, refreshPositions]);

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
