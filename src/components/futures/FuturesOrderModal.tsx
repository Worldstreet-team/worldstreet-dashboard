"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore, OrderSide, OrderType } from '@/store/futuresStore';
import { useDebounce } from '@/hooks/useFuturesPolling';
import { useDrift } from '@/app/context/driftContext';

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
  const { selectedMarket, markets } = useFuturesStore();
  const { openPosition, isLoading: driftLoading, previewTrade } = useDrift();

  const [previewData, setPreviewData] = useState<any>(null);

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
        const marketIndex = markets.findIndex(m => m.id === selectedMarket.id);
        if (marketIndex < 0) {
          throw new Error('Market not found');
        }

        const preview = await previewTrade(
          marketIndex,
          side,
          parseFloat(debouncedSize),
          leverage
        );

        setPreviewData(preview);
        setError(null);
      } catch (error) {
        console.error('Preview error:', error);
        setPreviewData(null);
        const errorMessage = error instanceof Error ? error.message : 'Failed to calculate preview';
        if (errorMessage.includes('subscribe') || errorMessage.includes('not authenticated')) {
          setError('Please unlock your wallet to preview trades');
        } else {
          setError(errorMessage);
        }
      }
    };

    fetchPreview();
  }, [selectedMarket, debouncedSize, leverage, side, markets, previewTrade]);

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
        leverage
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
    !previewData.sizeTooSmall &&
    !driftLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full md:w-[500px] bg-[#181a20] rounded-t-2xl md:rounded-2xl shadow-2xl border border-[#2b3139] max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-[#181a20] border-b border-[#2b3139] px-6 py-4 flex items-center justify-between z-10 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white">
            Open {side === 'long' ? 'Long' : 'Short'} Position
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2b3139] active:bg-[#2b3139]/80 rounded-xl transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center touch-feedback"
          >
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
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
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Order Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 min-h-[44px] touch-feedback ${orderType === 'market'
                  ? 'bg-[#fcd535] text-[#181a20] shadow-lg shadow-[#fcd535]/20'
                  : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
                  }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 min-h-[44px] touch-feedback ${orderType === 'limit'
                  ? 'bg-[#fcd535] text-[#181a20] shadow-lg shadow-[#fcd535]/20'
                  : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
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
              <div className={`flex justify-between text-sm ${previewData?.marginCheckPassed ? 'text-success' : 'text-error'
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
                {previewData.sizeTooSmall && (
                  <div className="flex justify-between text-xs text-error animate-pulse">
                    <span className="font-bold">Min Order Size:</span>
                    <span className="font-bold font-mono">{previewData.minOrderSize} {selectedMarket?.symbol?.split('-')[0]}</span>
                  </div>
                )}
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
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 min-h-[56px] touch-feedback ${canSubmit
              ? side === 'long'
                ? 'bg-gradient-to-br from-[#0ecb81] to-[#0ecb81]/80 hover:from-[#0ecb81]/90 hover:to-[#0ecb81]/70 text-white shadow-lg shadow-[#0ecb81]/20 hover:shadow-xl hover:shadow-[#0ecb81]/30'
                : 'bg-gradient-to-br from-[#f6465d] to-[#f6465d]/80 hover:from-[#f6465d]/90 hover:to-[#f6465d]/70 text-white shadow-lg shadow-[#f6465d]/20 hover:shadow-xl hover:shadow-[#f6465d]/30'
              : 'bg-[#2b3139] text-[#848e9c] cursor-not-allowed'
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
