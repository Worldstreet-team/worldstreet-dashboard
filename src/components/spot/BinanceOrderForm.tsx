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
    <div className="flex flex-col bg-[#0f1117] text-white overflow-hidden max-h-[40vh]">
      {/* Order Type Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-[#2b3139]">
        {(['limit', 'market', 'stop-limit'] as const).map((type) => (
          <button key={type} onClick={() => setOrderType(type)} className={`text-sm font-medium pb-2 transition-colors ${orderType === type ? 'text-white border-b-2 border-white' : 'text-[#848e9c] hover:text-white'}`}>
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Two Column Layout for Buy/Sell */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* BUY Column */}
          <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${activeTab === 'buy' ? 'border-[#0ecb81] bg-[#0ecb81]/5' : 'border-[#2b3139]'}`} onClick={() => setActiveTab('buy')}>
            <div className="space-y-4">
              {/* Stop Price */}
              {orderType === 'stop-limit' && (
                <div>
                  <div className="text-xs text-[#848e9c] mb-1">Stop</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={stopPrice} 
                      onChange={(e) => setStopPrice(e.target.value)} 
                      placeholder="0.00" 
                      className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#0ecb81]" 
                    />
                    <span className="text-xs text-[#848e9c]">USDT</span>
                    <button className="p-1 hover:bg-[#2b3139] rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <div className="text-xs text-[#848e9c] mb-1">Price</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="0.00" 
                    className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#0ecb81]" 
                  />
                  <span className="text-xs text-[#848e9c]">USDT</span>
                  <button className="px-2 py-1 bg-[#2b3139] hover:bg-[#3b4149] rounded text-xs font-semibold transition-colors">BBO</button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="text-xs text-[#848e9c] mb-1">Amount</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#0ecb81]" 
                  />
                  <span className="text-xs text-[#848e9c]">{baseAsset}</span>
                  <button className="p-1 hover:bg-[#2b3139] rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div>
                <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => handlePercentage(parseInt(e.target.value))} className="w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer accent-[#0ecb81]" />
              </div>

              {/* Info */}
              <div className="text-[10px] text-[#848e9c] space-y-1 border-t border-[#2b3139] pt-2">
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className="text-white font-mono text-xs">{loadingBalances ? 'Loading...' : `${quoteBalance.toFixed(6)} ${quoteAsset}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Buy</span>
                  <span className="text-white font-mono text-xs">{loadingBalances ? 'Loading...' : `${quoteBalance.toFixed(6)} ${quoteAsset}`}</span>
                </div>
              </div>

              {/* Button */}
              <button onClick={executeTrade} disabled={executing || !amount} className="w-full py-2 rounded font-semibold text-sm bg-[#0ecb81] hover:bg-[#0ecb81]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
                {executing ? 'Processing...' : `Buy ${baseAsset}`}
              </button>
            </div>
          </div>

          {/* SELL Column */}
          <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${activeTab === 'sell' ? 'border-[#f6465d] bg-[#f6465d]/5' : 'border-[#2b3139]'}`} onClick={() => setActiveTab('sell')}>
            <div className="space-y-4">
              {/* Stop Price */}
              {orderType === 'stop-limit' && (
                <div>
                  <div className="text-xs text-[#848e9c] mb-1">Stop</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={stopPrice} 
                      onChange={(e) => setStopPrice(e.target.value)} 
                      placeholder="0.00" 
                      className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f6465d]" 
                    />
                    <span className="text-xs text-[#848e9c]">USDT</span>
                    <button className="p-1 hover:bg-[#2b3139] rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <div className="text-xs text-[#848e9c] mb-1">Price</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="0.00" 
                    className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f6465d]" 
                  />
                  <span className="text-xs text-[#848e9c]">USDT</span>
                  <button className="px-2 py-1 bg-[#2b3139] hover:bg-[#3b4149] rounded text-xs font-semibold transition-colors">BBO</button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="text-xs text-[#848e9c] mb-1">Amount</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="flex-1 px-2 py-1 bg-[#1a1f2e] border border-[#2b3139] rounded text-xs text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f6465d]" 
                  />
                  <span className="text-xs text-[#848e9c]">{baseAsset}</span>
                  <button className="p-1 hover:bg-[#2b3139] rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div>
                <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => handlePercentage(parseInt(e.target.value))} className="w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer accent-[#f6465d]" />
              </div>

              {/* Info */}
              <div className="text-[10px] text-[#848e9c] space-y-1 border-t border-[#2b3139] pt-2">
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className="text-white font-mono text-xs">{loadingBalances ? 'Loading...' : `${baseBalance.toFixed(6)} ${baseAsset}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Sell</span>
                  <span className="text-white font-mono text-xs">{loadingBalances ? 'Loading...' : `${baseBalance.toFixed(6)} ${baseAsset}`}</span>
                </div>
              </div>

              {/* Button */}
              <button onClick={executeTrade} disabled={executing || !amount} className="w-full py-2 rounded font-semibold text-sm bg-[#f6465d] hover:bg-[#f6465d]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
                {executing ? 'Processing...' : `Sell ${baseAsset}`}
              </button>
            </div>
          </div>
        </div>
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
