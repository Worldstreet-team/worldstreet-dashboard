'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';

interface MobileTradingFormProps {
  selectedPair: string;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
}

export default function MobileTradingForm({ selectedPair, chain, tokenAddress }: MobileTradingFormProps) {
  const { user } = useAuth();
  const { markets: hyperliquidMarkets } = useHyperliquidMarkets({
    includeStats: true,
    enabled: true
  });
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);

  const [baseAsset, quoteAsset] = selectedPair.split('-');

  // Fetch balances using the spot balances hook
  const {
    baseBalance,
    quoteBalance,
    loading: loadingBalances,
    refetch: refetchBalances
  } = useSpotBalances(baseAsset, quoteAsset);

  // Current balance based on buy/sell side
  const balance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? quoteAsset : baseAsset;
  const equivalentToken = side === 'buy' ? baseAsset : quoteAsset;

  // Update market price from Hyperliquid
  useEffect(() => {
    const updatePrice = () => {
      const market = hyperliquidMarkets.find(m => 
        m.baseAsset === baseAsset || m.symbol === selectedPair
      );
      if (market && market.price > 0) {
        setCurrentMarketPrice(market.price);
      }
    };

    updatePrice();
    const interval = setInterval(updatePrice, 2000);
    return () => clearInterval(interval);
  }, [selectedPair, hyperliquidMarkets, baseAsset]);

  // Update total calculation
  useEffect(() => {
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (side === 'buy') {
        const tokenAmount = parseFloat(amount) / currentMarketPrice;
        setTotal(tokenAmount.toFixed(6));
      } else {
        const usdtAmount = parseFloat(amount) * currentMarketPrice;
        setTotal(usdtAmount.toFixed(6));
      }
    } else if (orderType !== 'market' && amount && price) {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      setTotal((amountNum * priceNum).toFixed(6));
    }
  }, [amount, price, currentMarketPrice, orderType, side]);

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const calculatedAmount = (balance * value) / 100;
    setAmount(calculatedAmount.toFixed(6));
  };

  const handleSubmit = async () => {
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

    if (parseFloat(amount) > balance) {
      setError(`Insufficient balance`);
      return;
    }

    setExecuting(true);
    
    try {
      // For now, show a placeholder message since we're removing Drift
      // In a real implementation, this would integrate with Hyperliquid trading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`);
      
      // Reset form
      setAmount('');
      setPrice('');
      setStopPrice('');
      setTotal('');
      setSliderValue(0);

      // Refresh balances
      setTimeout(() => {
        refetchBalances();
      }, 100);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute trade');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col p-2 gap-2 bg-white dark:bg-darkgray h-full overflow-y-auto">
      {/* Buy/Sell Toggle */}
      <div className="flex bg-muted/20 dark:bg-white/5 rounded-lg p-0.5">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
            side === 'buy'
              ? 'bg-success text-white'
              : 'text-dark dark:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
            side === 'sell'
              ? 'bg-error text-white'
              : 'text-dark dark:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-2 border-b border-border dark:border-darkborder">
        {(['market', 'limit', 'stop-limit'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`text-xs font-medium pb-2 transition-colors ${
              orderType === type
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-dark dark:hover:text-white'
            }`}
          >
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Stop Price Input (for stop-limit orders) */}
      {orderType === 'stop-limit' && (
        <div>
          <label className="block text-xs text-muted mb-1">Stop Price</label>
          <div className="relative">
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-2 py-2 text-xs text-dark dark:text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">{quoteAsset}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            Order triggers when market reaches this price
          </div>
        </div>
      )}

      {/* Limit Price Input (for limit and stop-limit orders) */}
      {orderType !== 'market' && (
        <div>
          <label className="block text-xs text-muted mb-1">
            {orderType === 'stop-limit' ? 'Limit Price' : 'Price'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-2 py-2 text-xs text-dark dark:text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">{quoteAsset}</span>
          </div>
          {orderType === 'stop-limit' && (
            <div className="mt-0.5 text-[10px] text-muted">
              Order executes at this price after trigger
            </div>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-xs text-muted mb-1">
          {side === 'buy' ? `Amount (${quoteAsset})` : `Amount (${baseAsset})`}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-2 py-2 text-xs text-dark dark:text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">{currentToken}</span>
        </div>
        {total && <div className="mt-0.5 text-[10px] text-muted">≈ {total} {equivalentToken}</div>}
      </div>

      {/* Slider */}
      <div className="w-full">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={(e) => handleSliderChange(parseInt(e.target.value))}
          className="w-full h-1 bg-muted/30 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between mt-0.5">
          {[25, 50, 75, 100].map((val) => (
            <button
              key={val}
              onClick={() => handleSliderChange(val)}
              className="text-[9px] text-muted hover:text-primary transition-colors"
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Available Balance Section */}
      <div className="flex flex-col text-[10px] text-muted gap-0.5">
        <div className="flex justify-between">
          <span>Available</span>
          <span className="font-mono text-dark dark:text-white">
            {loadingBalances ? 'Loading...' : `${balance.toFixed(6)} ${currentToken}`}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-error/10 border border-error rounded-lg text-[10px] text-error">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-2 bg-success/10 border border-success rounded-lg text-[10px] text-success">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={executing || !amount}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-success hover:bg-success/90 text-white'
            : 'bg-error hover:bg-error/90 text-white'
        }`}
      >
        {executing ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${baseAsset}`}
      </button>
    </div>
  );
}
