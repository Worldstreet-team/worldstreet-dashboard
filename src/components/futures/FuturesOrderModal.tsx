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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Compact Bybit Style */}
      <div className="relative w-full max-w-[500px] bg-[#0b0e11] rounded-lg border border-[#1f2329] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f2329] flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-white">
              {side === 'long' ? 'Long' : 'Short'} {marketName}
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              side === 'long' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
            }`}>
              {side.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1f2329] rounded transition-colors"
          >
            <Icon icon="ph:x" width={16} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content - Scrollable without visible scrollbar */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {!showQuote ? (
            <>
              {/* Available Balance - Compact */}
              <div className="flex items-center justify-between text-[11px] mb-2 px-1">
                <span className="text-[#848e9c]">Available</span>
                <span className="text-white font-mono font-medium">
                  ${(summary?.freeCollateral || 0).toFixed(2)} USDC
                </span>
              </div>

              {/* Order Type Tabs - Compact */}
              <div className="flex gap-1 p-0.5 bg-[#1f2329] rounded mb-2">
                <button
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                    orderType === 'market'
                      ? 'bg-[#0b0e11] text-white'
                      : 'text-[#848e9c] hover:text-white'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                    orderType === 'limit'
                      ? 'bg-[#0b0e11] text-white'
                      : 'text-[#848e9c] hover:text-white'
                  }`}
                >
                  Limit
                </button>
                <button
                  onClick={() => setOrderType('stop-limit')}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                    orderType === 'stop-limit'
                      ? 'bg-[#0b0e11] text-white'
                      : 'text-[#848e9c] hover:text-white'
                  }`}
                >
                  Stop-Limit
                </button>
              </div>

              {/* Limit Price - Compact */}
              {(orderType === 'limit' || orderType === 'stop-limit') && (
                <div className="mb-2">
                  <label className="block text-[10px] text-[#848e9c] mb-1 uppercase font-medium">
                    {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 bg-[#1f2329] border border-[#1f2329] rounded text-[12px] text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848e9c]">
                      USDT
                    </span>
                  </div>
                </div>
              )}

              {/* Trigger Price - Compact */}
              {orderType === 'stop-limit' && (
                <div className="mb-2">
                  <label className="block text-[10px] text-[#848e9c] mb-1 uppercase font-medium">Trigger Price</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={triggerPrice}
                      onChange={(e) => setTriggerPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 bg-[#1f2329] border border-[#1f2329] rounded text-[12px] text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848e9c]">
                      USDT
                    </span>
                  </div>
                  <p className="text-[9px] text-[#848e9c] mt-0.5">
                    {side === 'long' 
                      ? 'Triggers when price rises above this level'
                      : 'Triggers when price falls below this level'}
                  </p>
                </div>
              )}

              {/* Size Input - Compact */}
              <div className="mb-2">
                <label className="block text-[10px] text-[#848e9c] mb-1 uppercase font-medium">Size</label>
                <div className="relative">
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 bg-[#1f2329] border border-[#1f2329] rounded text-[12px] text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#848e9c]">
                    {marketName?.split('-')[0] || 'Units'}
                  </span>
                </div>
              </div>

              {/* Percentage Buttons - Compact */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent)}
                    className="py-1 bg-[#1f2329] hover:bg-[#2b3139] text-white text-[10px] font-medium rounded transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              {/* Leverage Slider - Compact */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1 px-1">
                  <label className="text-[10px] text-[#848e9c] uppercase font-medium">Leverage</label>
                  <span className="text-[12px] font-bold text-[#f0b90b]">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={previewData?.maxLeverageAllowed || 20}
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#1f2329] rounded appearance-none cursor-pointer accent-[#f0b90b]"
                />
                <div className="flex justify-between text-[9px] text-[#848e9c] mt-0.5 px-1">
                  <span>1x</span>
                  <span>{previewData?.maxLeverageAllowed || 20}x</span>
                </div>
              </div>

              {/* Preview - Compact */}
              {isLoadingPreview && (
                <div className="bg-[#1f2329] rounded p-2 mb-2">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#848e9c]">
                    <Icon icon="ph:circle-notch" className="animate-spin" width={12} />
                    <span>Calculating...</span>
                  </div>
                </div>
              )}
              
              {!isLoadingPreview && previewData && (
                <div className="bg-[#1f2329] rounded p-2 space-y-1 mb-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#848e9c]">Entry Price</span>
                    <span className="text-white font-mono">
                      ${(Number(previewData?.entryPrice) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#848e9c]">Required Margin</span>
                    <span className="text-white font-mono">
                      ${(Number(previewData?.requiredMargin) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#848e9c]">Trading Fee</span>
                    <span className="text-white font-mono">
                      ${(Number(previewData?.estimatedFee) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] border-t border-[#2b3139] pt-1">
                    <span className="text-[#848e9c] font-semibold">Total Required</span>
                    <span className="text-white font-mono font-semibold">
                      ${(Number(previewData?.totalRequired) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#848e9c]">Est. Liquidation</span>
                    <span className="text-[#f6465d] font-mono">
                      ${(Number(previewData?.estimatedLiquidationPrice) || 0).toFixed(2)}
                    </span>
                  </div>
                  {previewData.sizeTooSmall && (
                    <div className="flex justify-between text-[10px] text-[#f6465d] pt-1 border-t border-[#2b3139]">
                      <span className="font-semibold">Min Size</span>
                      <span className="font-mono">{previewData.minOrderSize} units</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message - Compact */}
              {error && (
                <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded text-[10px] text-[#f6465d] mb-2">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* PIN Input - Compact */}
              <div className="mb-2">
                <label className="block text-[10px] text-[#848e9c] mb-1 uppercase font-medium">
                  Enter PIN to confirm
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
                    className="w-full px-2 py-1.5 bg-[#1f2329] border border-[#1f2329] rounded text-[12px] text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#848e9c] hover:text-white transition-colors"
                  >
                    <Icon icon={showPin ? 'ph:eye-slash' : 'ph:eye'} width={14} />
                  </button>
                </div>
                {pinError && (
                  <p className="text-[9px] text-[#f6465d] mt-0.5">{pinError}</p>
                )}
              </div>

              {/* Error Message - Compact */}
              {error && (
                <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded text-[10px] text-[#f6465d] mb-2">
                  {error}
                </div>
              )}

              {/* Success Message - Compact */}
              {successMessage && (
                <div className="p-2 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded flex items-center gap-1.5 mb-2">
                  <Icon icon="ph:check-circle" className="text-[#0ecb81] flex-shrink-0" height={14} />
                  <span className="text-[10px] font-semibold text-[#0ecb81]">{successMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="p-2 border-t border-[#1f2329] flex-shrink-0">
          {!showQuote ? (
            <button
              onClick={handleGetQuote}
              disabled={!canContinue}
              className={`w-full py-2 rounded font-bold text-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                canContinue
                  ? side === 'long'
                    ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                    : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                  : 'bg-[#1f2329] text-[#848e9c]'
              }`}
            >
              Continue
            </button>
          ) : (
            <div className="space-y-1.5">
              <button
                onClick={handleConfirmOrder}
                disabled={executing || !pin}
                className={`w-full py-2 rounded font-bold text-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  side === 'long'
                    ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                    : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                }`}
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Icon icon="ph:circle-notch" className="animate-spin" width={14} />
                    Executing...
                  </span>
                ) : (
                  `Confirm ${side === 'long' ? 'Long' : 'Short'}`
                )}
              </button>

              <button
                onClick={handleBackToForm}
                disabled={executing}
                className="w-full py-1.5 rounded font-medium text-[11px] bg-[#1f2329] hover:bg-[#2b3139] text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
