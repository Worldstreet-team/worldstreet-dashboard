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
  const { fetchPositions, fetchAccountSummary } = useDriftTrading();
  
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);
    setError(null);

    try {
      const marketIndex = markets.findIndex(m => m.id === selectedMarket.id);
      
      const response = await fetch('/api/drift/position/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketIndex: marketIndex >= 0 ? marketIndex : 0,
          direction: side,
          baseAmount: parseFloat(size),
          leverage,
          orderType,
          price: limitPrice ? parseFloat(limitPrice) : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(`Position opened! TX: ${result.txSignature?.slice(0, 8)}...`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setSize('');
          setLimitPrice('');
          setSuccessMessage('');
        }, 2000);
      } else {
        setError(result.message || 'Failed to open position');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = selectedMarket && 
    size && 
    parseFloat(size) > 0 && 
    previewData &&
    previewData.marginCheckPassed &&
    !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:w-[500px] bg-white dark:bg-darkgray rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-darkgray border-b border-border dark:border-darkborder px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Open {side === 'long' ? 'Long' : 'Short'} Position
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon icon="ph:x" width={20} className="text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Market Info */}
          <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3">
            <div className="text-sm text-muted mb-1">Market</div>
            <div className="text-lg font-semibold text-dark dark:text-white">
              {selectedMarket?.symbol || 'Select Market'}
            </div>
            <div className="text-sm text-muted mt-1">
              Mark Price: ${(Number(selectedMarket?.markPrice) || 0).toFixed(2)}
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-dark dark:text-white mb-2">Order Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  orderType === 'market'
                    ? 'bg-primary text-white'
                    : 'bg-muted/20 dark:bg-white/5 text-dark dark:text-white'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  orderType === 'limit'
                    ? 'bg-primary text-white'
                    : 'bg-muted/20 dark:bg-white/5 text-dark dark:text-white'
                }`}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm font-medium text-dark dark:text-white mb-2">Limit Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Size Input */}
          <div>
            <label className="block text-sm font-medium text-dark dark:text-white mb-2">Size</label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-dark dark:text-white">Leverage</label>
              <span className="text-sm font-semibold text-primary">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max={previewData?.maxLeverageAllowed || 20}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>1x</span>
              <span>{previewData?.maxLeverageAllowed || 20}x</span>
            </div>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="bg-muted/20 dark:bg-white/5 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Base Margin:</span>
                <span className="font-medium text-dark dark:text-white">
                  ${(Number(previewData?.requiredMargin) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Trading Fee:</span>
                <span className="font-medium text-dark dark:text-white">
                  ${(Number(previewData?.estimatedFee) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-border dark:border-darkborder pt-2">
                <span className="font-semibold text-dark dark:text-white">Total Required:</span>
                <span className="font-semibold text-dark dark:text-white">
                  ${(Number(previewData?.totalRequired) || 0).toFixed(2)}
                </span>
              </div>
              <div className={`flex justify-between text-sm ${
                previewData?.marginCheckPassed ? 'text-success' : 'text-error'
              }`}>
                <span>Your Available:</span>
                <span className="font-medium">
                  ${(Number(previewData?.freeCollateral) || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border dark:border-darkborder pt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted">
                  <span>Est. Liquidation:</span>
                  <span className="text-error">
                    ${(Number(previewData?.estimatedLiquidationPrice) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
              <Icon icon="ph:check-circle" className="text-success" height={20} />
              <span className="text-sm text-success">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon icon="ph:warning" className="text-error" height={20} />
              <span className="text-sm text-error">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              canSubmit
                ? side === 'long'
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-error hover:bg-error/90 text-white'
                : 'bg-muted/30 dark:bg-white/10 text-muted cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="ph:spinner" className="animate-spin" height={18} />
                Opening...
              </span>
            ) : (
              `Open ${side === 'long' ? 'Long' : 'Short'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
