'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface FuturesTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'long' | 'short';
  marketIndex: number;
  marketName: string;
}

export default function FuturesTradingModal({ 
  isOpen, 
  onClose, 
  side, 
  marketIndex, 
  marketName 
}: FuturesTradingModalProps) {
  const { 
    openPosition, 
    previewTrade, 
    summary, 
    refreshPositions, 
    refreshSummary,
    getMarketPrice
  } = useDrift();

  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const currentMarketPrice = getMarketPrice(marketIndex, 'perp');

  // Preview calculation
  useEffect(() => {
    if (!isOpen || !size || parseFloat(size) <= 0) {
      setPreviewData(null);
      return;
    }

    const fetchPreview = async () => {
      try {
        const preview = await previewTrade(
          marketIndex,
          side,
          parseFloat(size),
          leverage
        );
        setPreviewData(preview);
        setError(null);
      } catch (error) {
        console.error('[FuturesTradingModal] Preview error:', error);
        setPreviewData(null);
      }
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, marketIndex, size, leverage, side, previewTrade]);

  const handlePercentage = (percent: number) => {
    if (!summary || !previewData) return;
    
    const availableCollateral = summary.freeCollateral;
    const maxSize = (availableCollateral * leverage) / (previewData.entryPrice || currentMarketPrice || 1);
    const calculatedSize = (maxSize * percent) / 100;
    
    setSize(calculatedSize.toFixed(6));
    setSliderValue(percent);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!size || parseFloat(size) <= 0) {
      setError('Please enter a valid size');
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

      // Validate trigger price vs limit price
      if (side === 'long') {
        // For long stop-limit: trigger >= current market, limit >= trigger
        if (triggerPriceNum < currentMarketPrice) {
          setError('Long stop-limit trigger price must be above current market price');
          return;
        }
        if (limitPriceNum < triggerPriceNum) {
          setError('Long stop-limit limit price must be at or above trigger price');
          return;
        }
      } else {
        // For short stop-limit: trigger <= current market, limit <= trigger
        if (triggerPriceNum > currentMarketPrice) {
          setError('Short stop-limit trigger price must be below current market price');
          return;
        }
        if (limitPriceNum > triggerPriceNum) {
          setError('Short stop-limit limit price must be at or below trigger price');
          return;
        }
      }
    }

    if (!previewData || !previewData.marginCheckPassed) {
      setError('Insufficient margin for this position');
      return;
    }

    if (previewData.sizeTooSmall) {
      setError(`Order size too small. Minimum: ${previewData.minOrderSize} units`);
      return;
    }

    setExecuting(true);

    try {
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

      setSuccess(`${side === 'long' ? 'Long' : 'Short'} position opened successfully!`);
      
      await refreshPositions();
      await refreshSummary();

      setSize('');
      setLimitPrice('');
      setTriggerPrice('');
      setSliderValue(0);

      // Auto-close after 2 seconds
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open position';
      setError(errorMsg);
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const availableBalance = summary?.freeCollateral || 0;
  const isDisabled = !size || parseFloat(size) <= 0 || !previewData || !previewData.marginCheckPassed || previewData.sizeTooSmall || executing;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full md:max-w-md bg-[#181a20] md:rounded-t-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-semibold text-white">
            {side === 'long' ? 'Long' : 'Short'} {marketName}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2b3139] rounded-full transition-colors">
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {/* Order Type Tabs */}
          <div className="flex gap-2 p-1 bg-[#2b3139] rounded-lg">
            <button
              onClick={() => setOrderType('market')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                orderType === 'market'
                  ? 'bg-[#181a20] text-white'
                  : 'text-[#848e9c]'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                orderType === 'limit'
                  ? 'bg-[#181a20] text-white'
                  : 'text-[#848e9c]'
              }`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType('stop-limit')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                orderType === 'stop-limit'
                  ? 'bg-[#181a20] text-white'
                  : 'text-[#848e9c]'
              }`}
            >
              Stop-Limit
            </button>
          </div>

          {/* Available Balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#848e9c]">Available</span>
            <span className="text-white font-mono">
              ${availableBalance.toFixed(2)} USDC
            </span>
          </div>

          {/* Limit Price (for limit and stop-limit orders) */}
          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <div>
              <label className="block text-sm text-[#848e9c] mb-2">
                {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                  USDT
                </span>
              </div>
            </div>
          )}

          {/* Trigger Price (for stop-limit orders only) */}
          {orderType === 'stop-limit' && (
            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Trigger Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                  USDT
                </span>
              </div>
              <p className="text-xs text-[#848e9c] mt-1">
                {side === 'long' 
                  ? 'Order triggers when price rises above this level'
                  : 'Order triggers when price falls below this level'}
              </p>
            </div>
          )}

          {/* Size Input */}
          <div>
            <label className="block text-sm text-[#848e9c] mb-2">Size</label>
            <div className="relative">
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                {marketName.split('-')[0]}
              </span>
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-[#848e9c]">Leverage</label>
              <span className="text-base font-bold text-[#fcd535]">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max={previewData?.maxLeverageAllowed || 20}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer accent-[#fcd535]"
            />
            <div className="flex justify-between text-xs text-[#848e9c] mt-2">
              <span>1x</span>
              <span>{previewData?.maxLeverageAllowed || 20}x</span>
            </div>
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

          {/* Preview */}
          {previewData && (
            <div className="bg-[#2b3139] rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#848e9c]">Entry Price:</span>
                <span className="text-white font-mono">
                  ${(previewData.entryPrice || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#848e9c]">Required Margin:</span>
                <span className="text-white font-mono">
                  ${(previewData.requiredMargin || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#848e9c]">Trading Fee:</span>
                <span className="text-white font-mono">
                  ${(previewData.estimatedFee || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/10 pt-2">
                <span className="text-[#848e9c] font-semibold">Total Required:</span>
                <span className="text-white font-mono font-semibold">
                  ${(previewData.totalRequired || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#848e9c]">Est. Liquidation:</span>
                <span className="text-[#f6465d] font-mono">
                  ${(previewData.estimatedLiquidationPrice || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-sm text-[#f6465d]">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-[rgba(14,203,129,0.12)] border border-[#0ecb81] rounded-lg text-sm text-[#0ecb81]">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2b3139] safe-area-bottom">
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              side === 'long'
                ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
            }`}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
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
}
