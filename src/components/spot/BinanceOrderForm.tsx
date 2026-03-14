'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';

interface BinanceOrderFormProps {
  selectedPair: string;
  pairData?: {
    name: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
  onTradeExecuted?: () => void;
  chain?: string;
  tokenAddress?: string;
  initialSide?: 'buy' | 'sell';
}

export default function BinanceOrderForm({ 
  selectedPair, 
  pairData,
  onTradeExecuted, 
  chain = 'ethereum', 
  tokenAddress, 
  initialSide = 'buy' 
}: BinanceOrderFormProps) {
  const { user } = useAuth();
  
  // Use Hyperliquid markets for price data
  const { markets: hyperliquidMarkets } = useHyperliquidMarkets({
    includeStats: true,
    enabled: true
  });

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>(initialSide);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMarketPrice, setCurrentMarketPrice] = useState(0);

  // Extract base and quote assets from pair
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  // Get current market price from Hyperliquid or pairData
  useEffect(() => {
    if (pairData?.price) {
      setCurrentMarketPrice(pairData.price);
    } else if (hyperliquidMarkets.length > 0) {
      const market = hyperliquidMarkets.find(m => 
        m.baseAsset === baseAsset || m.symbol === selectedPair
      );
      if (market) {
        setCurrentMarketPrice(market.price);
      }
    }
  }, [pairData, hyperliquidMarkets, baseAsset, selectedPair]);

  // Use spot balances hook for balance information
  const {
    baseBalance,
    quoteBalance,
    loading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances
  } = useSpotBalances(baseAsset, quoteAsset);

  // Update total when amount or price changes
  useEffect(() => {
    if (amount && (orderType === 'market' ? currentMarketPrice : price)) {
      const priceToUse = orderType === 'market' ? currentMarketPrice : parseFloat(price);
      const calculatedTotal = parseFloat(amount) * priceToUse;
      setTotal(calculatedTotal.toFixed(6));
    } else {
      setTotal('');
    }
  }, [amount, price, currentMarketPrice, orderType]);

  // Update amount when total changes (for buy orders)
  const handleTotalChange = (value: string) => {
    setTotal(value);
    if (value && (orderType === 'market' ? currentMarketPrice : price)) {
      const priceToUse = orderType === 'market' ? currentMarketPrice : parseFloat(price);
      if (priceToUse > 0) {
        const calculatedAmount = parseFloat(value) / priceToUse;
        setAmount(calculatedAmount.toFixed(8));
      }
    }
  };

  // Handle slider changes for percentage-based orders
  const handleSliderChange = (percentage: number) => {
    if (activeTab === 'buy' && quoteBalance > 0) {
      const availableBalance = quoteBalance * (percentage / 100);
      setTotal(availableBalance.toFixed(6));
      handleTotalChange(availableBalance.toFixed(6));
    } else if (activeTab === 'sell' && baseBalance > 0) {
      const availableAmount = baseBalance * (percentage / 100);
      setAmount(availableAmount.toFixed(8));
    }
  };

  // Handle order submission
  const handleSubmit = async () => {
    if (!user?.userId) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (orderType !== 'market' && (!price || parseFloat(price) <= 0)) {
      setError('Please enter a valid price');
      return;
    }

    if (orderType === 'stop-limit' && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      setError('Please enter a valid stop price');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: baseAsset,
          side: activeTab,
          amount: parseFloat(amount),
          price: orderType === 'market' ? 0 : parseFloat(price),
          orderType,
          stopPrice: orderType === 'stop-limit' ? parseFloat(stopPrice) : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success message
        alert(`${activeTab.toUpperCase()} order for ${amount} ${baseAsset} submitted successfully!`);
        
        // Reset form
        setAmount('');
        if (orderType !== 'market') setPrice('');
        setStopPrice('');
        setTotal('');
        
        // Refresh balances
        refetchBalances();
        
        if (onTradeExecuted) {
          onTradeExecuted();
        }
      } else {
        setError(result.error || 'Failed to submit order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit order';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = amount && parseFloat(amount) > 0 && 
    (orderType === 'market' || (price && parseFloat(price) > 0)) &&
    (orderType !== 'stop-limit' || (stopPrice && parseFloat(stopPrice) > 0));

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white">
      {/* Header Tabs */}
      <div className="flex border-b border-[#1e2329]">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'buy'
              ? 'text-[#0ecb81] border-b-2 border-[#0ecb81]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Buy {baseAsset}
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'sell'
              ? 'text-[#f6465d] border-b-2 border-[#f6465d]'
              : 'text-[#848e9c] hover:text-white'
          }`}
        >
          Sell {baseAsset}
        </button>
      </div>

      {/* Order Type Selector */}
      <div className="p-4 border-b border-[#1e2329]">
        <div className="flex gap-1 bg-[#1e2329] rounded p-1">
          {['market', 'limit', 'stop-limit'].map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type as any)}
              className={`flex-1 py-2 text-xs font-medium rounded transition-colors capitalize ${
                orderType === type
                  ? 'bg-[#f0b90b] text-black'
                  : 'text-[#848e9c] hover:text-white'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Price Input (for limit and stop-limit orders) */}
        {orderType !== 'market' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">
              {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={`0.00 ${quoteAsset}`}
                className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {quoteAsset}
              </span>
            </div>
          </div>
        )}

        {/* Stop Price Input (for stop-limit orders) */}
        {orderType === 'stop-limit' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Stop Price</label>
            <div className="relative">
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder={`0.00 ${quoteAsset}`}
                className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                {quoteAsset}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs text-[#848e9c] mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`0.00 ${baseAsset}`}
              className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
              {baseAsset}
            </span>
          </div>
        </div>

        {/* Percentage Slider */}
        <div>
          <div className="flex justify-between text-xs text-[#848e9c] mb-2">
            <span>Amount</span>
            <span>
              Balance: {activeTab === 'buy' ? quoteBalance.toFixed(4) : baseBalance.toFixed(4)} {activeTab === 'buy' ? quoteAsset : baseAsset}
            </span>
          </div>
          <div className="flex gap-2 mb-3">
            {[25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                onClick={() => handleSliderChange(percentage)}
                className="flex-1 py-1 text-xs border border-[#2b3139] rounded hover:border-[#f0b90b] transition-colors"
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>

        {/* Total Input */}
        <div>
          <label className="block text-xs text-[#848e9c] mb-2">Total</label>
          <div className="relative">
            <input
              type="number"
              value={total}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder={`0.00 ${quoteAsset}`}
              className="w-full px-3 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
              {quoteAsset}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded text-xs text-[#f6465d]">
            {error}
          </div>
        )}

        {/* Balance Info */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#848e9c]">{baseAsset} Balance:</span>
            <span className="text-white">{baseBalance.toFixed(4)} {baseAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848e9c]">{quoteAsset} Balance:</span>
            <span className="text-white">{quoteBalance.toFixed(4)} {quoteAsset}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-[#1e2329]">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading || balancesLoading}
          className={`w-full py-3 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'buy'
              ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
              : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
          }`}
        >
          {isLoading ? 'Processing...' : `${activeTab.toUpperCase()} ${baseAsset}`}
        </button>
      </div>
    </div>
  );
}