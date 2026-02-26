import { useEffect, useCallback } from 'react';
import { useFuturesStore } from '@/store/futuresStore';

export const useFuturesData = () => {
  const {
    selectedChain,
    setMarkets,
    setPositions,
    setCollateral,
    setWalletAddresses,
    setIsLoading,
    setError,
  } = useFuturesStore();

  const fetchMarkets = useCallback(async () => {
    try {
      const response = await fetch(`/api/futures/markets?chain=${selectedChain}`);
      if (!response.ok) throw new Error('Failed to fetch markets');
      const data = await response.json();
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch markets');
    }
  }, [selectedChain, setMarkets, setError]);

  // Positions are now fetched directly by PositionPanel using Drift API
  // This function is kept for backward compatibility but does nothing
  const fetchPositions = useCallback(async () => {
    // No-op: Positions are managed by PositionPanel component
    setPositions([]);
  }, [setPositions]);

  const fetchCollateral = useCallback(async () => {
    try {
      const response = await fetch(`/api/futures/collateral?chain=${selectedChain}`);
      if (!response.ok) throw new Error('Failed to fetch collateral');
      const data = await response.json();
      setCollateral(data);
    } catch (error) {
      console.error('Error fetching collateral:', error);
    }
  }, [selectedChain, setCollateral]);

  const fetchWallet = useCallback(async () => {
    try {
      const response = await fetch(`/api/futures/wallet?chain=${selectedChain}`);
      if (!response.ok) {
        if (response.status === 404) {
          return { exists: false };
        }
        throw new Error('Failed to fetch wallet');
      }
      const data = await response.json();
      if (data.address) {
        setWalletAddresses({ [selectedChain]: data.address });
      }
      return { exists: true, address: data.address };
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return { exists: false };
    }
  }, [selectedChain, setWalletAddresses]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Only fetch markets and collateral
      // Positions are managed by PositionPanel using Drift API
      await Promise.all([
        fetchMarkets(),
        fetchCollateral(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMarkets, fetchCollateral, setIsLoading]);

  useEffect(() => {
    refreshData();
    
    // Poll every 5 seconds
    const interval = setInterval(refreshData, 5000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    fetchMarkets,
    fetchPositions,
    fetchCollateral,
    fetchWallet,
    refreshData,
  };
};
