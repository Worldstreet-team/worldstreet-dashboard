'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';

interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain?: string; // Optional: specify blockchain network
}

export default function BinanceOrderForm({ selectedPair, onTradeExecuted, chain }: BinanceOrderFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);

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

  // Fetch current market price
  useEffect(() => {
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
  }, [selectedPair]);

  // Auto-calculate total when amount or price changes
  useEffect(() => {
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (activeTab === 'buy') {
        // Buying: amount is in USDT, calculate how much token you get
        const tokenAmount = parseFloat(amount) / currentMarketPrice;
        setTotal(tokenAmount.toFixed(6));
      } else {
        // Selling: amount is in token, calculate how much USDT you get
        const usdtAmount = parseFloat(amount) * currentMarketPrice;
        setTotal(usdtAmount.toFixed(6));
      }
    } else if (orderType !== 'market' && amount && price) {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      if (activeTab === 'buy') {
        // Buying: calculate USDT needed
        setTotal((amountNum * priceNum).toFixed(6));
      } else {
        // Selling: calculate USDT received
        setTotal((amountNum * priceNum).toFixed(6));
      }
    }
  }, [amount, price, currentMarketPrice, orderType, activeTab]);

  // Debug logging
  useEffect(() => {
    console.log('[BinanceOrderForm] Balance Debug:', {
      userId: user?.userId,
      selectedPair,
      chain: effectiveChain,
      baseBalance,
      quoteBalance,
      loadingBalances,
      balanceError,
      tokenIn,
      tokenOut,
      activeTab
    });
  }, [user?.userId, selectedPair, effectiveChain, baseBalance, quoteBalance, loadingBalances, balanceError, tokenIn, tokenOut, activeTab]);

  const handlePercentage = (percent: number) => {
    // When buying: use USDT balance (quoteBalance)
    // When selling: use token balance (baseBalance)
    const balance = activeTab === 'buy' ? quoteBalance : baseBalance;
    const calculatedAmount = (balance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  const executeTrade = async () => {
    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`);
      setAmount('');
      setPrice('');
      setTotal('');
      setSliderValue(0);
      
      // Refetch balances after trade
      await refetchBalances();
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  // Current balance and token based on buy/sell
  // Buy: spend USDT (quoteBalance), get token (tokenIn)
  // Sell: spend token (baseBalance), get USDT (tokenOut)
  const currentBalance = activeTab === 'buy' ? quoteBalance : baseBalance;
  const currentToken = activeTab === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = activeTab === 'buy' ? tokenIn : tokenOut;

  return (
    <div className="flex flex-col bg-[#181a20] text-white overflow-hidden">
      {/* Buy/Sell Tabs */}
      <div className="grid grid-cols-2 gap-0 border-b border-[#2b3139]">
        <button
          onClick={() => setActiveTab('buy')}
          className={`py-3 text-sm font-semibold transition-colors ${
            activeTab === 'buy'
              ? 'text-[#0ecb81] border-b-2 border-[#0ecb81]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`py-3 text-sm font-semibold transition-colors ${
            activeTab === 'sell'
              ? 'text-[#f6465d] border-b-2 border-[#f6465d]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-[#2b3139]">
        {(['market', 'limit', 'stop-limit'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`text-xs font-medium transition-colors ${
              orderType === type
                ? 'text-white'
                : 'text-[#848e9c] hover:text-white'
            }`}
          >
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="max-h-[25vh] overflow-y-auto scrollbar-hide px-4 py-4 space-y-4">
        {/* Available Balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#848e9c]">Avbl</span>
          <span className="text-white font-mono">
            {loadingBalances ? (
              <span className="text-[#848e9c]">Loading...</span>
            ) : balanceError ? (
              <span className="text-[#f6465d]">Error loading balance</span>
            ) : (
              `${currentBalance.toFixed(6)} ${currentToken}`
            )}
          </span>
        </div>

        {/* Balance Error Alert */}
        {balanceError && (
          <div className="p-2 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded text-xs text-[#f6465d]">
            {balanceError}
          </div>
        )}

        {/* Price Input (for limit orders) */}
        {orderType !== 'market' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Price</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {tokenOut}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs text-[#848e9c] mb-2">
            {activeTab === 'buy' ? `Amount (${tokenOut})` : `Amount (${tokenIn})`}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
              {currentToken}
            </span>
          </div>
          {/* Show equivalent */}
          {total && (
            <div className="mt-1 text-[10px] text-[#848e9c]">
              ≈ {total} {equivalentToken}
            </div>
          )}
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
              background: `linear-gradient(to right, ${activeTab === 'buy' ? '#0ecb81' : '#f6465d'} 0%, ${activeTab === 'buy' ? '#0ecb81' : '#f6465d'} ${sliderValue}%, #2b3139 ${sliderValue}%, #2b3139 100%)`
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

        {/* Total Input */}
        {orderType !== 'market' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Total</label>
            <div className="relative">
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {tokenOut}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded text-xs text-[#f6465d]">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-[rgba(14,203,129,0.12)] border border-[#0ecb81] rounded text-xs text-[#0ecb81]">
            {success}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-[#2b3139]">
        <button
          onClick={executeTrade}
          disabled={executing || !amount}
          className={`w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'buy'
              ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
              : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
          }`}
        >
          {executing ? 'Processing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${tokenIn}`}
        </button>
      </div>
    </div>
  );
}
