'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Trade } from '@/hooks/useTrades';
import { useCloseTrade } from '@/hooks/useTrades';
import { useTradePnL } from '@/hooks/useTradePnL';

interface TradePositionProps {
  trade: Trade;
  onClose?: (trade: Trade) => void;
}

export default function TradePosition({ trade, onClose }: TradePositionProps) {
  const { closeTrade, loading: closing } = useCloseTrade();
  const { pnlData, isTracking, error: pnlError } = useTradePnL(trade);
  
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  const isOpen = trade.status === 'OPEN';
  const isBuy = trade.side === 'BUY';

  // Use unrealized PnL if tracking, otherwise use realized PnL
  const displayPnL = isOpen && pnlData 
    ? parseFloat(pnlData.pnl)
    : trade.pnl_realized 
    ? parseFloat(trade.pnl_realized)
    : 0;

  const displayPnLPercentage = isOpen && pnlData
    ? parseFloat(pnlData.pnlPercentage)
    : trade.pnl_percentage
    ? parseFloat(trade.pnl_percentage)
    : 0;

  const isProfitable = displayPnL > 0;
  const isLoss = displayPnL < 0;

  const handleCloseTrade = async () => {
    try {
      const closedTrade = await closeTrade({
        tradeId: trade.id,
        slippage: parseFloat(slippage) / 100
      });
      
      setShowCloseModal(false);
      
      if (onClose) {
        onClose(closedTrade);
      }
    } catch (err) {
      console.error('Failed to close trade:', err);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isBuy ? 'bg-success/10' : 'bg-error/10'
            }`}>
              <Icon 
                icon={isBuy ? 'ph:arrow-up-bold' : 'ph:arrow-down-bold'} 
                className={isBuy ? 'text-success' : 'text-error'} 
                width={20} 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-dark dark:text-white">
                  {trade.token_in}/{trade.token_out}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isBuy 
                    ? 'bg-success/10 text-success' 
                    : 'bg-error/10 text-error'
                }`}>
                  {trade.side}
                </span>
              </div>
              <p className="text-xs text-muted">{trade.chain}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isTracking && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Live</span>
              </div>
            )}
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              isOpen
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/30 text-muted'
            }`}>
              {trade.status}
            </span>
          </div>
        </div>

        {/* PnL Display */}
        <div className="mb-4 p-4 bg-muted/30 dark:bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">
              {isOpen ? 'Unrealized PnL' : 'Realized PnL'}
            </span>
            {pnlError && (
              <span className="text-xs text-error">{pnlError}</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${
              isProfitable ? 'text-success' : isLoss ? 'text-error' : 'text-muted'
            }`}>
              {displayPnL >= 0 ? '+' : ''}{displayPnL.toFixed(6)} {trade.token_in}
            </span>
            <span className={`text-lg font-semibold ${
              isProfitable ? 'text-success' : isLoss ? 'text-error' : 'text-muted'
            }`}>
              ({displayPnL >= 0 ? '+' : ''}{displayPnLPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Trade Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Entry Price:</span>
            <span className="text-dark dark:text-white font-medium">
              {parseFloat(trade.entry_price).toFixed(6)}
            </span>
          </div>

          {isOpen && pnlData && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current Price:</span>
              <span className="text-dark dark:text-white font-medium">
                {parseFloat(pnlData.currentPrice).toFixed(6)}
              </span>
            </div>
          )}

          {!isOpen && trade.exit_price && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Exit Price:</span>
              <span className="text-dark dark:text-white font-medium">
                {parseFloat(trade.exit_price).toFixed(6)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">Amount:</span>
            <span className="text-dark dark:text-white font-medium">
              {(parseFloat(trade.amount_in) / Math.pow(10, 18)).toFixed(6)} {trade.token_in}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted">Opened:</span>
            <span className="text-dark dark:text-white font-medium">
              {new Date(trade.opened_at).toLocaleString()}
            </span>
          </div>

          {!isOpen && trade.closed_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Closed:</span>
              <span className="text-dark dark:text-white font-medium">
                {new Date(trade.closed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Close Button */}
        {isOpen && (
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={closing}
            className="w-full py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {closing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Closing Position...
              </>
            ) : (
              <>
                <Icon icon="ph:x-circle" width={20} />
                Close Position
              </>
            )}
          </button>
        )}
      </div>

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !closing && setShowCloseModal(false)} 
          />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
              Close Position
            </h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to close this {trade.side} position for {trade.token_in}/{trade.token_out}?
            </p>

            {/* Current PnL */}
            {pnlData && (
              <div className="mb-4 p-4 bg-muted/30 dark:bg-white/5 rounded-xl">
                <p className="text-xs text-muted mb-1">Current Unrealized PnL</p>
                <p className={`text-xl font-bold ${
                  isProfitable ? 'text-success' : isLoss ? 'text-error' : 'text-muted'
                }`}>
                  {displayPnL >= 0 ? '+' : ''}{displayPnL.toFixed(6)} {trade.token_in}
                  <span className="text-sm ml-2">
                    ({displayPnL >= 0 ? '+' : ''}{displayPnLPercentage.toFixed(2)}%)
                  </span>
                </p>
              </div>
            )}

            {/* Slippage */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted mb-2">
                Slippage Tolerance (%)
              </label>
              <div className="flex gap-2">
                {['0.1', '0.5', '1.0'].map(val => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                      slippage === val
                        ? 'bg-primary text-white'
                        : 'bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <input
                  type="number"
                  step="0.1"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-20 px-2 py-2 bg-white dark:bg-darkgray border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={closing}
                className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTrade}
                disabled={closing}
                className="flex-1 py-3 px-4 bg-error hover:bg-error/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closing ? 'Closing...' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
