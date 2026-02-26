'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface TPSLModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    symbol: string;
    entryPrice: string;
    baseAsset: string;
    quoteAsset: string;
  };
  onSuccess: () => void;
}

interface TPSLData {
  take_profit_price: string | null;
  stop_loss_price: string | null;
  status: string;
}

export default function TPSLModal({ isOpen, onClose, position, onSuccess }: TPSLModalProps) {
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTPSL, setExistingTPSL] = useState<TPSLData | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchExistingTPSL();
    }
  }, [isOpen, position.id]);

  const fetchExistingTPSL = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(`/api/positions/${position.id}/tpsl`);
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setExistingTPSL(data.data);
          setTakeProfitPrice(data.data.take_profit_price || '');
          setStopLossPrice(data.data.stop_loss_price || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch TP/SL:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!takeProfitPrice && !stopLossPrice) {
      setError('Please enter at least one price (Take Profit or Stop Loss)');
      return;
    }

    const entryPriceNum = parseFloat(position.entryPrice);
    const tpNum = takeProfitPrice ? parseFloat(takeProfitPrice) : null;
    const slNum = stopLossPrice ? parseFloat(stopLossPrice) : null;

    if (tpNum && tpNum <= entryPriceNum) {
      setError('Take Profit price must be greater than entry price');
      return;
    }

    if (slNum && slNum >= entryPriceNum) {
      setError('Stop Loss price must be less than entry price');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions/${position.id}/tpsl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takeProfitPrice: tpNum || undefined,
          stopLossPrice: slNum || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set TP/SL');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel the TP/SL order?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions/${position.id}/tpsl`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel TP/SL');
      }

      setExistingTPSL(null);
      setTakeProfitPrice('');
      setStopLossPrice('');
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-black border border-border dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              Take Profit / Stop Loss
            </h3>
            <p className="text-sm text-muted mt-1">
              {position.symbol} • Entry: ${parseFloat(position.entryPrice).toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/30 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon icon="ph:x" className="text-muted" width={20} />
          </button>
        </div>

        {loadingData ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Take Profit */}
            <div>
              <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                Take Profit Price
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  placeholder={`> ${position.entryPrice}`}
                  className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  {position.quoteAsset}
                </div>
              </div>
              <p className="text-xs text-muted mt-1">
                Position will close automatically when price reaches this level
              </p>
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                Stop Loss Price
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  placeholder={`< ${position.entryPrice}`}
                  className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  {position.quoteAsset}
                </div>
              </div>
              <p className="text-xs text-muted mt-1">
                Position will close automatically to limit losses
              </p>
            </div>

            {/* Existing TP/SL Status */}
            {existingTPSL && existingTPSL.status === 'ACTIVE' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="ph:info" className="text-blue-500" width={16} />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Active TP/SL Order
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  {existingTPSL.take_profit_price && (
                    <p>Take Profit: ${parseFloat(existingTPSL.take_profit_price).toFixed(2)}</p>
                  )}
                  {existingTPSL.stop_loss_price && (
                    <p>Stop Loss: ${parseFloat(existingTPSL.stop_loss_price).toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2">
                <Icon icon="ph:warning-circle" className="text-error shrink-0 mt-0.5" width={16} />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              {existingTPSL && existingTPSL.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-error/10 hover:bg-error/20 text-error font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel TP/SL
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  existingTPSL ? 'Update TP/SL' : 'Set TP/SL'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
