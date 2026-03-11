'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useDrift } from '@/app/context/driftContext';
import SpotSwapConfirmModal from './SpotSwapConfirmModal';
import SpotDepositModal from './SpotDepositModal';
import SpotOrderProcessingModal from './SpotOrderProcessingModal';

interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
  initialSide?: 'buy' | 'sell';
}

export default function BinanceOrderForm({ selectedPair, onTradeExecuted, chain, tokenAddress, initialSide = 'buy' }: BinanceOrderFormProps) {
  const { user } = useAuth();
  const { placeSpotOrder, getSpotMarketIndexBySymbol, spotPositions: driftSpotPositions, getSpotMarketName } = useDrift();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>(initialSide);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState(''); // Trigger price for stop-limit
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [processingError, setProcessingError] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');

  const [baseAsset, quoteAsset] = selectedPair.split('-');

  // Get Drift market indices for the pair
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

  // Fetch balances from Drift using the new hook
  const {
    baseBalance,
    quoteBalance,
    isBorrowed,
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances
  } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  useEffect(() => {
    const updatePrice = () => {
      const [baseAsset] = selectedPair.split('-');
      const marketIndex = getSpotMarketIndexBySymbol(baseAsset);
      if (marketIndex !== undefined) {
        // Find market in spotMarkets map (populated by DriftContext)
        const market = Array.from(driftSpotPositions || []).find(p => p.marketIndex === marketIndex);
        if (market && market.price > 0) {
          setCurrentMarketPrice(market.price);
        } else {
          // Fallback to searching spotMarkets map for oracle data if needed
          // (Though spotPositions already includes current oracle price in my previous edit)
        }
      }
    };

    updatePrice();
    const interval = setInterval(updatePrice, 2000);
    return () => clearInterval(interval);
  }, [selectedPair, driftSpotPositions, getSpotMarketIndexBySymbol]);

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
    // For BUY: use quote balance (USDC/USDT)
    // For SELL: use base balance (SOL/BTC/etc)
    const balance = activeTab === 'buy' ? quoteBalance : baseBalance;
    const calculatedAmount = (balance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  const executeTrade = async () => {
    setError(null);
    setSuccess(null);

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
      
      if (activeTab === 'buy') {
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

    if (parseFloat(amount) > (activeTab === 'buy' ? quoteBalance : baseBalance)) {
      setError(`Insufficient balance`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSwap = async (pin: string) => {
    setError(null);
    setSuccess(null);
    setExecuting(true);
    
    // Close confirm modal and show processing modal immediately
    setShowConfirmModal(false);
    setShowProcessingModal(true);
    setProcessingStatus('processing');
    setProcessingError('');
    setTxSignature('');

    try {
      const [baseAsset] = selectedPair.split('-');
      const marketIndex = getSpotMarketIndexBySymbol(baseAsset);

      if (marketIndex === undefined) {
        throw new Error(`Spot market not found on Drift: ${baseAsset}. Please check if this market is available.`);
      }

      console.log('[BinanceOrderForm] Placing SPOT order:', {
        selectedPair,
        baseAsset,
        marketIndex,
        direction: activeTab === 'buy' ? 'buy' : 'sell',
        amount,
        orderType,
      });

      const amountNum = parseFloat(amount);
      const priceNum = price ? parseFloat(price) : undefined;
      const stopPriceNum = stopPrice ? parseFloat(stopPrice) : undefined;
      
      const result = await placeSpotOrder(
        marketIndex,
        activeTab === 'buy' ? 'buy' : 'sell',
        amountNum,
        orderType,
        priceNum,
        stopPriceNum
      );

      if (!result.success) throw new Error(result.error || 'Drift spot order failed');

      // Transaction sent! Show signature immediately
      setTxSignature(result.txSignature || '');
      setProcessingStatus('success');
      
      // Clear form
      setAmount('');
      setPrice('');
      setStopPrice('');
      setTotal('');
      setSliderValue(0);

      // Close modal immediately after showing tx hash (2 seconds for user to see/copy)
      setTimeout(() => {
        setShowProcessingModal(false);
        setSuccess(null);
      }, 2000);

      // Refresh balances in background (non-blocking)
      setTimeout(() => {
        refetchBalances();
        if (onTradeExecuted) onTradeExecuted();
      }, 100);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute trade';
      setProcessingStatus('error');
      setProcessingError(errorMsg);
      setError(errorMsg);
    } finally {
      setExecuting(false);
    }
  };

  const currentBalance = activeTab === 'buy' ? quoteBalance : baseBalance;
  const currentToken = activeTab === 'buy' ? quoteAsset : baseAsset;
  const equivalentToken = activeTab === 'buy' ? baseAsset : quoteAsset;
  const isCurrentBorrowed = activeTab === 'buy' ? isBorrowed.quote : isBorrowed.base;

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] text-white">
      {/* Buy/Sell Tabs */}
      <div className="flex border-b border-[#2b3139] shrink-0">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'buy'
              ? 'text-[#0ecb81] border-b-2 border-[#0ecb81]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'sell'
              ? 'text-[#f6465d] border-b-2 border-[#f6465d]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-[#2b3139] shrink-0">
        {(['limit', 'market', 'stop-limit'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`text-xs font-medium transition-colors ${
              orderType === type ? 'text-white' : 'text-[#848e9c] hover:text-white'
            }`}
          >
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Available Balance */}
        <div className="flex justify-between text-xs">
          <span className="text-[#848e9c]">Available</span>
          <span className="text-white font-mono">
            {loadingBalances ? 'Loading...' : `${currentBalance.toFixed(6)} ${currentToken}`}
          </span>
        </div>

        {/* Stop Price (for stop-limit) */}
        {orderType === 'stop-limit' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">Stop Price</label>
            <div className="relative">
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {quoteAsset}
              </span>
            </div>
          </div>
        )}

        {/* Price (for limit and stop-limit) */}
        {(orderType === 'limit' || orderType === 'stop-limit') && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-1.5">
              {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {quoteAsset}
              </span>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs text-[#848e9c] mb-1.5">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
              {activeTab === 'buy' ? quoteAsset : baseAsset}
            </span>
          </div>
        </div>

        {/* Percentage Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentage(percent)}
              className="py-1.5 bg-[#2b3139] hover:bg-[#3b4149] rounded text-xs font-medium transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => handlePercentage(parseInt(e.target.value))}
            className={`w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer ${
              activeTab === 'buy' ? 'accent-[#0ecb81]' : 'accent-[#f6465d]'
            }`}
          />
        </div>

        {/* Total */}
        {total && (
          <div className="flex justify-between text-xs pt-2 border-t border-[#2b3139]">
            <span className="text-[#848e9c]">Total</span>
            <span className="text-white font-mono">{total} {quoteAsset}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded text-xs text-[#f6465d]">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-2 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded text-xs text-[#0ecb81]">
            {success}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-[#2b3139] shrink-0">
        <button
          onClick={executeTrade}
          disabled={executing || !amount}
          className={`w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'buy'
              ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
              : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
          }`}
        >
          {executing ? 'Processing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${baseAsset}`}
        </button>
      </div>

      <SpotSwapConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        quote={null}
        pair={selectedPair}
        side={activeTab}
        onConfirm={handleConfirmSwap}
        executing={executing}
      />

      <SpotOrderProcessingModal
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        status={processingStatus}
        side={activeTab}
        pair={selectedPair}
        amount={amount}
        error={processingError}
        txSignature={txSignature}
      />

      <SpotDepositModal
        isOpen={showDepositModal}
        onClose={() => {
          setShowDepositModal(false);
          refetchBalances();
        }}
        initialAsset={activeTab === 'buy' ? quoteAsset : baseAsset}
      />
    </div>
  );
}
