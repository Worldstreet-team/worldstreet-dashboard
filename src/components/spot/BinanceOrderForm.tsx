'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';
import SpotSwapConfirmModal from './SpotSwapConfirmModal';

interface BinanceOrderFormProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
}

export default function BinanceOrderForm({ selectedPair, onTradeExecuted, chain, tokenAddress }: BinanceOrderFormProps) {
  const { user } = useAuth();
  
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

  // Token metadata removed - now handled by backend

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Use the chain prop directly - it's now required and set by parent
  const effectiveChain = chain;
  console.log("CHAIN: ", effectiveChain, chain)

  // Use the custom hook to fetch pair balances
  const { 
    tokenIn: baseBalance,  // Balance of base asset (BTC, ETH, SOL)
    tokenOut: quoteBalance, // Balance of quote asset (USDT)
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances 
  } = usePairBalances(user?.userId, selectedPair, effectiveChain, tokenAddress);

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
    
    // Log which USDT is being used
    console.log('[BinanceOrderForm] Chain Mapping:', {
      selectedPair,
      effectiveChain,
      usdtChain: effectiveChain === 'sol' ? 'Solana USDT' : 'Ethereum USDT',
      tokenInChain: effectiveChain === 'sol' ? 'Solana' : 'Ethereum'
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
    setError(null);
    setSuccess(null);

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (orderType !== 'market') {
      setError('Only market orders are supported');
      return;
    }

    // Check balance
    if (parseFloat(amount) > currentBalance) {
      setError(`Insufficient ${currentToken} balance`);
      return;
    }

    // Show confirmation modal directly
    setShowConfirmModal(true);
  };

  const handleConfirmSwap = async (pin: string) => {
    setError(null);
    setSuccess(null);
    setExecuting(true);

    try {
      console.log('[BinanceOrderForm] Executing trade via backend');
      
      const [baseAsset, quoteAsset] = selectedPair.split('-');
      const chainType = effectiveChain === 'sol' ? 'sol' : 'eth';
      
      // Token metadata
      const TOKEN_META: Record<string, Record<string, { address: string; decimals: number }>> = {
        eth: {
          ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
          BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
          WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
          USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
          USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        },
        sol: {
          SOL: { address: '11111111111111111111111111111111', decimals: 9 },
          WSOL: { address: 'So11111111111111111111111111111111111111112', decimals: 9 },
          USDT: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
          USDC: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
        },
      };
      
      const chainMeta = TOKEN_META[chainType];
      
      // Get token addresses based on buy/sell
      // Use tokenAddress prop if available, otherwise fall back to TOKEN_META
      let fromTokenMeta = activeTab === 'buy' ? chainMeta[quoteAsset] : chainMeta[baseAsset];
      let toTokenMeta = activeTab === 'buy' ? chainMeta[baseAsset] : chainMeta[quoteAsset];
      
      // Override with tokenAddress if provided (for base asset)
      // For custom tokens, we need to fetch the actual decimals
      if (tokenAddress) {
        console.log('[BinanceOrderForm] Fetching decimals for custom token:', tokenAddress);
        
        // Fetch actual decimals from blockchain
        const decimalsResponse = await fetch(
          `/api/users/${user?.userId}/token-decimals?tokenAddress=${tokenAddress}&chain=${chainType}`
        );
        
        let actualDecimals = chainType === 'sol' ? 9 : 18; // Default
        
        if (decimalsResponse.ok) {
          const decimalsData = await decimalsResponse.json();
          if (decimalsData.success) {
            actualDecimals = decimalsData.decimals;
            console.log('[BinanceOrderForm] Fetched decimals:', actualDecimals);
          }
        }
        
        const baseTokenMeta = { address: tokenAddress, decimals: actualDecimals };
        if (activeTab === 'buy') {
          toTokenMeta = baseTokenMeta;
        } else {
          fromTokenMeta = baseTokenMeta;
        }
      }
      
      if (!fromTokenMeta || !toTokenMeta) {
        throw new Error('Token not supported');
      }
      
      // Convert amount to smallest unit
      const decimals = fromTokenMeta.decimals;
      const [intPart = '0', fracPart = ''] = amount.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
      
      console.log('[BinanceOrderForm] Trade params:', {
        userId: user?.userId,
        fromChain: chainType,
        toChain: chainType,
        tokenIn: fromTokenMeta.address,
        tokenOut: toTokenMeta.address,
        amountIn: rawAmount,
        decimals: fromTokenMeta.decimals,
        pair: selectedPair,
        side: activeTab
      });
      
      // Call backend execute-trade endpoint directly
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
          slippage: 0.005, // 0.5%
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to execute trade');
      }
      
      console.log('[BinanceOrderForm] Trade executed:', result);
      
      setSuccess(`${activeTab === 'buy' ? 'Buy' : 'Sell'} order executed! TX: ${result.txHash.slice(0, 10)}...`);
      setShowConfirmModal(false);
      
      // Reset form
      setAmount('');
      setPrice('');
      setTotal('');
      setSliderValue(0);
      
      // Refetch balances from backend (spot wallets)
      await refetchBalances();
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }

      // Clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute trade';
      setError(errorMsg);
      throw err; // Re-throw to show in modal
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
          {executing ? 'Executing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${tokenIn}`}
        </button>
      </div>

      {/* Confirmation Modal */}
      <SpotSwapConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        quote={null}
        pair={selectedPair}
        side={activeTab}
        onConfirm={handleConfirmSwap}
        executing={executing}
      />
    </div>
  );
}
