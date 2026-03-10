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
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (activeTab === 'buy') {
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
  }, [amount, price, currentMarketPrice, orderType, activeTab]);

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
    <div className="flex flex-col bg-[#181a20] text-white overflow-hidden">
      <div className="grid grid-cols-2 gap-0 border-b border-[#2b3139]">
        <button onClick={() => setActiveTab('buy')} className={`py-3 text-sm font-semibold transition-colors ${activeTab === 'buy' ? 'text-[#0ecb81] border-b-2 border-[#0ecb81]' : 'text-[#848e9c] hover:text-white'}`}>Buy</button>
        <button onClick={() => setActiveTab('sell')} className={`py-3 text-sm font-semibold transition-colors ${activeTab === 'sell' ? 'text-[#f6465d] border-b-2 border-[#f6465d]' : 'text-[#848e9c] hover:text-white'}`}>Sell</button>
      </div>

      <div className="flex gap-2 px-4 py-3 border-b border-[#2b3139]">
        {(['market', 'limit', 'stop-limit'] as const).map((type) => (
          <button key={type} onClick={() => setOrderType(type)} className={`text-xs font-medium pb-2 transition-colors ${orderType === type ? 'text-white border-b-2 border-white' : 'text-[#848e9c] hover:text-white'}`}>
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="max-h-[25vh] overflow-y-auto scrollbar-hide px-4 py-4 space-y-3">
        {/* Stop Price Input (for stop-limit orders) */}
        {orderType === 'stop-limit' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#848e9c]">Stop Price</span>
              <span className="text-xs text-[#848e9c]">{quoteAsset}</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={stopPrice} 
                onChange={(e) => setStopPrice(e.target.value)} 
                placeholder="0.00" 
                className="flex-1 px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" 
              />
              <button className="px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-white hover:bg-[#2b3139]/80 transition-colors">+</button>
            </div>
          </div>
        )}

        {/* Limit Price Input (for limit and stop-limit orders) */}
        {orderType !== 'market' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#848e9c]">
                {orderType === 'stop-limit' ? 'Limit Price' : 'Price (USDT)'}
              </span>
              <span className="text-xs text-[#848e9c]">{quoteAsset}</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="0.00" 
                className="flex-1 px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" 
              />
              <button className="px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-white hover:bg-[#2b3139]/80 transition-colors">+</button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#848e9c]">Amount ({baseAsset})</span>
            <span className="text-xs text-[#848e9c]">{currentToken}</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              className="flex-1 px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" 
            />
            <button className="px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-white hover:bg-[#2b3139]/80 transition-colors">+</button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#848e9c]">Total (USDT)</span>
          </div>
          <div className="px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white">
            {total || '0.00'}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-[#2b3139] accent-[#fcd535]" />
            <span className="text-xs text-[#848e9c]">TP/SL</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-[#2b3139] accent-[#fcd535]" />
            <span className="text-xs text-[#848e9c]">Iceberg</span>
          </label>
        </div>

        {error && <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d] rounded text-xs text-[#f6465d]">{error}</div>}
        {success && <div className="p-3 bg-[#0ecb81]/10 border border-[#0ecb81] rounded text-xs text-[#0ecb81]">{success}</div>}
      </div>

      <div className="p-4 border-t border-[#2b3139]">
        <button onClick={executeTrade} disabled={executing || !amount} className={`w-full py-3 rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'buy' ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90' : 'bg-[#f6465d] hover:bg-[#f6465d]/90'} text-white`}>
          {executing ? 'Executing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${baseAsset}`}
        </button>
      </div>

      <SpotSwapConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} quote={null} pair={selectedPair} side={activeTab} onConfirm={handleConfirmSwap} executing={executing} />

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
