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

    if (orderType !== 'market') {
      setError('Only market orders are supported currently');
      return;
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
        throw new Error(`Market not found on Drift: ${baseAsset}`);
      }

      const amountNum = parseFloat(amount);
      const result = await placeSpotOrder(
        marketIndex,
        activeTab === 'buy' ? 'buy' : 'sell',
        amountNum
      );

      if (!result.success) throw new Error(result.error || 'Drift spot order failed');

      // Success!
      setProcessingStatus('success');
      setTxSignature(result.txSignature || '');
      setSuccess(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order executed successfully!`);
      
      setAmount('');
      setPrice('');
      setTotal('');
      setSliderValue(0);

      // Refresh balances in background
      refetchBalances();
      if (onTradeExecuted) onTradeExecuted();

      // Auto-close success modal after 3 seconds
      setTimeout(() => {
        setShowProcessingModal(false);
        setSuccess(null);
      }, 3000);
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

      <div className="flex gap-4 px-4 py-3 border-b border-[#2b3139]">
        {(['market', 'limit', 'stop-limit'] as const).map((type) => (
          <button key={type} onClick={() => setOrderType(type)} className={`text-xs font-medium transition-colors ${orderType === type ? 'text-white' : 'text-[#848e9c] hover:text-white'}`}>
            {type === 'stop-limit' ? 'Stop-Limit' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="max-h-[25vh] overflow-y-auto scrollbar-hide px-4 py-4 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#848e9c]">
              {isCurrentBorrowed ? 'Borrowed' : 'Avbl'}
            </span>
            <button
              onClick={() => setShowDepositModal(true)}
              className="px-1.5 py-0.5 rounded bg-[#fcd535]/10 text-[#fcd535] text-[10px] hover:bg-[#fcd535]/20 font-bold transition-all transition-colors"
            >
              Deposit
            </button>
          </div>
          <span className={`font-mono ${isCurrentBorrowed ? 'text-[#f6465d]' : 'text-white'}`}>
            {loadingBalances ? 'Loading...' : `${currentBalance.toFixed(6)} ${currentToken}`}
          </span>
        </div>

        {balanceError && <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d] rounded text-xs text-[#f6465d]">{balanceError}</div>}

        {orderType !== 'market' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Price</label>
            <div className="relative">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{quoteAsset}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-[#848e9c] mb-2">
            {activeTab === 'buy' ? `Amount (${quoteAsset})` : `Amount (${baseAsset})`}
          </label>
          <div className="relative">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{currentToken}</span>
          </div>
          {total && <div className="mt-1 text-[10px] text-[#848e9c]">≈ {total} {equivalentToken}</div>}
        </div>

        <div>
          <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => handlePercentage(parseInt(e.target.value))} className="w-full h-1 bg-[#2b3139] rounded-lg appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, ${activeTab === 'buy' ? '#0ecb81' : '#f6465d'} 0%, ${activeTab === 'buy' ? '#0ecb81' : '#f6465d'} ${sliderValue}%, #2b3139 ${sliderValue}%, #2b3139 100%)` }} />
          <div className="flex justify-between mt-2">
            {[25, 50, 75, 100].map((val) => (
              <button key={val} onClick={() => handlePercentage(val)} className="text-[10px] text-[#848e9c] hover:text-white transition-colors">{val}%</button>
            ))}
          </div>
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
