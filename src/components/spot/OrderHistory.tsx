'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface Trade {
  id: string;
  timestamp: string;
  pair: string;
  side: 'buy' | 'sell';
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  status: 'completed' | 'failed' | 'pending';
  txHash?: string;
  platformFee: string;
  gasUsed?: string;
}

export default function OrderHistory() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrades();
  }, [user]);

  const fetchTrades = async () => {
    if (!user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trades/${user.userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade history');
      }

      const data = await response.json();
      setTrades(data.trades || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-success/10 text-success text-xs font-semibold rounded-lg">
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-error/10 text-error text-xs font-semibold rounded-lg">
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-semibold rounded-lg flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 dark:border-darkborder">
          <div className="flex items-center gap-2">
            <Icon icon="ph:clock-clockwise" className="text-primary" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Order History</h3>
          </div>
        </div>
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/50 dark:border-darkborder">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="ph:clock-clockwise" className="text-primary" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Order History</h3>
          </div>
          <button
            onClick={fetchTrades}
            className="p-1.5 hover:bg-muted/30 dark:hover:bg-white/5 rounded-lg transition-colors"
            title="Refresh"
          >
            <Icon icon="ph:arrow-clockwise" className="text-muted" width={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-b border-error/30">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        {trades.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Icon icon="ph:swap" className="text-muted" width={32} />
            </div>
            <p className="text-muted text-sm">No trades yet</p>
            <p className="text-muted text-xs mt-1">Your trade history will appear here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Pair</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Side</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Amount In</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Amount Out</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Fee</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted">Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-border/50 dark:border-darkborder hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(trade.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-dark dark:text-white">
                      {trade.pair}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      trade.side === 'buy' ? 'text-success' : 'text-error'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-dark dark:text-white font-mono">
                      {parseFloat(trade.amountIn).toFixed(4)}
                    </div>
                    <div className="text-xs text-muted">{trade.tokenIn}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-dark dark:text-white font-mono">
                      {parseFloat(trade.amountOut).toFixed(4)}
                    </div>
                    <div className="text-xs text-muted">{trade.tokenOut}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-muted font-mono">
                      {parseFloat(trade.platformFee).toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(trade.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trade.txHash ? (
                      <a
                        href={`https://etherscan.io/tx/${trade.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs"
                      >
                        <Icon icon="ph:arrow-square-out" width={14} />
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
