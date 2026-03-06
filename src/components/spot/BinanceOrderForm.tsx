'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';
import { useDrift } from '@/app/context/driftContext';
import SpotSwapConfirmModal from './SpotSwapConfirmModal';

interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
}

export default function BinanceOrderForm({ selectedPair, onTradeExecuted, chain, tokenAddress }: BinanceOrderFormProps) {
  const { user } = useAuth();
  const { placeSpotOrder, getSpotMarketIndexBySymbol } = useDrift();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [executing, setExecuting] = useState(false);

  const [tokenIn, tokenOut] = selectedPair.split('-');

  const effectiveChain = chain;

  const {
    tokenIn: baseBalance,  // Balance of base asset (BTC, ETH, SOL)
    tokenOut: quoteBalance, // Balance of quote asset (USDT)
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances
  } = usePairBalances(user?.userId, selectedPair, effectiveChain, tokenAddress);

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

    try {
      const [baseAsset, quoteAsset] = selectedPair.split('-');

      if (chain === 'sol') {
        const marketIndex = getSpotMarketIndexBySymbol(baseAsset);
        if (marketIndex === undefined) throw new Error(`Market not found on Drift: ${baseAsset}`);

        const amountNum = parseFloat(amount);
        const result = await placeSpotOrder(marketIndex, activeTab === 'buy' ? 'buy' : 'sell', amountNum);

        if (!result.success) throw new Error(result.error || 'Drift spot order failed');

        setSuccess(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order executed on Drift!`);
        setShowConfirmModal(false);
        setAmount('');
        setPrice('');
        setTotal('');
        setSliderValue(0);
        await refetchBalances();
        if (onTradeExecuted) onTradeExecuted();
        setTimeout(() => setSuccess(null), 5000);
        return;
      }

      // EVM / Existing logic
      const chainType = 'eth';
      const TOKEN_META: Record<string, Record<string, { address: string; decimals: number }>> = {
        eth: {
          ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
          BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
          USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
          USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        }
      };

      const chainMeta = TOKEN_META[chainType];
      let fromTokenMeta = activeTab === 'buy' ? chainMeta[quoteAsset] : chainMeta[baseAsset];
      let toTokenMeta = activeTab === 'buy' ? chainMeta[baseAsset] : chainMeta[quoteAsset];

      if (tokenAddress) {
        const decimalsResponse = await fetch(`/api/users/${user?.userId}/token-decimals?tokenAddress=${tokenAddress}&chain=${chainType}`);
        let actualDecimals = 18;
        if (decimalsResponse.ok) {
          const decimalsData = await decimalsResponse.ok ? await decimalsResponse.json() : null;
          if (decimalsData?.success) actualDecimals = decimalsData.decimals;
        }
        const baseTokenMeta = { address: tokenAddress, decimals: actualDecimals };
        if (activeTab === 'buy') toTokenMeta = baseTokenMeta; else fromTokenMeta = baseTokenMeta;
      }

      if (!fromTokenMeta || !toTokenMeta) throw new Error('Token not supported');

      const decimals = fromTokenMeta.decimals;
      const [intPart = '0', fracPart = ''] = amount.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';

      const response = await fetch('/api/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          fromChain: chainType,
          toChain: chainType,
          tokenIn: fromTokenMeta.address,
          tokenOut: toTokenMeta.address,
          amountIn: rawAmount,
          slippage: 0.005,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Failed to execute trade');

      setSuccess(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order executed! TX: ${result.txHash.slice(0, 10)}...`);
      setShowConfirmModal(false);
      setAmount('');
      setPrice('');
      setTotal('');
      setSliderValue(0);
      await refetchBalances();
      if (onTradeExecuted) onTradeExecuted();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute trade';
      setError(errorMsg);
      throw err;
    } finally {
      setExecuting(false);
    }
  };

  const currentBalance = activeTab === 'buy' ? quoteBalance : baseBalance;
  const currentToken = activeTab === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = activeTab === 'buy' ? tokenIn : tokenOut;

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
          <span className="text-[#848e9c]">Avbl</span>
          <span className="text-white font-mono">{loadingBalances ? 'Loading...' : `${currentBalance.toFixed(6)} ${currentToken}`}</span>
        </div>

        {balanceError && <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d] rounded text-xs text-[#f6465d]">{balanceError}</div>}

        {orderType !== 'market' && (
          <div>
            <label className="block text-xs text-[#848e9c] mb-2">Price</label>
            <div className="relative">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-[#2b3139] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{tokenOut}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-[#848e9c] mb-2">{activeTab === 'buy' ? `Amount (${tokenOut})` : `Amount (${tokenIn})`}</label>
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
          {executing ? 'Executing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${tokenIn}`}
        </button>
      </div>

      <SpotSwapConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} quote={null} pair={selectedPair} side={activeTab} onConfirm={handleConfirmSwap} executing={executing} />
    </div>
  );
}
