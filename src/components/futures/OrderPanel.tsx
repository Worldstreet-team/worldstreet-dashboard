"use client";

import React, { useState, useEffect } from 'react';
import { useFuturesStore, OrderSide, OrderType } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

export const OrderPanel: React.FC = () => {
  const { selectedMarket, selectedChain, collateral, setPreviewData, previewData, markets } = useFuturesStore();
  
  const [side, setSide] = useState<OrderSide>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview calculation
  useEffect(() => {
    if (!selectedMarket || !size || parseFloat(size) <= 0) {
      setPreviewData(null);
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
            size: parseFloat(size),
            leverage,
            orderType,
            limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewData(data);
        }
      } catch (error) {
        console.error('Preview error:', error);
      }
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [selectedMarket, size, leverage, side, orderType, limitPrice, selectedChain, setPreviewData]);

  const handleSubmit = async () => {
    if (!selectedMarket || !size || !previewData) return;

    setIsSubmitting(true);
    try {
      // Determine marketIndex from market symbol
      const marketIndex = markets.findIndex(m => m.id === selectedMarket.id);
      
      const response = await fetch('/api/futures/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: selectedChain,
          market: selectedMarket.symbol,
          marketIndex: marketIndex >= 0 ? marketIndex : 0,
          side,
          size: parseFloat(size),
          leverage,
          orderType,
          limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        }),
      });

      if (response.ok) {
        // Reset form
        setSize('');
        setLimitPrice('');
        alert('Position opened successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to open position');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to open position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !selectedMarket || 
    !size || 
    parseFloat(size) <= 0 || 
    !previewData ||
    (collateral && previewData.requiredMargin > collateral.free) ||
    isSubmitting;

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Open Position</h3>

      {/* Side Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('long')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            side === 'long'
              ? 'bg-success text-white'
              : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            side === 'short'
              ? 'bg-error text-white'
              : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
          }`}
        >
          Short
        </button>
      </div>

      {/* Order Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-dark dark:text-white mb-2">Order Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => setOrderType('market')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              orderType === 'market'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              orderType === 'limit'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-dark text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-darkgray'
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Limit Price */}
      {orderType === 'limit' && (
        <div className="mb-4">
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
      <div className="mb-4">
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
      <div className="mb-4">
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
        <div className="flex justify-between text-xs text-muted dark:text-darklink mt-1">
          <span>1x</span>
          <span>{previewData?.maxLeverageAllowed || 20}x</span>
        </div>
      </div>

      {/* Preview */}
      {previewData && (
        <div className="bg-gray-50 dark:bg-dark rounded-lg p-3 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted dark:text-darklink">Required Margin:</span>
            <span className="font-medium text-dark dark:text-white">
              ${previewData.requiredMargin.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted dark:text-darklink">Est. Liquidation:</span>
            <span className="font-medium text-error">
              ${previewData.estimatedLiquidationPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted dark:text-darklink">Est. Fee:</span>
            <span className="font-medium text-dark dark:text-white">
              ${previewData.estimatedFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted dark:text-darklink">Funding Impact:</span>
            <span className="font-medium text-dark dark:text-white">
              ${previewData.estimatedFundingImpact.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          isDisabled
            ? 'bg-gray-300 dark:bg-darkgray text-gray-500 cursor-not-allowed'
            : side === 'long'
            ? 'bg-success hover:bg-success/90 text-white'
            : 'bg-error hover:bg-error/90 text-white'
        }`}
      >
        {isSubmitting ? 'Opening...' : `Open ${side === 'long' ? 'Long' : 'Short'}`}
      </button>

      {collateral && previewData && previewData.requiredMargin > collateral.free && (
        <p className="text-xs text-error mt-2">Insufficient margin available</p>
      )}
    </div>
  );
};
