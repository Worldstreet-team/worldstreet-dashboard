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

  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch(`/api/futures/positions?chain=${selectedChain}`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  }, [selectedChain, setPositions]);

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
      await Promise.all([
        fetchMarkets(),
        fetchPositions(),
        fetchCollateral(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMarkets, fetchPositions, fetchCollateral, setIsLoading]);

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
