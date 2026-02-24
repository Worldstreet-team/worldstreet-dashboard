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
      console.log('Balance API response:', data);
      
      // The API returns an array directly, not wrapped in a balances property
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
      <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="ph:wallet" className="text-primary" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Trading Balances</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted/20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="ph:wallet" className="text-primary" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Trading Balances</h3>
        </div>
        <button
          onClick={fetchBalances}
          className="p-1.5 hover:bg-muted/30 dark:hover:bg-white/5 rounded-lg transition-colors"
          title="Refresh"
        >
          <Icon icon="ph:arrow-clockwise" className="text-muted" width={18} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {balances.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted text-sm">No balances found</p>
          </div>
        ) : (
          balances.map((balance, index) => {
            const total = (parseFloat(balance.available_balance) + parseFloat(balance.locked_balance)).toString();
            const hasBalance = parseFloat(total) > 0;
            
            return (
              <div
                key={`${balance.asset}-${balance.chain}-${index}`}
                className="p-4 bg-muted/30 dark:bg-white/5 rounded-xl border border-border/50 dark:border-darkborder"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {balance.asset.slice(0, 2)}
                      </span>
                    </div>
                      <div className="flex items-center gap-2">
                      <span className="font-semibold text-dark dark:text-white">
                        {balance.asset}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        CHAIN_COLORS[balance.chain.toLowerCase()]?.bg || 'bg-muted/20'
                      } ${
                        CHAIN_COLORS[balance.chain.toLowerCase()]?.text || 'text-muted'
                      }`}>
                        {balance.chain.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono ${
                      hasBalance ? 'text-dark dark:text-white' : 'text-muted'
                    }`}>
                      {parseFloat(total).toFixed(6)}
                    </div>
                    <div className="text-xs text-muted">Total</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <div className="text-muted mb-1">Available</div>
                    <div className="font-semibold text-success font-mono">
                      {parseFloat(balance.available_balance).toFixed(6)}
                    </div>
                  </div>
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <div className="text-muted mb-1">Locked</div>
                    <div className="font-semibold text-warning font-mono">
                      {parseFloat(balance.locked_balance).toFixed(6)}
                    </div>
                  </div>
                </div>

                {parseFloat(balance.locked_balance) > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                    <Icon icon="ph:lock" width={12} />
                    <span>Funds locked in pending trades</span>
                  </div>
                )}

                {/* Show token address for debugging */}
                <div className="mt-2 text-[10px] text-muted truncate">
                  {balance.tokenAddress}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 dark:border-darkborder">
        <div className="flex items-start gap-2 text-xs text-muted">
          <Icon icon="ph:info" className="shrink-0 mt-0.5" width={14} />
          <p>
            Available balance can be used for trading. Locked balance is reserved for pending orders.
          </p>
        </div>
      </div>
    </div>
  );
}
