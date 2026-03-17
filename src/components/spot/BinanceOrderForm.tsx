'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useHyperliquidMarkets } from '@/hooks/useHyperliquidMarkets';

interface SlippageEstimate {
  midPrice: number;
  bestBid: number;
  bestAsk: number;
  estimatedAvgPrice: number;
  slippagePct: number;
  estimatedValue: number;
  filledAmount: number;
  requestedAmount: number;
  fullyFilled: boolean;
  warning: string | null;
}

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
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMarketPrice, setCurrentMarketPrice] = useState(0);
  const [slippageEstimate, setSlippageEstimate] = useState<SlippageEstimate | null>(null);
  const [slippageLoading, setSlippageLoading] = useState(false);
  const slippageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bestBid, setBestBid] = useState(0);
  const [bestAsk, setBestAsk] = useState(0);
  const [showTPSL, setShowTPSL] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');

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

  // Fetch best bid/ask for limit order reference and warnings
  useEffect(() => {
    const fetchBidAsk = async () => {
      try {
        const res = await fetch(
          `/api/hyperliquid/slippage-estimate?coin=${baseAsset}&side=buy&amount=1`
        );
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.bestBid) setBestBid(data.data.bestBid);
          if (data.data.bestAsk) setBestAsk(data.data.bestAsk);
        }
      } catch { /* ignore */ }
    };
    fetchBidAsk();
    const interval = setInterval(fetchBidAsk, 5000);
    return () => clearInterval(interval);
  }, [baseAsset]);

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

  // Fetch slippage estimate for market orders (debounced 500ms)
  useEffect(() => {
    if (slippageTimer.current) clearTimeout(slippageTimer.current);

    if (orderType !== 'market' || !amount || parseFloat(amount) <= 0) {
      setSlippageEstimate(null);
      return;
    }

    setSlippageLoading(true);
    slippageTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hyperliquid/slippage-estimate?coin=${baseAsset}&side=${activeTab}&amount=${amount}`
        );
        const data = await res.json();
        if (data.success) {
          setSlippageEstimate(data.data);
        } else {
          setSlippageEstimate(null);
        }
      } catch {
        setSlippageEstimate(null);
      } finally {
        setSlippageLoading(false);
      }
    }, 500);

    return () => {
      if (slippageTimer.current) clearTimeout(slippageTimer.current);
    };
  }, [amount, orderType, activeTab, baseAsset]);

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

    // Validate TP/SL prices
    if (takeProfitPrice && parseFloat(takeProfitPrice) > 0) {
      if (activeTab === 'buy' && parseFloat(takeProfitPrice) <= currentMarketPrice) {
        setError('Take Profit must be above current price for buy orders');
        return;
      }
      if (activeTab === 'sell' && parseFloat(takeProfitPrice) >= currentMarketPrice) {
        setError('Take Profit must be below current price for sell orders');
        return;
      }
    }
    if (stopLossPrice && parseFloat(stopLossPrice) > 0) {
      if (activeTab === 'buy' && parseFloat(stopLossPrice) >= currentMarketPrice) {
        setError('Stop Loss must be below current price for buy orders');
        return;
      }
      if (activeTab === 'sell' && parseFloat(stopLossPrice) <= currentMarketPrice) {
        setError('Stop Loss must be above current price for sell orders');
        return;
      }
    }

    // Client-side minimum order value check ($10) — only for buys
    // Sells should always be allowed so users can close positions
    if (activeTab === 'buy') {
      const priceForCalc = orderType === 'market' ? currentMarketPrice : parseFloat(price);
      if (priceForCalc > 0) {
        const orderValue = parseFloat(amount) * priceForCalc;
        if (orderValue < 10) {
          setError(`Minimum order value is $10. Your order is worth $${orderValue.toFixed(2)}.`);
          return;
        }
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: baseAsset,
          side: activeTab,
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
        let msg = `${activeTab === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`;

        if (firstStatus?.filled) {
          const f = firstStatus.filled;
          msg = `Filled ${f.totalSz} ${baseAsset} @ $${parseFloat(f.avgPx).toFixed(4)} avg`;
        } else if (firstStatus?.resting) {
          msg = `Limit order placed (ID: ${firstStatus.resting.oid})`;
        }

        // Place TP/SL orders if set and main order filled immediately
        if (firstStatus?.filled && (takeProfitPrice || stopLossPrice)) {
          const fillSize = parseFloat(firstStatus.filled.totalSz);
          const oppositeSide = activeTab === 'buy' ? 'sell' : 'buy';
          const tpslParts: string[] = [];

          if (takeProfitPrice && parseFloat(takeProfitPrice) > 0) {
            try {
              const tpRes = await fetch('/api/hyperliquid/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  asset: baseAsset,
                  side: oppositeSide,
                  amount: fillSize,
                  price: parseFloat(takeProfitPrice),
                  orderType: 'stop-limit',
                  isSpot: true,
                  stopPrice: parseFloat(takeProfitPrice),
                  reduceOnly: true
                })
              });
              const tpResult = await tpRes.json();
              tpslParts.push(tpResult.success ? `TP set at $${takeProfitPrice}` : `TP failed: ${tpResult.error}`);
            } catch { tpslParts.push('TP placement failed'); }
          }

          if (stopLossPrice && parseFloat(stopLossPrice) > 0) {
            try {
              const slRes = await fetch('/api/hyperliquid/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  asset: baseAsset,
                  side: oppositeSide,
                  amount: fillSize,
                  price: parseFloat(stopLossPrice),
                  orderType: 'stop-limit',
                  isSpot: true,
                  stopPrice: parseFloat(stopLossPrice),
                  reduceOnly: true
                })
              });
              const slResult = await slRes.json();
              tpslParts.push(slResult.success ? `SL set at $${stopLossPrice}` : `SL failed: ${slResult.error}`);
            } catch { tpslParts.push('SL placement failed'); }
          }

          if (tpslParts.length > 0) msg += ` | ${tpslParts.join(' | ')}`;
        }

        setSuccess(msg);
        setTimeout(() => setSuccess(null), 8000);
        
        // Reset form
        setAmount('');
        if (orderType !== 'market') setPrice('');
        setStopPrice('');
        setTotal('');
        setTakeProfitPrice('');
        setStopLossPrice('');
        
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

  // Check if limit order would fill immediately
  const wouldFillImmediately = orderType === 'limit' && price && (
    (activeTab === 'buy' && bestAsk > 0 && parseFloat(price) >= bestAsk) ||
    (activeTab === 'sell' && bestBid > 0 && parseFloat(price) <= bestBid)
  );

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

        {/* Best Bid/Ask Reference (for limit orders) */}
        {orderType === 'limit' && bestAsk > 0 && (
          <div className="flex justify-between text-[10px] -mt-2">
            <button 
              type="button"
              onClick={() => setPrice(bestBid.toFixed(6))}
              className="text-[#0ecb81] hover:underline cursor-pointer"
            >
              Bid: ${bestBid.toFixed(4)}
            </button>
            <button 
              type="button"
              onClick={() => setPrice(bestAsk.toFixed(6))}
              className="text-[#f6465d] hover:underline cursor-pointer"
            >
              Ask: ${bestAsk.toFixed(4)}
            </button>
          </div>
        )}

        {/* Immediate Fill Warning (when limit price crosses spread) */}
        {wouldFillImmediately && (
          <div className="p-2 bg-[#f0b90b]/10 border border-[#f0b90b]/20 rounded text-xs text-[#f0b90b]">
            <Icon icon="ph:warning" width={12} className="inline mr-1" />
            This price is at or {activeTab === 'buy' ? 'above' : 'below'} market — order will fill immediately like a market order.
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

        {/* TP/SL Section */}
        {orderType !== 'stop-limit' && (
          <div>
            <button
              type="button"
              onClick={() => setShowTPSL(!showTPSL)}
              className="flex items-center gap-1 text-xs text-[#848e9c] hover:text-white transition-colors w-full"
            >
              <Icon icon={showTPSL ? 'ph:caret-down' : 'ph:caret-right'} width={12} />
              <span>Take Profit / Stop Loss</span>
              {(takeProfitPrice || stopLossPrice) && (
                <span className="ml-auto text-[10px] text-[#0ecb81]">Active</span>
              )}
            </button>
            {showTPSL && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-[10px] text-[#0ecb81] mb-1">Take Profit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(e.target.value)}
                      placeholder="TP price"
                      className="w-full px-3 py-1.5 bg-[#1e2329] border border-[#0ecb81]/30 rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#0ecb81]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{quoteAsset}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[#f6465d] mb-1">Stop Loss</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      placeholder="SL price"
                      className="w-full px-3 py-1.5 bg-[#1e2329] border border-[#f6465d]/30 rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f6465d]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{quoteAsset}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slippage Estimate (for market orders) */}
        {orderType === 'market' && amount && parseFloat(amount) > 0 && (
          <div className={`p-2.5 rounded border text-xs ${
            slippageEstimate && (slippageEstimate.slippagePct > 3 || !slippageEstimate.fullyFilled)
              ? 'bg-[#f6465d]/10 border-[#f6465d]/30'
              : slippageEstimate && slippageEstimate.slippagePct > 1
                ? 'bg-[#f0b90b]/10 border-[#f0b90b]/30'
                : 'bg-[#1e2329] border-[#2b3139]'
          }`}>
            {slippageLoading ? (
              <div className="flex items-center gap-1.5 text-[#848e9c]">
                <Icon icon="ph:circle-notch" className="animate-spin" width={12} />
                <span>Estimating fill price...</span>
              </div>
            ) : slippageEstimate ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#848e9c]">Est. fill price</span>
                  <span className="text-white font-medium">${slippageEstimate.estimatedAvgPrice.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848e9c]">Mid price</span>
                  <span className="text-white">${slippageEstimate.midPrice.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848e9c]">Est. slippage</span>
                  <span className={
                    slippageEstimate.slippagePct > 3 ? 'text-[#f6465d] font-bold'
                      : slippageEstimate.slippagePct > 1 ? 'text-[#f0b90b] font-medium'
                      : 'text-[#0ecb81]'
                  }>
                    {slippageEstimate.slippagePct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848e9c]">Est. total</span>
                  <span className="text-white">${slippageEstimate.estimatedValue.toFixed(2)} USDC</span>
                </div>
                {slippageEstimate.warning && (
                  <div className={`mt-1 pt-1 border-t ${
                    slippageEstimate.slippagePct > 3 || !slippageEstimate.fullyFilled
                      ? 'border-[#f6465d]/30 text-[#f6465d]'
                      : 'border-[#f0b90b]/30 text-[#f0b90b]'
                  }`}>
                    <Icon icon="ph:warning" width={12} className="inline mr-1" />
                    {slippageEstimate.warning}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded text-xs text-[#f6465d]">
            {error}
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="p-3 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded text-xs text-[#0ecb81]">
            {success}
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
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon icon="ph:circle-notch" className="animate-spin" width={16} />
              Processing...
            </span>
          ) : (
            `${activeTab.toUpperCase()} ${baseAsset}`
          )}
        </button>
      </div>
    </div>
  );
}