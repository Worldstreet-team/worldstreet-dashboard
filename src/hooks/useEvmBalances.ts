import { useState, useCallback, useEffect } from 'react';

export interface EvmBalance {
  asset: string;
  chain: string;
  balance: number;
  usdValue: number;
}

export function useEvmBalances(userId: string | undefined) {
  const [balances, setBalances] = useState<EvmBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/users/${userId}/balances`);
      if (!response.ok) throw new Error('Failed to fetch balances');
      
      const data = await response.json();
      const balancesArray = data.balances || [];
      
      const formatted: EvmBalance[] = balancesArray.map((b: any) => ({
        asset: b.asset,
        chain: b.chain,
        balance: parseFloat(b.available_balance || "0"),
        usdValue: parseFloat(b.total_balance_usd || "0")
      }));
      
      setBalances(formatted);
    } catch (err: any) {
      console.error('Error fetching EVM balances:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch: fetchBalances };
}
