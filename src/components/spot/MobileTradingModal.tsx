'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';
import { useSpotSwap } from '@/hooks/useSpotSwap';
import SpotQuoteDetails from './SpotQuoteDetails';

interface MobileTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'buy' | 'sell';
  selectedPair: string;
  chain?: string;
}

export default function MobileTradingModal({ isOpen, onClose, side, selectedPair, chain }: MobileTradingModalProps) {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { quote, fetchQuote, executeSpotSwap, loading: quoteLoading, executing, error: swapError } = useSpotSwap();

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Determine chain based on the base asset if not explicitly provided
  const getChainForPair = (pair: string): string => {
    const [baseAsset] = pair.split('-');
    const asset = baseAsset.toUpperCase();
    
    if (asset === 'ETH' || asset === 'BTC') {
      return 'evm';
    } else if (asset === 'SOL') {
      return 'sol';
    }
    
    return 'tron';
  };

  const effectiveChain = chain || getChainForPair(selectedPair);

  // Use the custom hook to fetch pair balances
  const { 
    tokenIn: baseBalance,  // Balance of base asset (BTC, ETH, SOL)
    tokenOut: quoteBalance, // Balance of quote asset (USDT)
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances 
  } = usePairBalances(user?.userId, selectedPair, effectiveChain);

  // Current balance based on buy/sell side
  // Buy: spend USDT (quoteBalance), get token
  // Sell: spend token (baseBalance), get USDT
  const currentBalance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = side === 'buy' ? tokenIn : tokenOut;

  // Fetch current market price
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/kucoin/ticker?symbol=${selectedPair}`);
        if (response.ok) {
          const result = await response.json();
          if (result.code === '200000' && result.data) {
            setCurrentMarketPrice(parseFloat(result.data.last) || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching market price:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [selectedPair, isOpen]);

  // Auto-calculate total when amount or price changes
  useEffect(() => {
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (side === 'buy') {
        // Buying: amount is in USDT, calculate how much token you get
        const tokenAmount = parseFloat(amount) / currentMarketPrice;
        setTotal(tokenAmount.toFixed(6));
      } else {
        // Selling: amount is in token, calculate how much USDT you get
        const usdtAmount = parseFloat(amount) * currentMarketPrice;
        setTotal(usdtAmount.toFixed(6));
      }
    } else if (orderType === 'limit' && amount && price) {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      if (side === 'buy') {
        setTotal((amountNum * priceNum).toFixed(6));
      } else {
        setTotal((amountNum * priceNum).toFixed(6));
      }
    }
  }, [amount, price, currentMarketPrice, orderType, side]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('[MobileTradingModal] Balance Debug:', {
        userId: user?.userId,
        selectedPair,
        side,
        chain: effectiveChain,
        baseBalance,
        quoteBalance,
        currentBalance,
        loadingBalances,
        balanceError
      });
    }
  }, [isOpen, user?.userId, selectedPair, side, effectiveChain, baseBalance, quoteBalance, currentBalance, loadingBalances, balanceError]);

  const handlePercentage = (percent: number) => {
    const calculatedAmount = (currentBalance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  if (!isOpen) return null;

  const handleGetQuote = async () => {
    // Reset messages
    setError(null);
    setSuccess(null);
    setPinError('');
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (orderType === 'limit') {
      setError('Limit orders not supported yet. Please use Market orders.');
      return;
    }
    
    // Check balance
    if (parseFloat(amount) > currentBalance) {
      setError(`Insufficient ${currentToken} balance`);
      return;
    }
    
    setFetchingQuote(true);
    
    try {
      const quoteResult = await fetchQuote({
        pair: selectedPair,
        side,
        amount,
        slippage: 0.5,
      });
      
      if (quoteResult) {
        setShowQuote(true);
      } else {
        setError(swapError || 'Failed to get quote');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setFetchingQuote(false);
    }
  };

  const handleConfirmSwap = async () => {
    setPinError('');

    if (!pin || pin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    try {
      const result = await executeSpotSwap({
        pair: selectedPair,
        side,
        amount,
      }, pin);

      if (result.success) {
        setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} order executed! TX: ${result.txHash?.slice(0, 10)}...`);
        
        // Refetch balances
        await refetchBalances();
        
        // Reset form
        setAmount('');
        setPrice('');
        setTotal('');
        setSliderValue(0);
        setPin('');
        setShowQuote(false);
        
        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(result.error || 'Failed to execute swap');
        setPinError('Transaction failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(errorMsg);
      setPinError(errorMsg);
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
                  disabled
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors opacity-50 cursor-not-allowed ${
                    orderType === 'limit'
                      ? 'bg-[#181a20] text-white'
                      : 'text-[#848e9c]'
                  }`}
                >
                  Limit
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
              {/* Quote Details */}
              {quote && <SpotQuoteDetails quote={quote} pair={selectedPair} side={side} />}

              {/* PIN Input */}
              <div className="mt-4 space-y-3">
                <label className="block text-sm text-[#848e9c] font-medium">
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
              disabled={fetchingQuote || !amount || loadingBalances}
              className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'buy'
                  ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                  : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
              }`}
            >
              {fetchingQuote ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                  Getting Quote...
                </span>
              ) : (
                `Get Quote`
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirmSwap}
                disabled={executing || !pin}
                className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  side === 'buy'
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
