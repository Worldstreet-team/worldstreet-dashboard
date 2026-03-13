'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface Position {
  id: string;
  userId: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  quantity: string;
  entryPrice: string;
  currentPrice?: string;
  investedQuote: string;
  unrealizedPnl?: string;
  pnlPercent?: string;
  realizedPnl: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

interface PositionsListProps {
  onPositionClick?: (position: Position) => void;
}

export default function PositionsList({ onPositionClick }: PositionsListProps) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.userId) {
      fetchPositions();
    }
  }, [user?.userId]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, return empty array since we're removing Drift
      // In a real implementation, this would fetch from our API
      setPositions([]);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:warning" className="mx-auto mb-2 text-error" width={32} />
          <p className="text-sm text-error">{error}</p>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:chart-line" className="mx-auto mb-2 text-muted" width={32} />
          <p className="text-sm text-muted">No positions found</p>
          <p className="text-xs text-muted mt-1">Start trading to see your positions here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {positions.map((position) => (
        <div
          key={position.id}
          onClick={() => onPositionClick?.(position)}
          className="p-4 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg cursor-pointer hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-dark dark:text-white">
                {position.baseAsset}/{position.quoteAsset}
              </span>
              <span className={`px-2 py-1 text-xs rounded ${
                position.status === 'OPEN' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-muted/20 text-muted'
              }`}>
                {position.status}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-dark dark:text-white">
                {parseFloat(position.quantity).toFixed(4)} {position.baseAsset}
              </div>
              <div className="text-xs text-muted">
                @ ${parseFloat(position.entryPrice).toFixed(4)}
              </div>
            </div>
          </div>
          
          {position.unrealizedPnl && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Unrealized PnL</span>
              <span className={`font-semibold ${
                parseFloat(position.unrealizedPnl) >= 0 ? 'text-success' : 'text-error'
              }`}>
                {parseFloat(position.unrealizedPnl) >= 0 ? '+' : ''}
                ${parseFloat(position.unrealizedPnl).toFixed(2)}
                {position.pnlPercent && (
                  <span className="ml-1">
                    ({parseFloat(position.pnlPercent) >= 0 ? '+' : ''}
                    {parseFloat(position.pnlPercent).toFixed(2)}%)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}