"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';
import { useDebounce } from '@/hooks/useFuturesPolling';

interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'long' | 'short';
  marketIndex: number;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen,
  onClose,
  side,
  marketIndex,
}) => {
  const { openPosition, isLoading: driftLoading, previewTrade, getMarketName, getMarketPrice, perpMarkets, summary } = useDrift();

  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showQuote, setShowQuote] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [executing, setExecuting] = useState(false);

  const debouncedSize = useDebounce(size, 300);

  // Get market info from Drift context
  const marketInfo = perpMarkets.get(marketIndex);
  const marketName = marketInfo?.symbol || getMarketName(marketIndex);
  const currentMarketPrice = getMarketPrice(marketIndex, 'perp');

  // Preview calculation with better error handling
  useEffect(() => {
    if (!marketIndex || !debouncedSize || parseFloat(debouncedSize) <= 0) {
      setPreviewData(null);
      setError(null);
      setIsLoadingPreview(false);
      return;
    }

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        console.log(`[FuturesOrderModal] Previewing trade for ${marketName} (index: ${marketIndex})`);

        const preview = await previewTrade(
          marketIndex,
          side,
          parseFloat(debouncedSize),
          leverage
        );

        setPreviewData(preview);
        setError(null);
      } catch (error) {
        console.error('[FuturesOrderModal] Preview error:', error);
        setPreviewData(null);
        const errorMessage = error instanceof Error ? error.message : 'Failed to calculate preview';
        
        // Don't show error for authentication issues - user just needs to unlock wallet
        if (errorMessage.includes('subscribe') || errorMessage.includes('not authenticated')) {
          setError('Please unlock your wallet to preview trades');
        } else if (errorMessage.includes('not initialized')) {
          setError('Please initialize your Drift account first');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [marketIndex, marketName, debouncedSize, leverage, side, previewTrade]);

  const handlePercentage = (percent: number) => {
    if (!summary || !previewData) return;
    
    const availableCollateral = summary.freeCollateral;
    const maxSize = (availableCollateral * leverage) / (previewData.entryPrice || 1);
    const calculatedSize = (maxSize * percent) / 100;
    
    setSize(calculatedSize.toFixed(6));
  };

  const handleGetQuote = () => {
    setError(null);
    setPinError('');

    if (!size || parseFloat(size) <= 0) {
      setError('Please enter a valid size');
      return;
    }

    if (!previewData || !previewData.marginCheckPassed) {
      setError('Insufficient margin for this position');
      return;
    }

    if (previewData.sizeTooSmall) {
      setError(`Order size too small. Minimum: ${previewData.minOrderSize} units`);
      return;
    }

    if ((orderType === 'limit' || orderType === 'stop-limit') && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid limit price');
      return;
    }

    if (orderType === 'stop-limit') {
      if (!triggerPrice || parseFloat(triggerPrice) <= 0) {
        setError('Please enter a valid trigger price');
        return;
      }

      const triggerPriceNum = parseFloat(triggerPrice);
      const limitPriceNum = parseFloat(limitPrice);
      const currentPrice = previewData?.entryPrice || currentMarketPrice;

      // Validate trigger price vs limit price
      if (side === 'long') {
        // For long stop-limit: trigger >= current market, limit >= trigger
        if (triggerPriceNum < currentPrice) {
          setError('Long stop-limit trigger price must be above current market price');
          return;
        }
        if (limitPriceNum < triggerPriceNum) {
          setError('Long stop-limit limit price must be at or above trigger price');
          return;
        }
      } else {
        // For short stop-limit: trigger <= current market, limit <= trigger
        if (triggerPriceNum > currentPrice) {
          setError('Short stop-limit trigger price must be below current market price');
          return;
        }
        if (limitPriceNum > triggerPriceNum) {
          setError('Short stop-limit limit price must be at or below trigger price');
          return;
        }
      }
    }

    setShowQuote(true);
  };

  const handleConfirmOrder = async () => {
    setPinError('');
    if (!pin) {
      setPinError('Please enter your PIN');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      console.log(`[FuturesOrderModal] Opening position for ${marketName} (marketIndex: ${marketIndex})`);

      const result = await openPosition(
        marketIndex,
        side,
        parseFloat(size),
        leverage,
        orderType,
        orderType !== 'market' ? parseFloat(limitPrice) : undefined,
        orderType === 'stop-limit' ? parseFloat(triggerPrice) : undefined
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to open position');
      }

      // Show immediate success with transaction processing message
      setSuccessMessage(`Transaction sent! Confirming on-chain... TX: ${result.txSignature?.slice(0, 8)}...`);

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
        setSize('');
        setLimitPrice('');
        setTriggerPrice('');
        setSuccessMessage('');
        setError(null);
        setShowQuote(false);
        setPin('');
      }, 3000);
    } catch (error) {
      console.error('Submit error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to open position';
      setError(errorMsg);
      setPinError(errorMsg);
    } finally {
      setExecuting(false);
    }
  };

  const handleBackToForm = () => {
    setShowQuote(false);
    setPin('');
    setPinError('');
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSize('');
      setLimitPrice('');
      setTriggerPrice('');
      setLeverage(1);
      setOrderType('market');
      setError(null);
      setSuccessMessage('');
      setPreviewData(null);
      setIsLoadingPreview(false);
      setShowQuote(false);
      setPin('');
      setPinError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canContinue = size &&
    parseFloat(size) > 0 &&
    previewData &&
    previewData.marginCheckPassed &&
    !previewData.sizeTooSmall;

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
          {!showQuote ? (
            <>
              {/* Market Info */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
                <div className="text-xs font-semibold text-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Market</div>
                <div className="text-xl font-bold text-dark dark:text-white">
                  {marketName || 'Select Market'}
                </div>
                <div className="text-sm text-muted dark:text-gray-400 mt-2">
                  Mark Price: <span className="font-semibold text-dark dark:text-white">${(Number(previewData?.entryPrice) || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Available Balance */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#848e9c]">Available</span>
                <span className="text-white font-mono">
                  ${(summary?.freeCollateral || 0).toFixed(2)} USDC
                </span>
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
                  <button
                    onClick={() => setOrderType('stop-limit')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 min-h-[44px] touch-feedback ${orderType === 'stop-limit'
                      ? 'bg-[#fcd535] text-[#181a20] shadow-lg shadow-[#fcd535]/20'
                      : 'bg-[#2b3139] text-white hover:bg-[#2b3139]/80'
                      }`}
                  >
                    Stop-Limit
                  </button>
                </div>
              </div>

              {/* Limit Price */}
              {(orderType === 'limit' || orderType === 'stop-limit') && (
                <div>
                  <label className="block text-sm font-bold text-dark dark:text-white mb-2 uppercase tracking-wide">
                    {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
                  </label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              )}

              {/* Trigger Price (Stop-Limit Only) */}
              {orderType === 'stop-limit' && (
                <div>
                  <label className="block text-sm font-bold text-dark dark:text-white mb-2 uppercase tracking-wide">Trigger Price</label>
                  <input
                    type="number"
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <p className="text-xs text-[#848e9c] mt-1">
                    {side === 'long' 
                      ? 'Order triggers when price rises above this level'
                      : 'Order triggers when price falls below this level'}
                  </p>
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

              {/* Percentage Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent)}
                    className="py-2 bg-[#2b3139] hover:bg-[#2b3139]/80 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
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
              {isLoadingPreview && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl p-4 border border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted dark:text-gray-400">
                    <Icon icon="ph:circle-notch" className="animate-spin" width={16} />
                    <span>Calculating preview...</span>
                  </div>
                </div>
              )}
              
              {!isLoadingPreview && previewData && (
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
                        <span className="font-bold font-mono">{previewData.minOrderSize} {marketInfo?.baseAssetSymbol || 'units'}</span>
                      </div>
                    )}
                  </div>
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
            </>
          ) : (
            <>
              {/* PIN Input */}
              <div className="space-y-3">
                <label className="block text-sm text-[#848e9c] font-medium">
                  Enter PIN to confirm trade
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Enter your PIN"
                    maxLength={6}
                    disabled={executing}
                    className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] hover:text-white transition-colors"
                  >
                    <Icon icon={showPin ? 'ph:eye-slash' : 'ph:eye'} width={20} />
                  </button>
                </div>
                {pinError && (
                  <p className="text-xs text-[#f6465d]">{pinError}</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-sm text-[#f6465d]">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3">
                  <Icon icon="ph:check-circle" className="text-success flex-shrink-0" height={24} />
                  <span className="text-sm font-semibold text-success">{successMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2b3139] safe-area-bottom space-y-2">
          {!showQuote ? (
            <button
              onClick={handleGetQuote}
              disabled={!canContinue}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 min-h-[56px] touch-feedback ${canContinue
                ? side === 'long'
                  ? 'bg-gradient-to-br from-[#0ecb81] to-[#0ecb81]/80 hover:from-[#0ecb81]/90 hover:to-[#0ecb81]/70 text-white shadow-lg shadow-[#0ecb81]/20 hover:shadow-xl hover:shadow-[#0ecb81]/30'
                  : 'bg-gradient-to-br from-[#f6465d] to-[#f6465d]/80 hover:from-[#f6465d]/90 hover:to-[#f6465d]/70 text-white shadow-lg shadow-[#f6465d]/20 hover:shadow-xl hover:shadow-[#f6465d]/30'
                : 'bg-[#2b3139] text-[#848e9c] cursor-not-allowed'
                }`}
            >
              Continue
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirmOrder}
                disabled={executing || !pin}
                className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${side === 'long'
                  ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                  : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                  }`}
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                    Executing...
                  </span>
                ) : (
                  `Confirm ${side === 'long' ? 'Long' : 'Short'}`
                )}
              </button>

              <button
                onClick={handleBackToForm}
                disabled={executing}
                className="w-full py-3 rounded-lg font-semibold text-base bg-[#2b3139] hover:bg-[#2b3139]/80 text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
