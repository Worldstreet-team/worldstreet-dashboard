'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';
import { usePostActionPolling } from '@/hooks/useFuturesPolling';

interface FuturesOrderFormProps {
  marketIndex: number;
  marketName: string;
}

export default function FuturesOrderForm({ marketIndex, marketName }: FuturesOrderFormProps) {
  const { 
    openPosition, 
    previewTrade, 
    summary, 
    refreshPositions, 
    refreshSummary,
    isLoading: driftLoading 
  } = useDrift();
  
  const { isPolling: isConfirmingOrder, startPostActionPolling } = usePostActionPolling();

  const [activeTab, setActiveTab] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview calculation
  useEffect(() => {
    if (!marketIndex || !size || parseFloat(size) <= 0) {
      setPreviewData(null);
      return;
    }

    const fetchPreview = async () => {
      try {
        const preview = await previewTrade(
          marketIndex,
          activeTab,
          parseFloat(size),
          leverage
        );
        setPreviewData(preview);
        setError(null);
      } catch (error) {
        console.error('[FuturesOrderForm] Preview error:', error);
        setPreviewData(null);
      }
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [marketIndex, size, leverage, activeTab, previewTrade]);

  const handlePercentage = (percent: number) => {
    if (!summary || !previewData) return;
    
    const availableCollateral = summary.freeCollateral;
    const maxSize = (availableCollateral * leverage) / (previewData.entryPrice || 1);
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

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid limit price');
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

    setIsSubmitting(true);

    try {
      const result = await openPosition(
        marketIndex,
        activeTab,
        parseFloat(size),
        leverage
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to open position');
      }

      setSuccess(`Position opened! TX: ${result.txSignature?.slice(0, 8)}...`);
      
      // Start post-action polling
      startPostActionPolling({
        checkCondition: async () => {
          await refreshPositions();
          await refreshSummary();
          return true;
        },
        onSuccess: () => {
          setSize('');
          setLimitPrice('');
          setSliderValue(0);
          setIsSubmitting(false);
          
          setTimeout(() => setSuccess(null), 5000);
        },
        onTimeout: () => {
          setIsSubmitting(false);
          setSuccess('Position opened but taking longer to confirm.');
          setTimeout(() => setSuccess(null), 5000);
        },
        maxAttempts: 15,
        interval: 1000,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open position';
      setError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const availableBalance = summary?.freeCollateral || 0;
  const isDisabled = !size || parseFloat(size) <= 0 || !previewData || !previewData.marginCheckPassed || previewData.sizeTooSmall || isSubmitting || isConfirmingOrder;

  return (
    <div className="flex flex-col bg-[#0d0d0d] text-white border border-white/5 rounded-xl overflow-hidden">
      {/* Buy/Sell Tabs */}
      <div className="grid grid-cols-2 gap-0 border-b border-white/10">
        <button
          onClick={() => setActiveTab('long')}
          className={`py-3 text-sm font-semibold transition-colors ${
            activeTab === 'long'
              ? 'text-[#0ecb81] border-b-2 border-[#0ecb81]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setActiveTab('short')}
          className={`py-3 text-sm font-semibold transition-colors ${
            activeTab === 'short'
              ? 'text-[#f6465d] border-b-2 border-[#f6465d]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Short
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/10">
        <button
          onClick={() => setOrderType('market')}
          className={`text-xs font-medium transition-colors ${
            orderType === 'market' ? 'text-white' : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`text-xs font-medium transition-colors ${
            orderType === 'limit' ? 'text-white' : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Form Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Available Balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#848e9c]">Available</span>
          <span className="font-mono text-white">
            ${availableBalance.toFixed(2)} USDC
          </span>
        </div>

        {/* Limit Price (for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Limit Price</label>
            <div className="relative">
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                USDT
              </span>
            </div>
          </div>
        )}

        {/* Size Input */}
        <div>
          <label className="block text-xs text-[#848e9c] mb-2">Size</label>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
              {marketName.split('-')[0]}
            </span>
          </div>
        </div>

        {/* Leverage Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-[#848e9c]">Leverage</label>
            <span className="text-sm font-bold text-[#fcd535]">{leverage}x</span>
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

        {/* Percentage Slider */}
        <div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => handlePercentage(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${
                activeTab === 'long' ? '#0ecb81' : '#f6465d'
              } 0%, ${activeTab === 'long' ? '#0ecb81' : '#f6465d'} ${sliderValue}%, #2b3139 ${sliderValue}%, #2b3139 100%)`,
            }}
          />
          <div className="flex justify-between mt-2">
            {[25, 50, 75, 100].map((val) => (
              <button
                key={val}
                onClick={() => handlePercentage(val)}
                className="text-[10px] text-[#848e9c] hover:text-white transition-colors"
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {previewData && (
          <div className="bg-[#1e2329] rounded-lg p-3 space-y-2 border border-white/5">
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
            <div className="flex justify-between text-xs border-t border-white/5 pt-2">
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
          <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d] rounded text-xs text-[#f6465d] flex items-start gap-2">
            <Icon icon="ph:warning" width={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-[#0ecb81]/10 border border-[#0ecb81] rounded text-xs text-[#0ecb81] flex items-start gap-2">
            <Icon icon="ph:check-circle" width={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{success}</p>
              {isConfirmingOrder && (
                <p className="text-[10px] mt-1 flex items-center gap-1">
                  <Icon icon="svg-spinners:ring-resize" height={10} />
                  Confirming on-chain...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'long'
              ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
              : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
          }`}
        >
          {isConfirmingOrder ? (
            <span className="flex items-center justify-center gap-2">
              <Icon icon="svg-spinners:ring-resize" height={16} />
              Confirming...
            </span>
          ) : isSubmitting ? (
            'Opening...'
          ) : (
            `Open ${activeTab === 'long' ? 'Long' : 'Short'}`
          )}
        </button>
      </div>
    </div>
  );
}
