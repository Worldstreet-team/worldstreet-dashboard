'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useDrift } from '@/app/context/driftContext';

interface MobileTradingFormProps {
  selectedPair: string;
  chain: string; // Required: specify blockchain network ('sol' or 'evm')
  tokenAddress?: string; // Optional: mint/contract address of the base asset
}

export default function MobileTradingForm({ selectedPair, chain, tokenAddress }: MobileTradingFormProps) {
  const { user } = useAuth();
  const { getSpotMarketIndexBySymbol } = useDrift();
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [slippageTolerance, setSlippageTolerance] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Current balance based on buy/sell side
  const balance = side === 'buy' ? quoteBalance : baseBalance;
  const currentToken = side === 'buy' ? quoteAsset : baseAsset;
  const isCurrentBorrowed = side === 'buy' ? isBorrowed.quote : isBorrowed.base;

  const handleSetMax = () => {
    setAmount(balance.toString());
    setSliderValue(100);
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const calculatedAmount = (balance * value) / 100;
    setAmount(calculatedAmount.toFixed(6));
  };

  const handleSubmit = async () => {
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!user?.userId) {
      setError('Please sign in to trade');
      return;
    }
    
    if (!total || parseFloat(total) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    // Check balance
    if (parseFloat(total) > balance) {
      setError(`Insufficient ${currentToken} balance`);
      return;
    }
    
    setExecuting(true);
    
    try {
      const chainType = chain === 'sol' ? 'sol' : 'eth';
      
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
      let fromTokenMeta = side === 'buy' ? chainMeta[quoteAsset] : chainMeta[baseAsset];
      let toTokenMeta = side === 'buy' ? chainMeta[baseAsset] : chainMeta[quoteAsset];
      
      // Override with tokenAddress if provided (for base asset)
      // For custom tokens, we need to fetch the actual decimals
      if (tokenAddress) {
        console.log('[MobileTradingForm] Fetching decimals for custom token:', tokenAddress);
        
        // Fetch actual decimals from blockchain
        const decimalsResponse = await fetch(
          `/api/users/${user.userId}/token-decimals?tokenAddress=${tokenAddress}&chain=${chainType}`
        );
        
        let actualDecimals = chainType === 'sol' ? 9 : 18; // Default
        
        if (decimalsResponse.ok) {
          const decimalsData = await decimalsResponse.json();
          if (decimalsData.success) {
            actualDecimals = decimalsData.decimals;
            console.log('[MobileTradingForm] Fetched decimals:', actualDecimals);
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
      const [intPart = '0', fracPart = ''] = total.split('.');
      const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
      const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
      
      console.log('[MobileTradingForm] Executing trade:', {
        userId: user.userId,
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
          userId: user.userId,
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
      
      console.log('[MobileTradingForm] Trade executed:', result);
      
      setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`);
      
      // Refetch balances from backend
      await refetchBalances();
      
      // Reset form
      setAmount('');
      setTotal('');
      setSliderValue(0);
      
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

      {/* Order Type Dropdown */}
      <button className="w-full rounded-lg bg-muted/20 dark:bg-white/5 px-2 py-2 flex items-center justify-between">
        <span className="text-xs text-dark dark:text-white">Market</span>
        <Icon icon="ph:caret-down" width={12} className="text-muted" />
      </button>

      {/* Market Price (Disabled) */}
      <div className="w-full rounded-lg bg-muted/30 dark:bg-white/10 px-2 py-2">
        <span className="text-xs text-muted">Market Price</span>
      </div>

      {/* Total Input Row */}
      <div className="flex gap-1.5">
        <input
          type="number"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0.00"
          className="flex-1 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-2 py-2 text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button className="px-3 py-2 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder text-xs font-medium text-dark dark:text-white flex items-center gap-1">
          USDT
          <Icon icon="ph:caret-down" width={10} className="text-muted" />
        </button>
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
          {[0, 25, 50, 75, 100].map((val) => (
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

      {/* Slippage Checkbox */}
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          id="slippage"
          checked={slippageTolerance}
          onChange={(e) => setSlippageTolerance(e.target.checked)}
          className="w-3 h-3 rounded border-border dark:border-darkborder accent-primary"
        />
        <label htmlFor="slippage" className="text-[10px] text-dark dark:text-white cursor-pointer">
          Slippage Tolerance
        </label>
      </div>

      {/* Available / Max / Fee Section */}
      <div className="flex flex-col text-[10px] text-muted gap-0.5">
        <div className="flex justify-between">
          <span>{isCurrentBorrowed ? 'Borrowed' : 'Avbl'}</span>
          <span className={`font-mono ${isCurrentBorrowed ? 'text-error' : 'text-dark dark:text-white'}`}>
            {loadingBalances ? 'Loading...' : `${balance.toFixed(4)} ${currentToken}`}
            {!loadingBalances && <Icon icon="ph:warning" width={10} className="inline ml-0.5 text-warning" />}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Max {side === 'buy' ? 'Buy' : 'Sell'}</span>
          <span className="text-dark dark:text-white font-mono">{balance.toFixed(4)} {currentToken}</span>
        </div>
        <div className="flex justify-between">
          <span>Est. Fee</span>
          <span className="text-dark dark:text-white font-mono">-- {currentToken}</span>
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

      {/* Buy Button */}
      <button
        onClick={handleSubmit}
        disabled={executing || !total}
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
