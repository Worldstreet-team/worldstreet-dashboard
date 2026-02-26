"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/app/context/authContext';

// Types
interface DriftAccountStatus {
  exists: boolean;
  initialized: boolean;
  subaccountId: number;
  authority: string;
  requiresInitialization: boolean;
  initializationCost: {
    sol: number;
    usd: number;
  };
  lastUpdated: string;
  needsFuturesWallet?: boolean;
}

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
  error?: string;
}

interface DriftContextValue {
  // Raw data
  status: DriftAccountStatus | null;
  summary: DriftAccountSummary | null;
  
  // Loading/error states
  isLoading: boolean;
  error: string | null;
  
  // Computed booleans
  isInitialized: boolean;
  canTrade: boolean;
  needsInitialization: boolean;
  
  // Methods
  checkStatus: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  initializeAccount: () => Promise<{ success: boolean; error?: string; data?: any }>;
  
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
  const [status, setStatus] = useState<DriftAccountStatus | null>(null);
  const [summary, setSummary] = useState<DriftAccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusCacheRef = useRef<{ data: DriftAccountStatus; timestamp: number } | null>(null);
  const summaryCacheRef = useRef<{ data: DriftAccountSummary; timestamp: number } | null>(null);
  
  const STATUS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const SUMMARY_CACHE_DURATION = 30 * 1000; // 30 seconds

  // Check account status
  const checkStatus = useCallback(async () => {
    if (!user?.userId) return;
    
    // Check cache
    const now = Date.now();
    if (statusCacheRef.current && (now - statusCacheRef.current.timestamp) < STATUS_CACHE_DURATION) {
      setStatus(statusCacheRef.current.data);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/drift/account/status');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account status');
      }
      
      const data: DriftAccountStatus = await response.json();
      setStatus(data);
      statusCacheRef.current = { data, timestamp: now };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[DriftContext] Error checking status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  // Refresh account summary
  const refreshSummary = useCallback(async () => {
    if (!user?.userId) return;
    
    // Check cache
    const now = Date.now();
    if (summaryCacheRef.current && (now - summaryCacheRef.current.timestamp) < SUMMARY_CACHE_DURATION) {
      setSummary(summaryCacheRef.current.data);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/drift/account/summary');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account summary');
      }
      
      const data: DriftAccountSummary = await response.json();
      setSummary(data);
      summaryCacheRef.current = { data, timestamp: now };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[DriftContext] Error refreshing summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  // Initialize Drift account
  const initializeAccount = useCallback(async (): Promise<{ success: boolean; error?: string; data?: any }> => {
    if (!user?.userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/drift/account/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize account');
      }
      
      // Invalidate caches and refresh
      statusCacheRef.current = null;
      summaryCacheRef.current = null;
      
      await checkStatus();
      await refreshSummary();
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[DriftContext] Error initializing account:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, checkStatus, refreshSummary]);

  // Auto-refresh control
  const startAutoRefresh = useCallback((intervalMs: number = 30000) => {
    stopAutoRefresh();
    autoRefreshIntervalRef.current = setInterval(() => {
      refreshSummary();
    }, intervalMs);
  }, [refreshSummary]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    if (user?.userId) {
      checkStatus();
    }
  }, [user?.userId, checkStatus]);

  // Fetch summary when status shows initialized
  useEffect(() => {
    if (status?.initialized && user?.userId) {
      refreshSummary();
    }
  }, [status?.initialized, user?.userId, refreshSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  // Computed values
  const isInitialized = status?.initialized ?? false;
  const needsInitialization = status?.requiresInitialization ?? false;
  const canTrade = isInitialized && (summary?.freeCollateral ?? 0) > 0 && (summary?.marginRatio ?? 0) > 0.1;

  const value: DriftContextValue = {
    status,
    summary,
    isLoading,
    error,
    isInitialized,
    canTrade,
    needsInitialization,
    checkStatus,
    refreshSummary,
    initializeAccount,
    startAutoRefresh,
    stopAutoRefresh,
  };

  return <DriftContext.Provider value={value}>{children}</DriftContext.Provider>;
};
