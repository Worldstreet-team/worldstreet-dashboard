'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface QuoteResponse {
  expectedOutput: string;
  priceImpact: number | string;
  platformFee: string;
  gasEstimate: string;
  route?: any;
  executionData?: any;
  toAmountMin?: string;
}

interface SpotOrderEntryProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Token addresses per chain
const SOLANA_TOKENS: Record<string, { address: string, decimals: number }> = {
  'SOL': { address: '11111111111111111111111111111111', decimals: 9 },
  'USDT': { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  'USDC': { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
};

const EVM_TOKENS: Record<string, { address: string, decimals: number }> = {
  'ETH': { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  'USDC': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  'BTC': { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
};

const TRON_TOKENS: Record<string, { address: string, decimals: number }> = {
  'TRX': { address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', decimals: 6 },
  'USDT': { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
  'USDC': { address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', decimals: 6 },
};

const getTokenChain = (token: string): 'Solana' | 'EVM' | 'Tron' => {
  if (token === 'SOL') return 'Solana';
  if (token === 'ETH' || token === 'BTC') return 'EVM';
  if (token === 'TRX') return 'Tron';
  // For stablecoins, default to Solana (will be overridden by user selection)
  return 'Solana';
};

const getTokenConfig = (token: string, chain: 'Solana' | 'EVM' | 'Tron') => {
  if (chain === 'Solana') {
    return SOLANA_TOKENS[token];
  } else if (chain === 'EVM') {
    return EVM_TOKENS[token];
  } else {
    return TRON_TOKENS[token];
  }
};

export default function SpotOrderEntry({ selectedPair, onTradeExecuted, isExpanded = true, onToggleExpand }: SpotOrderEntryProps) {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<'Solana' | 'EVM' | 'Tron'>('Solana');
  
  // Balance states
  const [buyBalance, setBuyBalance] = useState<number>(0);
  const [sellBalance, setSellBalance] = useState<number>(0);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [tokenIn, tokenOut] = selectedPair.split('-');
  const needsChainSelection = (tokenIn === 'USDT' || tokenIn === 'USDC') && (tokenOut === 'USDT' || tokenOut === 'USDC');

  useEffect(() => {
    if (!needsChainSelection) {
      if (tokenIn === 'SOL' || tokenOut === 'SOL') {
        setSelectedChain('Solana');
      } else if (tokenIn === 'ETH' || tokenOut === 'ETH' || tokenIn === 'BTC' || tokenOut === 'BTC') {
        setSelectedChain('EVM');
      } else if (tokenIn === 'TRX' || tokenOut === 'TRX') {
        setSelectedChain('Tron');
      }
    }
  }, [selectedPair, tokenIn, tokenOut, needsChainSelection]);

  useEffect(() => {
    setQuote(null);
    setError(null);
    setSuccess(null);
  }, [amount, slippage, selectedPair, selectedChain]);

  // Fetch balances when pair or chain changes
  useEffect(() => {
    fetchBalances();
  }, [selectedPair, selectedChain, user]);

  const fetchBalances = async () => {
    if (!user?.userId) {
      setBuyBalance(0);
      setSellBalance(0);
      return;
    }

    setLoadingBalances(true);
    try {
      // Determine which chain to use
      let chain: 'Solana' | 'EVM' | 'Tron';
      if (needsChainSelection) {
        chain = selectedChain;
      } else {
        chain = getTokenChain(tokenIn);
      }

      // Fetch balances from API
      const response = await fetch(`/api/users/${user.userId}/balances`);
      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      const balances = Array.isArray(data) ? data : data.balances || [];

      // Map chain to API chain format
      const chainKey = chain === 'Solana' ? 'sol' : chain === 'EVM' ? 'evm' : 'tron';

      // Find balance for buy side (tokenOut - what we're spending)
      const buyToken = tokenOut;
      const buyTokenBalance = balances.find(
        (b: any) => 
          b.asset.toUpperCase() === buyToken.toUpperCase() && 
          b.chain.toLowerCase() === chainKey
      );
      setBuyBalance(buyTokenBalance ? parseFloat(buyTokenBalance.available_balance) : 0);

      // Find balance for sell side (tokenIn - what we're selling)
      const sellToken = tokenIn;
      const sellTokenBalance = balances.find(
        (b: any) => 
          b.asset.toUpperCase() === sellToken.toUpperCase() && 
          b.chain.toLowerCase() === chainKey
      );
      setSellBalance(sellTokenBalance ? parseFloat(sellTokenBalance.available_balance) : 0);

    } catch (err) {
      console.error('Error fetching balances:', err);
      setBuyBalance(0);
      setSellBalance(0);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchQuote = async (side: 'buy' | 'sell') => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoadingQuote(true);
    setError(null);

    try {
      const fromToken = side === 'buy' ? tokenOut : tokenIn;
      const toToken = side === 'buy' ? tokenIn : tokenOut;
      
      let chain: 'Solana' | 'EVM' | 'Tron';
      if (needsChainSelection) {
        chain = selectedChain;
      } else {
        chain = getTokenChain(tokenIn);
      }
      
      const fromTokenConfig = getTokenConfig(fromToken, chain);
      const toTokenConfig = getTokenConfig(toToken, chain);
      
      if (!fromTokenConfig || !toTokenConfig) {
        setError(`Token configuration not found for ${chain} chain`);
        setLoadingQuote(false);
        return;
      }
      
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromTokenConfig.decimals)).toFixed(0);

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          fromChain: chain,
          toChain: chain,
          tokenIn: fromTokenConfig.address,
          tokenOut: toTokenConfig.address,
          amountIn: amountInSmallestUnit,
          slippage: parseFloat(slippage) / 100
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch quote');
      }

      const data = await response.json();
      setQuote({ ...data, _fromDecimals: fromTokenConfig.decimals, _toDecimals: toTokenConfig.decimals });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingQuote(false);
    }
  };

  const executeTrade = async (side: 'buy' | 'sell') => {
    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const fromToken = side === 'buy' ? tokenOut : tokenIn;
      const toToken = side === 'buy' ? tokenIn : tokenOut;
      
      let chain: 'Solana' | 'EVM' | 'Tron';
      if (needsChainSelection) {
        chain = selectedChain;
      } else {
        chain = getTokenChain(tokenIn);
      }
      
      const fromTokenConfig = getTokenConfig(fromToken, chain);
      const toTokenConfig = getTokenConfig(toToken, chain);
      
      if (!fromTokenConfig || !toTokenConfig) {
        setError(`Token configuration not found for ${chain} chain`);
        setExecuting(false);
        return;
      }
      
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromTokenConfig.decimals)).toFixed(0);

      const response = await fetch('/api/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          fromChain: chain,
          toChain: chain,
          tokenIn: fromTokenConfig.address,
          tokenOut: toTokenConfig.address,
          amountIn: amountInSmallestUnit,
          slippage: parseFloat(slippage) / 100
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Trade execution failed');
      }

      const data = await response.json();
      
      if (data.position) {
        const positionInfo = side === 'buy' 
          ? `Position opened: ${data.position.quantity} ${data.position.baseAsset} @ ${data.position.entryPrice}`
          : `Position reduced: ${data.position.soldQuantity} ${data.position.baseAsset}`;
        setSuccess(`Trade executed! ${positionInfo}`);
      } else {
        setSuccess(`Trade executed! Tx: ${data.txHash?.slice(0, 10)}...`);
      }
      
      setAmount('');
      setPrice('');
      setTotal('');
      setQuote(null);
      
      // Refresh balances after trade
      await fetchBalances();
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handlePercentage = (percent: number, side: 'buy' | 'sell') => {
    const balance = side === 'buy' ? buyBalance : sellBalance;
    const calculatedAmount = (balance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
  };

  return (
    <div className="bg-white dark:bg-darkgray border-t border-border dark:border-darkborder">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border dark:border-darkborder bg-muted/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-dark dark:text-white">
            Order Entry
          </span>
          {!isExpanded && (
            <span className="text-[9px] text-muted">
              {selectedPair.replace('-', '/')}
            </span>
          )}
        </div>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-muted/20 dark:hover:bg-white/10 rounded transition-colors"
            title={isExpanded ? 'Collapse order entry' : 'Expand order entry'}
          >
            <Icon 
              icon={isExpanded ? 'ph:caret-down' : 'ph:caret-up'} 
              width={14} 
              className="text-muted"
            />
          </button>
        )}
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border dark:border-darkborder">
            <button className="px-3 py-1.5 text-[10px] font-medium border-b-2 border-primary text-primary">
              Spot
            </button>
            <button className="px-3 py-1.5 text-[10px] font-medium text-muted hover:text-dark dark:hover:text-white">
              Cross
            </button>
            <button className="px-3 py-1.5 text-[10px] font-medium text-muted hover:text-dark dark:hover:text-white">
              Isolated
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex border-b border-border dark:border-darkborder px-2 py-1">
            <button
              onClick={() => setOrderType('limit')}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                orderType === 'limit'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType('market')}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                orderType === 'market'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              Market
            </button>
          </div>

          {/* Two-column layout: BUY | SELL */}
          <div className="grid grid-cols-2 gap-2 p-2">
            {/* BUY Panel */}
            <div className="space-y-2">
              <div className="text-[10px] text-muted mb-1">
                Available: {loadingBalances ? '...' : buyBalance.toFixed(6)} {tokenOut}
              </div>
              
              {orderType === 'limit' && (
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-success"
                />
              )}
              
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-success"
              />
              
              {/* Percentage Slider */}
              <div className="flex gap-1">
                {[25, 50, 75, 100].map(percent => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent, 'buy')}
                    className="flex-1 py-1 text-[9px] bg-muted/20 dark:bg-white/5 hover:bg-success/10 text-muted hover:text-success rounded transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="Total"
                className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-success"
              />
              
              <button
                onClick={() => executeTrade('buy')}
                disabled={executing || !amount}
                className="w-full py-2 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? 'Executing...' : `Buy ${tokenIn}`}
              </button>
            </div>

            {/* SELL Panel */}
            <div className="space-y-2">
              <div className="text-[10px] text-muted mb-1">
                Available: {loadingBalances ? '...' : sellBalance.toFixed(6)} {tokenIn}
              </div>
              
              {orderType === 'limit' && (
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
                />
              )}
              
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
              />
              
              {/* Percentage Slider */}
              <div className="flex gap-1">
                {[25, 50, 75, 100].map(percent => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent, 'sell')}
                    className="flex-1 py-1 text-[9px] bg-muted/20 dark:bg-white/5 hover:bg-error/10 text-muted hover:text-error rounded transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="Total"
                className="w-full px-2 py-1.5 bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder rounded text-xs text-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
              />
              
              <button
                onClick={() => executeTrade('sell')}
                disabled={executing || !amount}
                className="w-full py-2 bg-error hover:bg-error/90 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? 'Executing...' : `Sell ${tokenIn}`}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-2 mb-2 p-2 bg-error/10 border border-error/30 rounded text-[10px] text-error">
              {error}
            </div>
          )}
          {success && (
            <div className="mx-2 mb-2 p-2 bg-success/10 border border-success/30 rounded text-[10px] text-success">
              {success}
            </div>
          )}
        </>
      )}
    </div>
  );
}
