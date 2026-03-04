"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore, OrderSide, OrderType } from '@/store/futuresStore';
import { useDebounce } from '@/hooks/useFuturesPolling';
import { useDriftTrading } from '@/hooks/useDriftTrading';

interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: OrderSide;
  onSuccess?: () => void;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen,
  onClose,
  side,
  onSuccess,
}) => {
  const { selectedMarket, selectedChain, setPreviewData, previewData, markets } = useFuturesStore();
  const { openPosition, loading: driftLoading } = useDriftTrading();
  
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const debouncedSize = useDebounce(size, 300);
  const debouncedLimitPrice = useDebounce(limitPrice, 300);

  // Preview calculation
  useEffect(() => {
    if (!selectedMarket || !debouncedSize || parseFloat(debouncedSize) <= 0) {
      setPreviewData(null);
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch('/api/futures/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: selectedChain,
            market: selectedMarket.symbol,
            side,
            size: parseFloat(debouncedSize),
            leverage,
            orderType,
            limitPrice: debouncedLimitPrice ? parseFloat(debouncedLimitPrice) : undefined,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setPreviewData(data);
          setError(null);
        } else {
          setPreviewData(null);
          setError(data.message || 'Failed to calculate preview');
        }
      } catch (error) {
        console.error('Preview error:', error);
        setPreviewData(null);
        setError('Failed to calculate preview');
      }
    };

    fetchPreview();
  }, [selectedMarket, debouncedSize, leverage, side, orderType, debouncedLimitPrice, selectedChain, setPreviewData]);

  const handleSubmit = async () => {
    if (!selectedMarket || !size || !previewData || !previewData.marginCheckPassed) return;

    setError(null);

    try {
      const marketIndex = markets.findIndex(m => m.id === selectedMarket.id);
      
      // Use the hook instead of direct API call
      const result = await openPosition(
        marketIndex >= 0 ? marketIndex : 0,
        side,
        parseFloat(size),
        leverage,
        orderType,
        limitPrice ? parseFloat(limitPrice) : undefined
      );

      setSuccessMessage(`Position opened! TX: ${result.txSignature?.slice(0, 8)}...`);
      
      // Close modal after success
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSize('');
        setLimitPrice('');
        setSuccessMessage('');
        setError(null);
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
      setError(error instanceof Error ? error.message : 'Failed to open position');
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSize('');
      setLimitPrice('');
      setLeverage(1);
      setOrderType('market');
      setError(null);
      setSuccessMessage('');
      setPreviewData(null);
    }
  }, [isOpen, setPreviewData]);

  if (!isOpen) return null;

  const canSubmit = selectedMarket && 
    size && 
    parseFloat(size) > 0 && 
    previewData &&
    previewData.marginCheckPassed &&
    !driftLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:w-[500px] bg-white dark:bg-[#0d0d0d] rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#0d0d0d] border-b border-gray-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-dark dark:text-white">
            Open {side === 'long' ? 'Long' : 'Short'} Position
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-200"
          >
            <Icon icon="ph:x" width={20} className="text-muted dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Market Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
            <div className="text-xs font-semibold text-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Market</div>
            <div className="text-xl font-bold text-dark dark:text-white">
              {selectedMarket?.symbol || 'Select Market'}
            </div>
            <div className="text-sm text-muted dark:text-gray-400 mt-2">
              Mark Price: <span className="font-semibold text-dark dark:text-white">${(Number(selectedMarket?.markPrice) || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-bold text-dark dark:text-white mb-2 uppercase tracking-wide">Order Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  orderType === 'market'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-gray-100 dark:bg-white/5 text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  orderType === 'limit'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-gray-100 dark:bg-white/5 text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm font-bold text-dark dark:text-white mb-2 uppercase tracking-wide">Limit Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
          )}

          {/* Size Input */}
          <div>
            <label className="block text-sm font-bold text-dark dark:text-white mb-2 uppercase tracking-wide">Size</label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">Leverage</label>
              <span className="text-lg font-bold text-primary">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max={previewData?.maxLeverageAllowed || 20}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted dark:text-gray-400 mt-2 font-semibold">
              <span>1x</span>
              <span>{previewData?.maxLeverageAllowed || 20}x</span>
            </div>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted dark:text-gray-400">Base Margin:</span>
                <span className="font-bold text-dark dark:text-white font-mono">
                  ${(Number(previewData?.requiredMargin) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted dark:text-gray-400">Trading Fee:</span>
                <span className="font-bold text-dark dark:text-white font-mono">
                  ${(Number(previewData?.estimatedFee) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-white/10 pt-3">
                <span className="font-bold text-dark dark:text-white">Total Required:</span>
                <span className="font-bold text-dark dark:text-white font-mono">
                  ${(Number(previewData?.totalRequired) || 0).toFixed(2)}
                </span>
              </div>
              <div className={`flex justify-between text-sm ${
                previewData?.marginCheckPassed ? 'text-success' : 'text-error'
              }`}>
                <span className="font-semibold">Your Available:</span>
                <span className="font-bold font-mono">
                  ${(Number(previewData?.freeCollateral) || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-white/10 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted dark:text-gray-400">
                  <span>Est. Liquidation:</span>
                  <span className="text-error font-bold font-mono">
                    ${(Number(previewData?.estimatedLiquidationPrice) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3">
              <Icon icon="ph:check-circle" className="text-success flex-shrink-0" height={24} />
              <span className="text-sm font-semibold text-success">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
              <Icon icon="ph:warning" className="text-error flex-shrink-0 mt-0.5" height={24} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              canSubmit
                ? side === 'long'
                  ? 'bg-gradient-to-br from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30 hover:-translate-y-0.5'
                  : 'bg-gradient-to-br from-error to-error/80 hover:from-error/90 hover:to-error/70 text-white shadow-lg shadow-error/20 hover:shadow-xl hover:shadow-error/30 hover:-translate-y-0.5'
                : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {driftLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="svg-spinners:ring-resize" height={20} />
                Opening Position...
              </span>
            ) : (
              `Open ${side === 'long' ? 'Long' : 'Short'} Position`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
