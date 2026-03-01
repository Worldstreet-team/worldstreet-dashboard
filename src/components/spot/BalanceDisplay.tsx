'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface Balance {
  asset: string;
  chain: string;
  available_balance: string;
  locked_balance: string;
  tokenAddress: string;
}

// Chain badge colors
const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  sol: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  evm: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
};

export default function BalanceDisplay() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalances();
  }, [user]);

  const fetchBalances = async () => {
    if (!user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.userId}/balances`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      const balancesArray = Array.isArray(data) ? data : data.balances || [];
      setBalances(balancesArray);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="p-3 bg-error/10 border-b border-error/30">
          <div className="flex items-center gap-2">
            <Icon icon="ph:warning-circle" className="text-error" width={16} />
            <p className="text-xs text-error">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {balances.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-2">
              <Icon icon="ph:wallet" className="text-muted" width={24} />
            </div>
            <p className="text-muted text-xs">No balances found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Chain</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Available</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Locked</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Total</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance, index) => {
                const available = parseFloat(balance.available_balance);
                const locked = parseFloat(balance.locked_balance);
                const total = available + locked;
                const hasBalance = total > 0;
                
                return (
                  <tr
                    key={`${balance.asset}-${balance.chain}-${index}`}
                    className="border-b border-border/50 dark:border-darkborder hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">
                            {balance.asset.slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-dark dark:text-white">
                          {balance.asset}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        CHAIN_COLORS[balance.chain.toLowerCase()]?.bg || 'bg-muted/20'
                      } ${
                        CHAIN_COLORS[balance.chain.toLowerCase()]?.text || 'text-muted'
                      }`}>
                        {balance.chain.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-success font-mono font-semibold">
                        {available.toFixed(6)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm text-warning font-mono font-semibold">
                          {locked.toFixed(6)}
                        </span>
                        {locked > 0 && (
                          <Icon icon="ph:lock" className="text-warning" width={12} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold font-mono ${
                        hasBalance ? 'text-dark dark:text-white' : 'text-muted'
                      }`}>
                        {total.toFixed(6)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border/50 dark:border-darkborder bg-muted/20 dark:bg-white/5">
        <div className="flex items-start gap-2 text-[10px] text-muted">
          <Icon icon="ph:info" className="shrink-0 mt-0.5" width={12} />
          <p>
            Available balance can be used for trading. Locked balance is reserved for pending orders.
          </p>
        </div>
      </div>
    </div>
  );
}
