import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';

interface Market {
  marketIndex: number;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  oraclePrice: number;
  maxLeverage: number;
  maintenanceMarginRatio: number;
  initialMarginRatio: number;
  minOrderSize: number;
  stepSize: number;
  tickSize: number;
  contractType: string;
  status: string;
  fundingRate: number;
  openInterest: number;
}

interface Position {
  id: string;
  user_id: string;
  chain: string;
  provider: string;
  market_index: number;
  symbol: string;
  side: string;
  size: string;
  entry_price: string;
  liquidation_price: string;
  leverage: string;
  margin: string;
  unrealized_pnl: string;
  realized_pnl: string;
  status: string;
  open_tx_hash: string;
  close_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface Collateral {
  total: number;
  available: number;
  used: number;
  currency: string;
  exists: boolean;
}

export function useFuturesTrading() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [collateral, setCollateral] = useState<Collateral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.userId || '';

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      const response = await fetch('/api/futures/markets?chain=solana');
      if (response.ok) {
        const data = await response.json();
        setMarkets(data.markets || []);
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError('Failed to fetch markets');
    }
  }, []);

  // Fetch positions
  const fetchPositions = useCallback(async (status: string = 'OPEN') => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/futures/positions?status=${status}`);
      if (response.ok) {
        const data = await response.json();
        setPositions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setError('Failed to fetch positions');
    }
  }, [userId]);

  // Fetch collateral
  const fetchCollateral = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/futures/collateral?chain=solana');
      
      if (response.status === 404) {
        // Wallet not found - this is expected for new users
        setCollateral(null);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setCollateral(data.collateral || null);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch collateral:', errorData);
        setError(errorData.message || 'Failed to fetch collateral');
      }
    } catch (err) {
      console.error('Failed to fetch collateral:', err);
      setError('Failed to fetch collateral');
    }
  }, [userId]);

  // Open position
  const openPosition = useCallback(async (
    market: string,
    marketIndex: number,
    side: 'LONG' | 'SHORT',
    size: number,
    leverage: number,
    limitPrice?: number
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const body: any = {
        userId,
        chain: 'solana',
        marketIndex,
        market,
        side,
        size: size.toString(),
        leverage,
      };

      if (limitPrice) {
        body.limitPrice = limitPrice.toString();
      }

      const response = await fetch('/api/futures/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to open position');
      }

      const result = await response.json();
      await fetchPositions(); // Refresh positions
      await fetchCollateral(); // Refresh collateral
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open position';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchPositions, fetchCollateral]);

  // Close position
  const closePosition = useCallback(async (positionId: string, size?: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const body: any = {
        userId,
        positionId,
      };

      if (size) {
        body.size = size.toString();
      }

      const response = await fetch('/api/futures/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to close position');
      }

      const result = await response.json();
      await fetchPositions(); // Refresh positions
      await fetchCollateral(); // Refresh collateral
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close position';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchPositions, fetchCollateral]);

  // Deposit collateral
  const depositCollateral = useCallback(async (amount: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/futures/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chain: 'solana',
          amount: amount.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deposit collateral');
      }

      const result = await response.json();
      await fetchCollateral(); // Refresh collateral
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deposit collateral';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchCollateral]);

  // Withdraw collateral
  const withdrawCollateral = useCallback(async (amount: number) => {
    if (!userId) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/futures/collateral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chain: 'solana',
          amount: amount.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw collateral');
      }

      const result = await response.json();
      await fetchCollateral(); // Refresh collateral
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw collateral';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchCollateral]);

  // Initial fetch
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  useEffect(() => {
    if (userId) {
      fetchPositions();
      fetchCollateral();
    }
  }, [userId, fetchPositions, fetchCollateral]);

  return {
    markets,
    positions,
    collateral,
    loading,
    error,
    fetchMarkets,
    fetchPositions,
    fetchCollateral,
    openPosition,
    closePosition,
    depositCollateral,
    withdrawCollateral,
  };
}
