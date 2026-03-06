'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';

interface MobileTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'buy' | 'sell';
  selectedPair: string;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
}

export default function MobileTradingModal({ isOpen, onClose, side, selectedPair, chain, tokenAddress }: MobileTradingModalProps) {
  const { user } = useAuth();
  
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [showQuote, setShowQuote] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  // Token metadata for Li.Fi
  const TOKEN_META: Record<string, Record<string, { address: string; decimals: number }>> = {
    ethereum: {
      ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
      BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    },
    solana: {
      SOL: { address: '11111111111111111111111111111111', decimals: 9 },
      WSOL: { address: 'So11111111111111111111111111111111111111112', decimals: 9 },
      USDT: { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
      USDC: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    },
  };

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Use the chain prop directly - it's now required and set by parent
  const effectiveChain = chain;

  // Use the custom hook to fetch pair balances
  const { 
    tokenIn: baseBalance,  // Balance of base asset (BTC, ETH, SOL)
    tokenOut: quoteBalance, // Balance of quote asset (USDT)
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances 
  } = usePairBalances(user?.userId, selectedPair, effectiveChain, tokenAddress);

  // Current balance based on buy/sell side
  // Buy: spend USDT (quoteBalance), get token
  // Sell: spend token (baseBalance), get USDT
  const currentBalance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? tokenOut : tokenIn;
  const equivalentToken = side === 'buy' ? tokenIn : tokenOut;

  // Fetch current market price
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [selectedPair, isOpen]);

  // Auto-calculate total when amount or price changes
  useEffect(() => {
    if (orderType === 'market' && amount && currentMarketPrice > 0) {
      if (side === 'buy') {
        // Buying: amount is in USDT, calculate how much token you get
        const tokenAmount = parseFloat(amount) / currentMarketPrice;
        setTotal(tokenAmount.toFixed(6));
      } else {
        // Selling: amount is in token, calculate how much USDT you get
        const usdtAmount = parseFloat(amount) * currentMarketPrice;
        setTotal(usdtAmount.toFixed(6));
      }
    } else if (orderType === 'limit' && amount && price) {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      if (side === 'buy') {
        setTotal((amountNum * priceNum).toFixed(6));
      } else {
        setTotal((amountNum * priceNum).toFixed(6));
      }
    }
  }, [amount, price, currentMarketPrice, orderType, side]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('[MobileTradingModal] Balance Debug:', {
        userId: user?.userId,
        selectedPair,
        side,
        chain: effectiveChain,
        baseBalance,
        quoteBalance,
        currentBalance,
        loadingBalances,
        balanceError
      });
      
      // Log which USDT is being used
      console.log('[MobileTradingModal] Chain Mapping:', {
        selectedPair,
        effectiveChain,
        usdtChain: effectiveChain === 'sol' ? 'Solana USDT' : 'Ethereum USDT',
        tokenInChain: effectiveChain === 'sol' ? 'Solana' : 'Ethereum'
      });
    }
  }, [isOpen, user?.userId, selectedPair, side, effectiveChain, baseBalance, quoteBalance, currentBalance, loadingBalances, balanceError]);

  const handlePercentage = (percent: number) => {
    const calculatedAmount = (currentBalance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  if (!isOpen) return null;

  const handleGetQuote = async () => {
    // Reset messages
    setError(null);
    setSuccess(null);
    setPinError('');
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (orderType === 'limit') {
      setError('Limit orders not supported yet. Please use Market orders.');
      return;
    }
    
    // Check balance
    if (parseFloat(amount) > currentBalance) {
      setError(`Insufficient ${currentToken} balance`);
      return;
    }
    
    // Show PIN input directly
    setShowQuote(true);
  };

  const handleConfirmSwap = async () => {
    setPinError('');

    if (!pin || pin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    setExecuting(true);

    try {
      const chainType = effectiveChain === 'sol' ? 'sol' : 'eth';
      const chainMeta = effectiveChain === 'sol' ? TOKEN_META.solana : TOKEN_META.ethereum;
      
      // Get token addresses
      // Use tokenAddress prop if available, otherwise fall back to TOKEN_META
      let fromTokenMeta = side === 'buy' ? chainMeta[tokenOut] : chainMeta[tokenIn];
      let toTokenMeta = side === 'buy' ? chainMeta[tokenIn] : chainMeta[tokenOut];
      
      // Override with tokenAddress if provided (for base asset)
      // For custom tokens, we need to fetch the actual decimals
      if (tokenAddress) {
        console.log('[MobileTradingModal] Fetching decimals for custom token:', tokenAddress);
        
        // Fetch actual decimals from blockchain
        const decimalsResponse = await fetch(
          `/api/users/${user?.userId}/token-decimals?tokenAddress=${tokenAddress}&chain=${chainType}`
        );
        
        let actualDecimals = chainType === 'sol' ? 9 : 18; // Default
        
        if (decimalsResponse.ok) {
          const decimalsData = await decimalsResponse.json();
          if (decimalsData.success) {
            actualDecimals = decimalsData.decimals;
            console.log('[MobileTradingModal] Fetched decimals:', actualDecimals);
          }
        }
        
        const baseTokenMeta = { address: tokenAddress, decimals: actualDecimals };
        if (side === 'buy') {
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
      
      console.log('[MobileTradingModal] Executing trade:', {
        userId: user?.userId,
        fromChain: chainType,
        tokenIn: fromTokenMeta.address,
        tokenOut: toTokenMeta.address,
        amountIn: rawAmount
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
        // Sanitize error message for user display
        const rawError = result.message || result.error || 'Failed to execute trade';
        let userError = rawError;
        
        // Common error patterns and user-friendly messages
        if (rawError.toLowerCase().includes('insufficient')) {
          userError = 'Insufficient balance to complete this trade';
        } else if (rawError.toLowerCase().includes('slippage')) {
          userError = 'Price moved too much. Please try again with higher slippage';
        } else if (rawError.toLowerCase().includes('timeout') || rawError.toLowerCase().includes('timed out')) {
          userError = 'Transaction timed out. Please try again';
        } else if (rawError.toLowerCase().includes('network')) {
          userError = 'Network error. Please check your connection';
        } else if (rawError.toLowerCase().includes('not found') || rawError.toLowerCase().includes('no route')) {
          userError = 'No trading route found for this pair';
        } else if (rawError.toLowerCase().includes('wallet') || rawError.toLowerCase().includes('private key')) {
          userError = 'Wallet error. Please contact support';
        } else if (rawError.length > 100) {
          // Truncate very long error messages
          userError = rawError.substring(0, 100) + '...';
        }
        
        throw new Error(userError);
      }
      
      console.log('[MobileTradingModal] Trade executed:', result);
      
      setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} order executed! TX: ${result.txHash.slice(0, 10)}...`);
      
      // Refetch balances from backend (spot wallets)
      await refetchBalances();
      
      // Reset form
      setAmount('');
      setPrice('');
      setTotal('');
      setSliderValue(0);
      setPin('');
      setShowQuote(false);
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(errorMsg);
      setPinError(errorMsg);
    } finally {
      setExecuting(false);
    }
  };

  const handleBackToForm = () => {
    setShowQuote(false);
    setPin('');
    setPinError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:max-w-md bg-[#181a20] md:rounded-t-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-semibold text-white">
            {side === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2b3139] rounded-full transition-colors">
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {!showQuote ? (
            <>
              {/* Order Type Tabs */}
              <div className="flex gap-2 p-1 bg-[#2b3139] rounded-lg">
                <button
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    orderType === 'market'
                      ? 'bg-[#181a20] text-white'
                      : 'text-[#848e9c]'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  disabled
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors opacity-50 cursor-not-allowed ${
                    orderType === 'limit'
                      ? 'bg-[#181a20] text-white'
                      : 'text-[#848e9c]'
                  }`}
                >
                  Limit
                </button>
              </div>

              {/* Available Balance */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#848e9c]">Available</span>
                <span className="text-white font-mono">
                  {loadingBalances ? (
                    <span className="text-[#848e9c]">Loading...</span>
                  ) : balanceError ? (
                    <span className="text-[#f6465d]">Error</span>
                  ) : (
                    `${currentBalance.toFixed(6)} ${currentToken}`
                  )}
                </span>
              </div>

              {/* Balance Error Alert */}
              {balanceError && (
                <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-xs text-[#f6465d]">
                  {balanceError}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-[#848e9c] mb-2">
                  {side === 'buy' ? `Amount (${tokenOut})` : `Amount (${tokenIn})`}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                    {currentToken}
                  </span>
                </div>
                {/* Show equivalent */}
                {total && (
                  <div className="mt-2 text-xs text-[#848e9c]">
                    ≈ {total} {equivalentToken}
                  </div>
                )}
              </div>

              {/* Percentage Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent)}
                    className="py-2 bg-[#2b3139] hover:bg-[#2b3139]/80 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-sm text-[#f6465d]">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-[rgba(14,203,129,0.12)] border border-[#0ecb81] rounded-lg text-sm text-[#0ecb81]">
                  {success}
                </div>
              )}
            </>
          ) : (
            <>
              {/* PIN Input */}
              <div className="space-y-3">
                <label className="block text-sm text-[#848e9c] font-medium">
                  Enter PIN to confirm trade
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Enter your PIN"
                    maxLength={6}
                    disabled={executing}
                    className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] hover:text-white transition-colors"
                  >
                    <Icon icon={showPin ? 'ph:eye-slash' : 'ph:eye'} width={20} />
                  </button>
                </div>
                {pinError && (
                  <p className="text-xs text-[#f6465d]">{pinError}</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-sm text-[#f6465d]">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-[rgba(14,203,129,0.12)] border border-[#0ecb81] rounded-lg text-sm text-[#0ecb81]">
                  {success}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2b3139] safe-area-bottom space-y-2">
          {!showQuote ? (
            <button
              onClick={handleGetQuote}
              disabled={executing || !amount || loadingBalances}
              className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'buy'
                  ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                  : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
              }`}
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                  Executing...
                </span>
              ) : (
                `Continue`
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirmSwap}
                disabled={executing || !pin}
                className={`w-full py-4 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  side === 'buy'
                    ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                    : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                }`}
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                    Executing...
                  </span>
                ) : (
                  `Confirm ${side === 'buy' ? 'Buy' : 'Sell'}`
                )}
              </button>
              
              <button
                onClick={handleBackToForm}
                disabled={executing}
                className="w-full py-3 rounded-lg font-semibold text-base bg-[#2b3139] hover:bg-[#2b3139]/80 text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
