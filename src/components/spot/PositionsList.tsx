'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useDrift } from '@/app/context/driftContext';
import TPSLModal from './TPSLModal';

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

interface TPSLOrder {
  take_profit_price: string | null;
  stop_loss_price: string | null;
  status: string;
}

interface PositionsListProps {
  selectedChartSymbol?: string;
  onPositionTPSLUpdate?: (symbol: string, tp: string | null, sl: string | null) => void;
  showTPSLLines?: boolean;
  onToggleTPSLLines?: () => void;
}

export default function PositionsList({
  selectedChartSymbol,
  onPositionTPSLUpdate,
  showTPSLLines = true,
  onToggleTPSLLines
}: PositionsListProps = {}) {
  const { user } = useAuth();
  const { spotPositions: driftSpotPositions, isLoading: loadingDrift } = useDrift();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null);
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null);
  const [tpslModalOpen, setTpslModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [tpslOrders, setTpslOrders] = useState<Record<string, TPSLOrder>>({});

  const fetchPositions = async () => {
    if (!user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions?status=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      const data = await response.json();
      let positionsArray: Position[] = Array.isArray(data) ? data : data.positions || [];

      // Combine with Drift spot positions
      if (activeTab === 'OPEN' && driftSpotPositions) {
        driftSpotPositions.forEach(p => {
          if (p.marketIndex !== 0 && (p.amount > 0.000001 || p.balanceType === 'borrow')) {
            positionsArray.push({
              id: `drift-spot-${p.marketIndex}`,
              userId: user.userId,
              symbol: p.marketName,
              baseAsset: p.marketName.split('/')[0],
              quoteAsset: 'USDC',
              quantity: p.amount.toString(),
              entryPrice: p.price.toString(),
              currentPrice: p.price.toString(),
              investedQuote: p.value.toString(),
              unrealizedPnl: '0',
              pnlPercent: '0',
              realizedPnl: '0',
              status: 'OPEN',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
      }

      setPositions(positionsArray);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [user, activeTab, driftSpotPositions]);

  const fetchTPSLOrders = async () => {
    const orders: Record<string, TPSLOrder> = {};
    await Promise.all(
      positions.map(async (position) => {
        if (position.id.startsWith('drift-spot-')) return;
        try {
          const response = await fetch(`/api/positions/${position.id}/tpsl`);
          if (response.ok) {
            const data = await response.json();
            if (data.data) orders[position.id] = data.data;
          }
        } catch (err) {
          console.error(`Failed to fetch TP/SL for ${position.id}:`, err);
        }
      })
    );
    setTpslOrders(orders);
  };

  useEffect(() => {
    if (activeTab === 'OPEN' && positions.length > 0) {
      fetchTPSLOrders();
    }
  }, [positions, activeTab]);

  const handleOpenTPSL = (position: Position) => {
    if (position.id.startsWith('drift-spot-')) {
      setError('TP/SL is not currently supported for Drift spot holdings via this panel.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSelectedPosition(position);
    setTpslModalOpen(true);
  };

  const handleTPSLSuccess = () => {
    setCloseSuccess('TP/SL updated successfully');
    fetchTPSLOrders();
    setTimeout(() => setCloseSuccess(null), 5000);
  };

  const handleClosePosition = async (positionId: string) => {
    if (positionId.startsWith('drift-spot-')) {
      setError('Please sell your holdings in the Order Form.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!confirm('Are you sure you want to close this position?')) return;

    setClosingPositionId(positionId);
    try {
      const response = await fetch(`/api/positions/${positionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slippage: 0.005 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to close position');
      setCloseSuccess(data.message);
      await fetchPositions();
      setTimeout(() => setCloseSuccess(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClosingPositionId(null);
    }
  };

  const formatNumber = (value: string | undefined, decimals: number = 6): string => {
    if (!value) return '0.00';
    return parseFloat(value).toFixed(decimals);
  };

  if (loading && positions.length === 0) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="bg-[#181a20] rounded-b-lg border-t border-[#2b3139] overflow-hidden">
      {error && (
        <div className="p-4 bg-error/10 border-b border-error/30">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {closeSuccess && (
        <div className="p-4 bg-success/10 border-b border-success/30">
          <p className="text-sm text-success">{closeSuccess}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        {positions.length === 0 ? (
          <div className="p-8 text-center text-[#848e9c]">
            <p className="text-sm">No {activeTab.toLowerCase()} positions</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[#2b3139]">
              <tr>
                <th className="px-4 py-2 text-left text-[#848e9c]">Symbol</th>
                <th className="px-4 py-2 text-right text-[#848e9c]">Quantity</th>
                <th className="px-4 py-2 text-right text-[#848e9c]">Price</th>
                <th className="px-4 py-2 text-right text-[#848e9c]">PnL</th>
                <th className="px-4 py-2 text-center text-[#848e9c]">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const pnl = parseFloat(position.unrealizedPnl || '0');
                return (
                  <tr key={position.id} className="border-b border-[#2b3139] hover:bg-[#2b3139]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{position.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatNumber(position.quantity, 4)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      ${formatNumber(position.currentPrice || position.entryPrice, 2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${pnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleClosePosition(position.id)}
                        className="text-[#f6465d] hover:text-[#f6465d]/80 transition-colors"
                      >
                        {position.id.startsWith('drift-spot-') ? 'Sell' : 'Close'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
