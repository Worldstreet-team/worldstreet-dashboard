"use client";

import React, { useState, useEffect } from 'react';
import { useFuturesStore, OrderSide, OrderType } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

interface ErrorState {
  type: 'insufficient_margin' | 'order_too_small' | 'leverage_too_high' | 'insufficient_collateral' | 'oracle_unavailable' | 'market_paused' | 'volatility' | 'wallet_not_found' | 'generic' | null;
  message: string;
  details?: {
    required?: number;
    available?: number;
    shortfall?: number;
    minimum?: number;
    current?: number;
    maximum?: number;
  };
}

export const OrderPanel: React.FC = () => {
  const { selectedMarket, selectedChain, setPreviewData, previewData, markets } = useFuturesStore();
  
  const [side, setSide] = useState<OrderSide>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ErrorState>({ type: null, message: '' });
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Preview calculation
  useEffect(() => {
    if (!selectedMarket || !size || parseFloat(size) <= 0) {
      setPreviewData(null);
      setError({ type: null, message: '' });
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

        const data = await response.json();

        if (response.ok) {
          setPreviewData(data);
          setError({ type: null, message: '' });
        } else {
          // Handle preview errors
          setPreviewData(null);
          const parsedError = parseError(data.error || '', data.message || data.error || '');
          setError(parsedError);
        }
      } catch (error) {
        console.error('Preview error:', error);
        setPreviewData(null);
        setError({
          type: 'generic',
          message: 'Failed to calculate preview. Please try again.',
        });
      }
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [selectedMarket, size, leverage, side, orderType, limitPrice, selectedChain, setPreviewData]);

  // Retry countdown effect
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
        if (retryCountdown === 1) {
          handleSubmit();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  // Parse error message and extract details
  const parseError = (errorType: string, message: string): ErrorState => {
    // Insufficient margin
    if (errorType === 'Insufficient margin' || message.includes('Insufficient margin')) {
      const requiredMatch = message.match(/Required: \$([0-9.]+)/);
      const availableMatch = message.match(/Available: \$([0-9.]+)/);
      const shortfallMatch = message.match(/Shortfall: \$([0-9.]+)/);
      
      return {
        type: 'insufficient_margin',
        message: 'You need more collateral to open this position',
        details: {
          required: requiredMatch ? parseFloat(requiredMatch[1]) : undefined,
          available: availableMatch ? parseFloat(availableMatch[1]) : undefined,
          shortfall: shortfallMatch ? parseFloat(shortfallMatch[1]) : undefined,
        },
      };
    }

    // Order size too small
    if (message.includes('Order size too small') || message.includes('Minimum:')) {
      const minMatch = message.match(/Minimum: ([0-9.]+)/);
      const orderMatch = message.match(/Your order: ([0-9.]+)/);
      
      return {
        type: 'order_too_small',
        message: 'Your order size is below the minimum for this market',
        details: {
          minimum: minMatch ? parseFloat(minMatch[1]) : undefined,
          current: orderMatch ? parseFloat(orderMatch[1]) : undefined,
        },
      };
    }

    // Leverage too high
    if (message.includes('Leverage too high') || message.includes('Max leverage')) {
      const maxMatch = message.match(/Max leverage.*?(\d+)x/i);
      
      return {
        type: 'leverage_too_high',
        message: 'Maximum leverage exceeded for this market',
        details: {
          maximum: maxMatch ? parseInt(maxMatch[1]) : 10,
          current: leverage,
        },
      };
    }

    // Insufficient collateral (Drift)
    if (message.includes('Insufficient collateral')) {
      return {
        type: 'insufficient_collateral',
        message: "You don't have enough USDC deposited in your Drift account",
      };
    }

    // Oracle unavailable
    if (message.includes('oracle')) {
      return {
        type: 'oracle_unavailable',
        message: 'The price oracle for this market is updating',
      };
    }

    // Market paused
    if (message.includes('paused')) {
      return {
        type: 'market_paused',
        message: 'Trading is temporarily paused for this market',
      };
    }

    // High volatility
    if (message.includes('volatile') || message.includes('volatility')) {
      return {
        type: 'volatility',
        message: 'Market price is moving too quickly',
      };
    }

    // Wallet not found
    if (message.includes('wallet not found') || message.includes('Create one first')) {
      return {
        type: 'wallet_not_found',
        message: 'You need to create a futures wallet before trading',
      };
    }

    // Generic error
    return {
      type: 'generic',
      message: message || 'An unexpected error occurred',
    };
  };

  const handleSubmit = async () => {
    if (!selectedMarket || !size || !previewData) return;

    // Clear previous errors
    setError({ type: null, message: '' });

    // Check margin before submitting
    if (!previewData.marginCheckPassed) {
      setError({
        type: 'insufficient_margin',
        message: 'You need more collateral to open this position',
        details: {
          required: previewData.totalRequired,
          available: previewData.freeCollateral,
          shortfall: previewData.totalRequired - previewData.freeCollateral,
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine marketIndex from market symbol
      const marketIndex = markets.findIndex(m => m.id === selectedMarket.id);
      
      // Use Drift API for opening positions
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
        // Reset form
        setSize('');
        setLimitPrice('');
        setError({ type: null, message: '' });
        
        // Show success message (you can replace alert with a toast notification)
        alert(`Position opened successfully! TX: ${result.txSignature?.slice(0, 8)}...`);
      } else {
        // Parse and display error
        const parsedError = parseError(result.error || '', result.message || result.error || '');
        setError(parsedError);

        // Auto-retry for temporary errors
        if (parsedError.type === 'oracle_unavailable' || parsedError.type === 'volatility') {
          setRetryCountdown(5);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError({
        type: 'generic',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFixError = () => {
    if (error.type === 'order_too_small' && error.details?.minimum) {
      setSize(error.details.minimum.toString());
      setError({ type: null, message: '' });
    } else if (error.type === 'leverage_too_high' && error.details?.maximum) {
      setLeverage(error.details.maximum);
      setError({ type: null, message: '' });
    }
  };

  const isDisabled = !selectedMarket || 
    !size || 
    parseFloat(size) <= 0 || 
    !previewData ||
    !previewData.marginCheckPassed ||
    isSubmitting;

  const shortfall = previewData && !previewData.marginCheckPassed
    ? (previewData.totalRequired ?? 0) - (previewData.freeCollateral ?? 0)
    : 0;

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
            <span className="text-muted dark:text-darklink">Base Margin:</span>
            <span className="font-medium text-dark dark:text-white">
              ${(previewData?.requiredMargin ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted dark:text-darklink">Trading Fee (0.1%):</span>
            <span className="font-medium text-dark dark:text-white">
              ${(previewData?.estimatedFee ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-border dark:border-darkborder pt-2">
            <span className="font-semibold text-dark dark:text-white">Total Required:</span>
            <span className="font-semibold text-dark dark:text-white">
              ${(previewData?.totalRequired ?? 0).toFixed(2)}
            </span>
          </div>
          <div className={`flex justify-between text-sm ${
            previewData?.marginCheckPassed ? 'text-success' : 'text-error'
          }`}>
            <span>Your Available:</span>
            <span className="font-medium">
              ${(previewData?.freeCollateral ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="border-t border-border dark:border-darkborder pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted dark:text-darklink">
              <span>Est. Liquidation:</span>
              <span className="text-error">
                ${(previewData?.estimatedLiquidationPrice ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted dark:text-darklink">
              <span>Funding Impact:</span>
              <span>
                ${(previewData?.estimatedFundingImpact ?? 0).toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error.type && (
        <div className={`mb-4 p-3 rounded-lg border ${
          error.type === 'oracle_unavailable' || error.type === 'volatility' 
            ? 'bg-warning/10 border-warning/20' 
            : 'bg-error/10 border-error/20'
        }`}>
          <div className="flex items-start gap-2">
            <Icon 
              icon={error.type === 'oracle_unavailable' || error.type === 'volatility' ? 'ph:warning' : 'ph:x-circle'} 
              className={error.type === 'oracle_unavailable' || error.type === 'volatility' ? 'text-warning' : 'text-error'} 
              height={20} 
            />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                error.type === 'oracle_unavailable' || error.type === 'volatility' ? 'text-warning' : 'text-error'
              }`}>
                {error.type === 'insufficient_margin' && 'Insufficient Margin'}
                {error.type === 'order_too_small' && 'Order Too Small'}
                {error.type === 'leverage_too_high' && 'Leverage Too High'}
                {error.type === 'insufficient_collateral' && 'Insufficient Collateral'}
                {error.type === 'oracle_unavailable' && 'Market Temporarily Unavailable'}
                {error.type === 'market_paused' && 'Market Paused'}
                {error.type === 'volatility' && 'High Volatility'}
                {error.type === 'wallet_not_found' && 'No Futures Wallet'}
                {error.type === 'generic' && 'Error'}
              </p>
              <p className={`text-xs mt-1 ${
                error.type === 'oracle_unavailable' || error.type === 'volatility' ? 'text-warning/80' : 'text-error/80'
              }`}>
                {error.message}
              </p>

              {/* Insufficient Margin Details */}
              {error.type === 'insufficient_margin' && error.details && (
                <div className="mt-2 space-y-1 text-xs">
                  {error.details.required && (
                    <div className="flex justify-between">
                      <span className="text-muted">Required:</span>
                      <span className="font-medium text-error">${error.details.required.toFixed(2)}</span>
                    </div>
                  )}
                  {error.details.available && (
                    <div className="flex justify-between">
                      <span className="text-muted">Available:</span>
                      <span className="font-medium text-error">${error.details.available.toFixed(2)}</span>
                    </div>
                  )}
                  {error.details.shortfall && (
                    <div className="flex justify-between">
                      <span className="text-muted">Shortfall:</span>
                      <span className="font-semibold text-error">${error.details.shortfall.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Order Too Small Details */}
              {error.type === 'order_too_small' && error.details && (
                <div className="mt-2 space-y-1 text-xs">
                  {error.details.minimum && (
                    <div className="flex justify-between">
                      <span className="text-muted">Minimum:</span>
                      <span className="font-medium text-error">{error.details.minimum} {selectedMarket?.baseAsset}</span>
                    </div>
                  )}
                  {error.details.current && (
                    <div className="flex justify-between">
                      <span className="text-muted">Your order:</span>
                      <span className="font-medium text-error">{error.details.current} {selectedMarket?.baseAsset}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Leverage Too High Details */}
              {error.type === 'leverage_too_high' && error.details && (
                <div className="mt-2 space-y-1 text-xs">
                  {error.details.maximum && (
                    <div className="flex justify-between">
                      <span className="text-muted">Maximum:</span>
                      <span className="font-medium text-error">{error.details.maximum}x</span>
                    </div>
                  )}
                  {error.details.current && (
                    <div className="flex justify-between">
                      <span className="text-muted">Your leverage:</span>
                      <span className="font-medium text-error">{error.details.current}x</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 flex gap-2">
                {error.type === 'insufficient_margin' && (
                  <a
                    href="/futures"
                    className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                  >
                    Deposit Funds
                  </a>
                )}
                {error.type === 'order_too_small' && error.details?.minimum && (
                  <button
                    onClick={handleFixError}
                    className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                  >
                    Set to {error.details.minimum} {selectedMarket?.baseAsset}
                  </button>
                )}
                {error.type === 'leverage_too_high' && error.details?.maximum && (
                  <button
                    onClick={handleFixError}
                    className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                  >
                    Set to {error.details.maximum}x
                  </button>
                )}
                {error.type === 'insufficient_collateral' && (
                  <>
                    <a
                      href="/futures"
                      className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                    >
                      Deposit USDC
                    </a>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white rounded hover:bg-muted/40 transition-colors"
                    >
                      Check Balance
                    </button>
                  </>
                )}
                {(error.type === 'oracle_unavailable' || error.type === 'volatility') && (
                  <button
                    onClick={() => retryCountdown === 0 && handleSubmit()}
                    disabled={retryCountdown > 0}
                    className="text-xs px-3 py-1.5 bg-warning text-white rounded hover:bg-warning/90 transition-colors disabled:opacity-50"
                  >
                    {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry Now'}
                  </button>
                )}
                {error.type === 'market_paused' && (
                  <a
                    href="/futures"
                    className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                  >
                    View Other Markets
                  </a>
                )}
                {error.type === 'wallet_not_found' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 transition-colors"
                  >
                    Create Wallet
                  </button>
                )}
                <button
                  onClick={() => setError({ type: null, message: '' })}
                  className="text-xs px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white rounded hover:bg-muted/40 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
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

      {/* Insufficient Margin Warning */}
      {previewData && !previewData.marginCheckPassed && shortfall > 0 && (
        <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={18} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-error">Insufficient Margin</p>
              <p className="text-xs text-error/80 mt-1">
                Need ${shortfall.toFixed(2)} more to open this position.
              </p>
              <a 
                href="/futures" 
                className="text-xs text-error underline hover:no-underline mt-1 inline-block"
              >
                Deposit collateral →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Low Margin Buffer Warning */}
      {previewData && previewData.marginCheckPassed && previewData.freeCollateral > 0 && (
        (() => {
          const ratio = previewData.freeCollateral / previewData.totalRequired;
          if (ratio < 1.1 && ratio >= 1.0) {
            return (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon icon="ph:info" className="text-warning flex-shrink-0 mt-0.5" height={18} />
                  <p className="text-xs text-warning">
                    Low margin buffer. Position may be at risk of liquidation.
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}
    </div>
  );
};
