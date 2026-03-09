'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useDrift } from '@/app/context/driftContext';
import SpotOrderProcessingModal from './SpotOrderProcessingModal';

interface MobileTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'buy' | 'sell';
  selectedPair: string;
  chain: string;
  tokenAddress?: string;
}

export default function MobileTradingModal({ isOpen, onClose, side, selectedPair, chain, tokenAddress }: MobileTradingModalProps) {
  const { user } = useAuth();
  const { placeSpotOrder, getSpotMarketIndexBySymbol, refreshPositions } = useDrift();

  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState(''); // Trigger price for stop-limit
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [showQuote, setShowQuote] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [processingError, setProcessingError] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');

  const [tokenIn, tokenOut] = selectedPair.split('-');
  const effectiveChain = chain;

  // Get Drift market indices for the pair
  const baseMarketIndex = getSpotMarketIndexBySymbol(tokenIn);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(tokenOut);

  // Fetch balances from Drift using the new hook
  const {
    baseBalance,
    quoteBalance,
    isBorrowed,
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances
  } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  const currentBalance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = side === 'buy' ? tokenIn : tokenOut;

  // Fetch current market price from Drift or fall back to KuCoin for display if needed
  // Better use the same logic as BinanceOrderForm (Drift Oracles)
  const { spotPositions: driftSpotPositions } = useDrift();

  useEffect(() => {
    if (!isOpen) return;

    const updatePrice = () => {
      const [baseAsset] = selectedPair.split('-');
      const marketIndex = getSpotMarketIndexBySymbol(baseAsset);
      if (marketIndex !== undefined) {
        const market = Array.from(driftSpotPositions || []).find(p => p.marketIndex === marketIndex);
        if (market && market.price > 0) {
          setCurrentMarketPrice(market.price);
        }
      }
    };

    updatePrice();
    const interval = setInterval(updatePrice, 2000);
    return () => clearInterval(interval);
  }, [selectedPair, isOpen, driftSpotPositions, getSpotMarketIndexBySymbol]);

  useEffect(() => {
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (side === 'buy') {
        const tokenAmount = parseFloat(amount) / currentMarketPrice;
        setTotal(tokenAmount.toFixed(6));
      } else {
        const usdtAmount = parseFloat(amount) * currentMarketPrice;
        setTotal(usdtAmount.toFixed(6));
      }
    } else if (orderType === 'limit' && amount && price) {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      setTotal((amountNum * priceNum).toFixed(6));
    }
  }, [amount, price, currentMarketPrice, orderType, side]);

  const handlePercentage = (percent: number) => {
    const calculatedAmount = (currentBalance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  if (!isOpen) return null;

  const handleGetQuote = async () => {
    setError(null);
    setSuccess(null);
    setPinError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Validate limit price for limit orders
    if (orderType === 'limit') {
      if (!price || parseFloat(price) <= 0) {
        setError('Please enter a valid limit price');
        return;
      }
    }

    // Validate stop-limit prices
    if (orderType === 'stop-limit') {
      if (!stopPrice || parseFloat(stopPrice) <= 0) {
        setError('Please enter a valid stop price');
        return;
      }
      if (!price || parseFloat(price) <= 0) {
        setError('Please enter a valid limit price');
        return;
      }
      
      // Validate price relationship
      const stopPriceNum = parseFloat(stopPrice);
      const limitPriceNum = parseFloat(price);
      
      if (side === 'buy') {
        if (stopPriceNum < currentMarketPrice) {
          setError('Buy stop price must be above current market price');
          return;
        }
        if (limitPriceNum < stopPriceNum) {
          setError('Buy limit price must be at or above stop price');
          return;
        }
      } else {
        if (stopPriceNum > currentMarketPrice) {
          setError('Sell stop price must be below current market price');
          return;
        }
        if (limitPriceNum > stopPriceNum) {
          setError('Sell limit price must be at or below stop price');
          return;
        }
      }
    }

    if (parseFloat(amount) > currentBalance) {
      setError(`Insufficient ${currentToken} balance`);
      return;
    }

    setShowQuote(true);
  };

  const handleConfirmSwap = async () => {
    setPinError('');
    if (!pin) {
      setPinError('Please enter your PIN');
      return;
    }

    setExecuting(true);
    
    // Show processing modal immediately
    setShowQuote(false);
    setShowProcessingModal(true);
    setProcessingStatus('processing');
    setProcessingError('');
    setTxSignature('');
    
    try {
      const [baseAsset] = selectedPair.split('-');
      const marketIndex = getSpotMarketIndexBySymbol(baseAsset);

      if (marketIndex === undefined) {
        throw new Error(`Market not found on Drift: ${baseAsset}`);
      }

      const amountNum = parseFloat(amount);
      const priceNum = price ? parseFloat(price) : undefined;
      const stopPriceNum = stopPrice ? parseFloat(stopPrice) : undefined;
      
      const result = await placeSpotOrder(
        marketIndex,
        side === 'buy' ? 'buy' : 'sell',
        amountNum,
        orderType,
        priceNum,
        stopPriceNum
      );

      if (!result.success) throw new Error(result.error || 'Drift spot order failed');

      // Success!
      setProcessingStatus('success');
      setTxSignature(result.txSignature || '');
      setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} ${orderType} order placed successfully!`);

      await refreshPositions();
      await refetchBalances();

      setAmount('');
      setPrice('');
      setStopPrice('');
      setTotal('');
      setSliderValue(0);
      setPin('');

      // Auto-close and return to main view after 3 seconds
      setTimeout(() => {
        setShowProcessingModal(false);
        setSuccess(null);
        onClose();
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute trade';
      setProcessingStatus('error');
      setProcessingError(errorMsg);
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
            {side === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2b3139] rounded-full transition-colors">
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {!showQuote ? (
            <>
              {/* Order Type Tabs */}
              <div className="flex gap-2 p-1 bg-[#2b3139] rounded-lg">
                <button
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'market'
                    ? 'bg-[#181a20] text-white'
                    : 'text-[#848e9c]'
                    }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'limit'
                    ? 'bg-[#181a20] text-white'
                    : 'text-[#848e9c]'
                    }`}
                >
                  Limit
                </button>
                <button
                  onClick={() => setOrderType('stop-limit')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'stop-limit'
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
                  {loadingBalances ? (
                    <span className="text-[#848e9c]">Loading...</span>
                  ) : balanceError ? (
                    <span className="text-[#f6465d]">Error</span>
                  ) : (
                    `${currentBalance.toFixed(6)} ${currentToken}`
                  )}
                </span>
              </div>

              {/* Balance Error Alert */}
              {balanceError && (
                <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-xs text-[#f6465d]">
                  {balanceError}
                </div>
              )}

              {/* Stop Price Input (for stop-limit orders) */}
              {orderType === 'stop-limit' && (
                <div>
                  <label className="block text-sm text-[#848e9c] mb-2">Stop Price</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                      {tokenOut}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#848e9c]">
                    Order triggers when market reaches this price
                  </div>
                </div>
              )}

              {/* Limit Price Input (for limit and stop-limit orders) */}
              {orderType !== 'market' && (
                <div>
                  <label className="block text-sm text-[#848e9c] mb-2">
                    {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                      {tokenOut}
                    </span>
                  </div>
                  {orderType === 'stop-limit' && (
                    <div className="mt-1 text-xs text-[#848e9c]">
                      Order executes at this price after trigger
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-[#848e9c] mb-2">
                  {side === 'buy' ? `Amount (${tokenOut})` : `Amount (${tokenIn})`}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                    {currentToken}
                  </span>
                </div>
                {/* Show equivalent */}
                {total && (
                  <div className="mt-2 text-xs text-[#848e9c]">
                    ≈ {total} {equivalentToken}
                  </div>
                )}
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
              {success && (
                <div className="p-3 bg-[rgba(14,203,129,0.12)] border border-[#0ecb81] rounded-lg text-sm text-[#0ecb81]">
                  {success}
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
              disabled={executing || !amount || loadingBalances}
              className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${side === 'buy'
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
                `Continue`
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirmSwap}
                disabled={executing || !pin}
                className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${side === 'buy'
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
                  `Confirm ${side === 'buy' ? 'Buy' : 'Sell'}`
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

      <SpotOrderProcessingModal
        isOpen={showProcessingModal}
        onClose={() => {
          setShowProcessingModal(false);
          if (processingStatus === 'success') {
            onClose();
          }
        }}
        status={processingStatus}
        side={side}
        pair={selectedPair}
        amount={amount}
        error={processingError}
        txSignature={txSignature}
      />
    </div>
  );
}
