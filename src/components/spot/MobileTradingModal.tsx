'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';

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

  const [tokenIn, tokenOut] = selectedPair.split('-');
  const effectiveChain = chain;

  // Fetch balances using the spot balances hook
  const {
    baseBalance,
    quoteBalance,
    loading: balancesLoading,
    refetch: refetchBalances
  } = useSpotBalances(tokenIn, tokenOut);

  const currentBalance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = side === 'buy' ? tokenIn : tokenOut;

  // Fetch current market price from Hyperliquid markets
  useEffect(() => {
    if (!isOpen) return;

    const updatePrice = async () => {
      try {
        const response = await fetch(`/api/hyperliquid/markets`);
        const data = await response.json();
        if (data.success && data.data.markets) {
           const market = data.data.markets.find((m: any) => m.baseAsset === tokenIn || m.symbol === `${tokenIn}/USDC`);
           if (market) setCurrentMarketPrice(market.price);
        }
      } catch (e) {
        console.error("Failed to fetch price", e);
      }
    };

    updatePrice();
    const interval = setInterval(updatePrice, 5000);
    return () => clearInterval(interval);
  }, [tokenIn, isOpen]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setTotal('');
      return;
    }

    if (orderType === 'market' && currentMarketPrice > 0) {
      // For market orders: total = amount * currentMarketPrice
      const totalValue = parseFloat(amount) * currentMarketPrice;
      setTotal(totalValue.toFixed(6));
    } else if ((orderType === 'limit' || orderType === 'stop-limit') && price) {
      // For limit/stop-limit: total = amount * price
      const priceNum = parseFloat(price);
      if (priceNum > 0) {
        const totalValue = parseFloat(amount) * priceNum;
        setTotal(totalValue.toFixed(6));
      }
    }
  }, [amount, price, currentMarketPrice, orderType]);

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
    }

    // For buy orders, check total (amount × price) against quote balance
    // For sell orders, check amount against base balance
    const priceForCalc = orderType === 'market' ? currentMarketPrice : parseFloat(price);
    if (priceForCalc > 0) {
      const orderValue = parseFloat(amount) * priceForCalc;
      if (orderValue < 10) {
        setError(`Minimum order value is $10. Your order is worth $${orderValue.toFixed(2)}.`);
        return;
      }
    }

    if (side === 'buy') {
      const totalCost = orderType === 'market'
        ? parseFloat(amount) * currentMarketPrice
        : parseFloat(amount) * parseFloat(price);
      if (totalCost > currentBalance) {
        setError(`Insufficient ${currentToken} balance (need ~${totalCost.toFixed(2)})`);
        return;
      }
    } else {
      if (parseFloat(amount) > currentBalance) {
        setError(`Insufficient ${currentToken} balance`);
        return;
      }
    }

    // For Hyperliquid, we skip the "quote" step as it's a direct order
    // But we use the PIN logic for security if required by the flow
    setShowQuote(true);
  };

  const handleConfirmSwap = async () => {
    setPinError('');
    if (!pin) {
      setPinError('Please enter your PIN');
      return;
    }

    setExecuting(true);
    
    // Hide quote view while executing
    setShowQuote(false);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: tokenIn,
          side: side,
          amount: parseFloat(amount),
          price: orderType === 'market' ? 0 : parseFloat(price),
          orderType,
          isSpot: true,
          stopPrice: orderType === 'stop-limit' ? parseFloat(stopPrice) : undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        // Parse HL response to show fill details
        const statuses = result.data?.response?.data?.statuses;
        const firstStatus = statuses?.[0];
        let msg = `${side === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`;

        if (firstStatus?.filled) {
          const f = firstStatus.filled;
          msg = `Filled ${f.totalSz} ${tokenIn} @ $${parseFloat(f.avgPx).toFixed(4)} avg`;
        } else if (firstStatus?.resting) {
          msg = `Limit order placed (ID: ${firstStatus.resting.oid})`;
        }

        setSuccess(msg);

        // Clear form
        setAmount('');
        setPrice('');
        setStopPrice('');
        setTotal('');
        setSliderValue(0);
        setPin('');

        // Close modal after showing success
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);

        // Refresh data in background
        refetchBalances();
      } else {
        throw new Error(result.error || 'Failed to execute trade');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute trade';
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

              {/* Stop Price Input (for stop-limit orders) */}
              {orderType === 'stop-limit' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#848e9c]">Stop Price</span>
                    <span className="text-sm text-[#848e9c]">{tokenOut}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                    />
                    <button className="px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-white hover:bg-[#2b3139]/80 transition-colors font-semibold">+</button>
                  </div>
                </div>
              )}

              {/* Limit Price Input (for limit and stop-limit orders) */}
              {orderType !== 'market' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#848e9c]">
                      {orderType === 'stop-limit' ? 'Limit Price' : 'Price (USDT)'}
                    </span>
                    <span className="text-sm text-[#848e9c]">{tokenOut}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                    />
                    <button className="px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-white hover:bg-[#2b3139]/80 transition-colors font-semibold">+</button>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#848e9c]">Amount ({tokenIn})</span>
                  <span className="text-sm text-[#848e9c]">{currentToken}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                  />
                  <button className="px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-white hover:bg-[#2b3139]/80 transition-colors font-semibold">+</button>
                </div>
              </div>

              {/* Total Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#848e9c]">Total (USDT)</span>
                </div>
                <div className="px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white">
                  {total || '0.00'}
                </div>
              </div>

              {/* Available Balance */}
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-[#848e9c]">Available</span>
                <span className="text-white font-mono">
                  {balancesLoading ? (
                    <span className="text-[#848e9c]">Loading...</span>
                  ) : (
                    `${currentBalance.toFixed(6)} ${currentToken}`
                  )}
                </span>
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
              disabled={executing || !amount || balancesLoading}
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
    </div>
  );
}
