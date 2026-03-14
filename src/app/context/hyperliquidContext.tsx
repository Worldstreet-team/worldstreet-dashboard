"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWallet } from './walletContext';

interface HyperliquidAccountSummary {
  totalCollateral: number;
  freeCollateral: number;
  unrealizedPnl: number;
  leverage: number;
  marginRatio: number;
  openPositions: number;
  withdrawable: number;
}

interface HyperliquidContextType {
  isInitialized: boolean;
  needsInitialization: boolean;
  canTrade: boolean;
  isLoading: boolean;
  error: string | null;
  summary: HyperliquidAccountSummary | null;
  positions: any[];
  refreshSummary: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  openPosition: (params: any) => Promise<{ success: boolean; error?: string }>;
  closePosition: (symbol: string) => Promise<{ success: boolean; error?: string }>;
}

const HyperliquidContext = createContext<HyperliquidContextType | undefined>(undefined);

export function HyperliquidProvider({ children }: { children: ReactNode }) {
  const { addresses } = useWallet();

  const [isInitialized, setIsInitialized] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [canTrade, setCanTrade] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<HyperliquidAccountSummary | null>(null);
  const [positions, setPositions] = useState<any[]>([]);

  const refreshSummary = useCallback(async () => {
    if (!addresses?.ethereum) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/futures/subaccount/info`);
      const data = await response.json();
      
      if (data.success) {
        setSummary({
          totalCollateral: data.data.accountValue,
          freeCollateral: data.data.withdrawable,
          unrealizedPnl: data.data.unrealizedPnl,
          leverage: data.data.totalMarginUsed > 0 ? (data.data.accountValue / (data.data.accountValue - data.data.totalMarginUsed)) : 1.0,
          marginRatio: data.data.totalMarginUsed > 0 ? (data.data.totalMarginUsed / data.data.accountValue) : 0,
          openPositions: data.data.positions.length,
          withdrawable: data.data.withdrawable
        });
        setPositions(data.data.positions);
        setIsInitialized(true);
        setNeedsInitialization(false);
        setCanTrade(data.data.accountValue > 0);
        setError(null);
      } else {
        if (data.error === 'Wallet not found' || (typeof data.error === 'string' && data.error.includes('Wallet not found'))) {
          setNeedsInitialization(true);
        }
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch HL summary:', err);
      setError('Failed to connect to Hyperliquid');
    } finally {
      setIsLoading(false);
    }
  }, [addresses?.ethereum]);

  const refreshPositions = useCallback(async () => {
    await refreshSummary();
  }, [refreshSummary]);

  const openPosition = async (params: any) => {
    try {
      const response = await fetch('/api/futures/position/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const result = await response.json();
      if (result.success) {
        setTimeout(refreshSummary, 1000);
      }
      return result;
    } catch (err) {
      return { success: false, error: 'Connection failed' };
    }
  };

  const closePosition = async (symbol: string) => {
    try {
      const response = await fetch('/api/futures/position/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      const result = await response.json();
      if (result.success) {
        setTimeout(refreshSummary, 1000);
      }
      return result;
    } catch (err) {
      return { success: false, error: 'Connection failed' };
    }
  };

  useEffect(() => {
    if (addresses?.ethereum) {
      refreshSummary();
      const interval = setInterval(refreshSummary, 15000);
      return () => clearInterval(interval);
    }
  }, [addresses?.ethereum, refreshSummary]);

  return (
    <HyperliquidContext.Provider
      value={{
        isInitialized,
        needsInitialization,
        canTrade,
        isLoading,
        error,
        summary,
        positions,
        refreshSummary,
        refreshPositions,
        openPosition,
        closePosition
      }}
    >
      {children}
    </HyperliquidContext.Provider>
  );
}

export function useHyperliquid() {
  const context = useContext(HyperliquidContext);
  if (context === undefined) {
    throw new Error('useHyperliquid must be used within a HyperliquidProvider');
  }
  return context;
}
