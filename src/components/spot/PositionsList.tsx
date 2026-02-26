'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
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
}

export default function PositionsList({ selectedChartSymbol, onPositionTPSLUpdate }: PositionsListProps = {}) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null);
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null);
  const [tpslModalOpen, setTpslModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [tpslOrders, setTpslOrders] = useState<Record<string, TPSLOrder>>({});

  useEffect(() => {
    fetchPositions();
  }, [user, activeTab]);

  useEffect(() => {
    if (activeTab === 'OPEN' && positions.length > 0) {
      fetchTPSLOrders();
    }
  }, [positions, activeTab]);

  const fetchPositions = async () => {
    if (!user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions?status=${activeTab}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      console.log('Positions API response:', data);
      
      const positionsArray = Array.isArray(data) ? data : data.positions || [];
      setPositions(positionsArray);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTPSLOrders = async () => {
    const orders: Record<string, TPSLOrder> = {};
    
    await Promise.all(
      positions.map(async (position) => {
        try {
          const response = await fetch(`/api/positions/${position.id}/tpsl`);
          if (response.ok) {
            const data = await response.json();
            if (data.data) {
              orders[position.id] = data.data;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch TP/SL for ${position.id}:`, err);
        }
      })
    );

    setTpslOrders(orders);

    // Notify parent about TP/SL for the selected chart symbol
    if (onPositionTPSLUpdate && selectedChartSymbol) {
      const matchingPosition = positions.find(p => p.symbol === selectedChartSymbol);
      if (matchingPosition && orders[matchingPosition.id]) {
        const tpsl = orders[matchingPosition.id];
        onPositionTPSLUpdate(
          matchingPosition.symbol,
          tpsl.take_profit_price,
          tpsl.stop_loss_price
        );
      } else if (matchingPosition) {
        // Clear TP/SL if no order exists
        onPositionTPSLUpdate(matchingPosition.symbol, null, null);
      }
    }
  };

  const handleOpenTPSL = (position: Position) => {
    setSelectedPosition(position);
    setTpslModalOpen(true);
  };

  const handleTPSLSuccess = () => {
    setCloseSuccess('TP/SL updated successfully');
    fetchTPSLOrders();
    setTimeout(() => setCloseSuccess(null), 5000);
  };

  // Notify parent when selected chart symbol changes
  useEffect(() => {
    if (onPositionTPSLUpdate && selectedChartSymbol && positions.length > 0) {
      const matchingPosition = positions.find(p => p.symbol === selectedChartSymbol);
      if (matchingPosition && tpslOrders[matchingPosition.id]) {
        const tpsl = tpslOrders[matchingPosition.id];
        onPositionTPSLUpdate(
          matchingPosition.symbol,
          tpsl.take_profit_price,
          tpsl.stop_loss_price
        );
      }
    }
  }, [selectedChartSymbol, positions, tpslOrders, onPositionTPSLUpdate]);

  const handleClosePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to close this position? This will sell your assets at the current market price.')) {
      return;
    }

    setClosingPositionId(positionId);
    setError(null);
    setCloseSuccess(null);

    try {
      const response = await fetch(`/api/positions/${positionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slippage: 0.005, // 0.5% slippage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close position');
      }

      setCloseSuccess(data.message);
      
      // Refresh positions after successful close
      await fetchPositions();

      // Clear success message after 5 seconds
      setTimeout(() => setCloseSuccess(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClosingPositionId(null);
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

  const formatNumber = (value: string | undefined, decimals: number = 6): string => {
    if (!value) return '0.00';
    return parseFloat(value).toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 dark:border-darkborder">
          <div className="flex items-center gap-2">
            <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Positions</h3>
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
            <Icon icon="ph:chart-line-up" className="text-primary" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Positions</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-muted/30 dark:bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('OPEN')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === 'OPEN'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-dark dark:hover:text-white'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setActiveTab('CLOSED')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === 'CLOSED'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-dark dark:hover:text-white'
                }`}
              >
                Closed
              </button>
            </div>
            <button
              onClick={fetchPositions}
              className="p-1.5 hover:bg-muted/30 dark:hover:bg-white/5 rounded-lg transition-colors"
              title="Refresh"
            >
              <Icon icon="ph:arrow-clockwise" className="text-muted" width={18} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border-b border-error/30">
          <div className="flex items-center gap-2">
            <Icon icon="ph:warning-circle" className="text-error" width={18} />
            <p className="text-sm text-error">{error}</p>
          </div>
        </div>
      )}

      {closeSuccess && (
        <div className="p-4 bg-success/10 border-b border-success/30">
          <div className="flex items-center gap-2">
            <Icon icon="ph:check-circle" className="text-success" width={18} />
            <p className="text-sm text-success">{closeSuccess}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {positions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Icon icon="ph:chart-line-up" className="text-muted" width={32} />
            </div>
            <p className="text-muted text-sm">No {activeTab.toLowerCase()} positions</p>
            <p className="text-muted text-xs mt-1">
              {activeTab === 'OPEN' 
                ? 'Your open positions will appear here' 
                : 'Your closed positions will appear here'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Symbol</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Entry Price</th>
                {activeTab === 'OPEN' && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Current Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Unrealized PnL</th>
                  </>
                )}
                {activeTab === 'CLOSED' && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Realized PnL</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">
                  {activeTab === 'OPEN' ? 'Opened' : 'Closed'}
                </th>
                {activeTab === 'OPEN' && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const pnl = activeTab === 'OPEN' 
                  ? parseFloat(position.unrealizedPnl || '0')
                  : parseFloat(position.realizedPnl || '0');
                const pnlPercent = parseFloat(position.pnlPercent || '0');
                const isProfitable = pnl >= 0;
                
                return (
                  <tr
                    key={position.id}
                    className="border-b border-border/50 dark:border-darkborder hover:bg-muted/20 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-semibold text-dark dark:text-white">
                          {position.symbol}
                        </span>
                        <div className="text-xs text-muted">
                          {position.baseAsset}/{position.quoteAsset}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-dark dark:text-white font-mono">
                        {formatNumber(position.quantity, 6)}
                      </div>
                      <div className="text-xs text-muted">{position.baseAsset}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-dark dark:text-white font-mono">
                        ${formatNumber(position.entryPrice, 2)}
                      </div>
                    </td>
                    {activeTab === 'OPEN' && (
                      <>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-dark dark:text-white font-mono">
                            ${formatNumber(position.currentPrice, 2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-semibold font-mono ${
                            isProfitable ? 'text-success' : 'text-error'
                          }`}>
                            {isProfitable ? '+' : ''}{formatNumber(position.unrealizedPnl, 2)} {position.quoteAsset}
                          </div>
                          <div className={`text-xs font-medium ${
                            isProfitable ? 'text-success' : 'text-error'
                          }`}>
                            {isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'CLOSED' && (
                      <td className="px-4 py-3 text-right">
                        <div className={`text-sm font-semibold font-mono ${
                          isProfitable ? 'text-success' : 'text-error'
                        }`}>
                          {isProfitable ? '+' : ''}{formatNumber(position.realizedPnl, 2)} {position.quoteAsset}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(activeTab === 'OPEN' ? position.createdAt : position.closedAt || position.updatedAt)}
                    </td>
                    {activeTab === 'OPEN' && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenTPSL(position)}
                            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                            title="Set Take Profit / Stop Loss"
                          >
                            <Icon icon="ph:target" width={14} />
                            {tpslOrders[position.id] ? 'TP/SL' : 'Set TP/SL'}
                            {tpslOrders[position.id] && (
                              <Icon icon="ph:check-circle" width={12} className="text-success" />
                            )}
                          </button>
                          <button
                            onClick={() => handleClosePosition(position.id)}
                            disabled={closingPositionId === position.id}
                            className="px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            title="Close position and sell assets"
                          >
                            {closingPositionId === position.id ? (
                              <>
                                <Icon icon="svg-spinners:ring-resize" width={14} />
                                Closing...
                              </>
                            ) : (
                              <>
                                <Icon icon="ph:x-circle" width={14} />
                                Close
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary for Open Positions */}
      {activeTab === 'OPEN' && positions.length > 0 && (
        <div className="p-4 border-t border-border/50 dark:border-darkborder bg-muted/20 dark:bg-white/5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total Unrealized PnL:</span>
            <span className={`font-semibold font-mono ${
              positions.reduce((sum, p) => sum + parseFloat(p.unrealizedPnl || '0'), 0) >= 0
                ? 'text-success'
                : 'text-error'
            }`}>
              {positions.reduce((sum, p) => sum + parseFloat(p.unrealizedPnl || '0'), 0) >= 0 ? '+' : ''}
              {positions.reduce((sum, p) => sum + parseFloat(p.unrealizedPnl || '0'), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* TP/SL Modal */}
      {selectedPosition && (
        <TPSLModal
          isOpen={tpslModalOpen}
          onClose={() => {
            setTpslModalOpen(false);
            setSelectedPosition(null);
          }}
          position={selectedPosition}
          onSuccess={handleTPSLSuccess}
        />
      )}
    </div>
  );
}
