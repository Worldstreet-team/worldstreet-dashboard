'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface QuoteResponse {
  expectedOutput: string;
  priceImpact: number | string; // Can be number or string from backend
  platformFee: string;
  gasEstimate: string;
  route?: any;
  executionData?: any;
  toAmountMin?: string;
};

interface TradingPanelProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
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
  'BTC': { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }, // WBTC
};

// Determine which chain a token belongs to
const getTokenChain = (token: string): 'Solana' | 'EVM' => {
  if (token === 'SOL') return 'Solana';
  if (token === 'ETH' || token === 'BTC') return 'EVM';
  // For stablecoins, default to Solana if available, otherwise EVM
  return SOLANA_TOKENS[token] ? 'Solana' : 'EVM';
};

// Get token config for a specific chain
const getTokenConfig = (token: string, chain: 'Solana' | 'EVM') => {
  if (chain === 'Solana') {
    return SOLANA_TOKENS[token];
  } else {
    return EVM_TOKENS[token];
  }
};

export default function TradingPanel({ selectedPair, onTradeExecuted }: TradingPanelProps) {
  const { user } = useAuth();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Chain selection for stablecoins
  const [selectedChain, setSelectedChain] = useState<'Solana' | 'EVM'>('Solana');

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Determine if we need chain selection (both tokens are stablecoins available on multiple chains)
  const needsChainSelection = (tokenIn === 'USDT' || tokenIn === 'USDC') && (tokenOut === 'USDT' || tokenOut === 'USDC');
  
  // For pairs like SOL-USDT, default to Solana chain
  // For pairs like ETH-USDT, default to EVM chain
  useEffect(() => {
    if (!needsChainSelection) {
      if (tokenIn === 'SOL' || tokenOut === 'SOL') {
        setSelectedChain('Solana');
      } else if (tokenIn === 'ETH' || tokenOut === 'ETH' || tokenIn === 'BTC' || tokenOut === 'BTC') {
        setSelectedChain('EVM');
      }
    }
  }, [selectedPair, tokenIn, tokenOut, needsChainSelection]);

  // Reset quote when inputs change
  useEffect(() => {
    setQuote(null);
    setError(null);
    setSuccess(null);
  }, [amount, slippage, selectedPair, side, selectedChain]);

  const fetchQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoadingQuote(true);
    setError(null);

    try {
      // Determine which chain to use
      const fromToken = side === 'buy' ? tokenOut : tokenIn;
      const toToken = side === 'buy' ? tokenIn : tokenOut;
      
      // Use selected chain for stablecoin pairs, otherwise auto-detect
      let chain: 'Solana' | 'EVM';
      if (needsChainSelection) {
        chain = selectedChain;
      } else {
        chain = getTokenChain(tokenIn);
      }
      
      console.log('=== QUOTE REQUEST ===');
      console.log('Trading pair:', selectedPair);
      console.log('Side:', side);
      console.log('From token:', fromToken);
      console.log('To token:', toToken);
      console.log('Selected chain:', chain);
      console.log('Needs chain selection:', needsChainSelection);
      
      // Get token configs for the selected chain
      const fromTokenConfig = getTokenConfig(fromToken, chain);
      const toTokenConfig = getTokenConfig(toToken, chain);
      
      if (!fromTokenConfig || !toTokenConfig) {
        setError(`Token configuration not found for ${chain} chain`);
        setLoadingQuote(false);
        return;
      }
      
      console.log('From token config:', fromTokenConfig);
      console.log('To token config:', toTokenConfig);
      
      // Convert amount to smallest unit using the correct decimals
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromTokenConfig.decimals)).toFixed(0);
      
      console.log('Amount in smallest unit:', amountInSmallestUnit);

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
          slippage: parseFloat(slippage) / 100 // Convert percentage to decimal (0.5% -> 0.005)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch quote');
      }

      const data = await response.json();
      // Store the decimals with the quote for display
      setQuote({ ...data, _fromDecimals: fromTokenConfig.decimals, _toDecimals: toTokenConfig.decimals });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingQuote(false);
    }
  };

  const executeTrade = async () => {
    if (!quote) {
      setError('Please get a quote first');
      return;
    }

    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      // Determine which chain to use
      const fromToken = side === 'buy' ? tokenOut : tokenIn;
      const toToken = side === 'buy' ? tokenIn : tokenOut;
      
      // Use selected chain for stablecoin pairs, otherwise auto-detect
      let chain: 'Solana' | 'EVM';
      if (needsChainSelection) {
        chain = selectedChain;
      } else {
        chain = getTokenChain(tokenIn);
      }
      
      console.log('=== TRADE EXECUTION ===');
      console.log('Trading pair:', selectedPair);
      console.log('Side:', side);
      console.log('From token:', fromToken);
      console.log('To token:', toToken);
      console.log('Selected chain:', chain);
      
      // Get token configs for the selected chain
      const fromTokenConfig = getTokenConfig(fromToken, chain);
      const toTokenConfig = getTokenConfig(toToken, chain);
      
      if (!fromTokenConfig || !toTokenConfig) {
        setError(`Token configuration not found for ${chain} chain`);
        setExecuting(false);
        return;
      }
      
      console.log('From token config:', fromTokenConfig);
      console.log('To token config:', toTokenConfig);
      
      // Convert amount to smallest unit using the correct decimals
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, fromTokenConfig.decimals)).toFixed(0);
      
      console.log('Amount in smallest unit:', amountInSmallestUnit);

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
          slippage: parseFloat(slippage) / 100 // Convert percentage to decimal (0.5% -> 0.005)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Trade execution failed');
      }

      const data = await response.json();
      console.log('[TradingPanel] Trade execution response:', data);
      
      // Check if position was created/updated
      if (data.position) {
        console.log('[TradingPanel] Position created/updated:', data.position);
        const positionInfo = side === 'buy' 
          ? `Position opened: ${data.position.quantity} ${data.position.baseAsset} @ $${data.position.entryPrice}`
          : `Position reduced: ${data.position.soldQuantity} ${data.position.baseAsset}`;
        setSuccess(`Trade executed! ${positionInfo}. Tx: ${data.txHash?.slice(0, 10)}...`);
      } else {
        console.warn('[TradingPanel] No position data in response');
        setSuccess(`Trade executed! Tx: ${data.txHash?.slice(0, 10)}...`);
      }
      
      setAmount('');
      setQuote(null);
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="ph:currency-circle-dollar" className="text-primary" width={20} />
        <h3 className="font-semibold text-dark dark:text-white">Place Order</h3>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${
            side === 'buy'
              ? 'bg-success text-white'
              : 'bg-success/10 text-success hover:bg-success/20'
          }`}
        >
          Buy {tokenIn}
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${
            side === 'sell'
              ? 'bg-error text-white'
              : 'bg-error/10 text-error hover:bg-error/20'
          }`}
        >
          Sell {tokenIn}
        </button>
      </div>

      {/* Chain Selection for Stablecoins */}
      {needsChainSelection && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-2">
            Select Chain
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChain('Solana')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                selectedChain === 'Solana'
                  ? 'bg-primary text-white'
                  : 'bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10'
              }`}
            >
              <Icon icon="cryptocurrency:sol" width={16} />
              Solana
            </button>
            <button
              onClick={() => setSelectedChain('EVM')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                selectedChain === 'EVM'
                  ? 'bg-primary text-white'
                  : 'bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10'
              }`}
            >
              <Icon icon="cryptocurrency:eth" width={16} />
              Ethereum
            </button>
          </div>
          <p className="text-xs text-muted mt-1">
            Choose which blockchain to execute the trade on
          </p>
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-muted mb-2">
          Amount ({side === 'buy' ? tokenOut : tokenIn}
          {needsChainSelection && ` on ${selectedChain}`})
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Slippage */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-muted mb-2">
          Slippage Tolerance (%)
        </label>
        <div className="flex gap-2">
          {['0.1', '0.5', '1.0'].map(val => (
            <button
              key={val}
              onClick={() => setSlippage(val)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                slippage === val
                  ? 'bg-primary text-white'
                  : 'bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10'
              }`}
            >
              {val}%
            </button>
          ))}
          <input
            type="number"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-20 px-2 py-1.5 bg-white dark:bg-darkgray border border-border/50 dark:border-darkborder rounded-lg text-xs text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Get Quote Button */}
      <button
        onClick={fetchQuote}
        disabled={loadingQuote || !amount}
        className="w-full py-2.5 bg-primary/10 text-primary hover:bg-primary/20 font-semibold rounded-lg transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingQuote ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Getting Quote...
          </span>
        ) : (
          'Get Quote'
        )}
      </button>

      {/* Quote Display */}
      {quote && (
        <div className="mb-4 p-4 bg-muted/30 dark:bg-white/5 rounded-xl border border-border/50 dark:border-darkborder">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">You will receive:</span>
              <span className="text-dark dark:text-white font-semibold font-mono">
                {(parseFloat(quote.expectedOutput) / Math.pow(10, (quote as any)._toDecimals || 18)).toFixed(6)} {side === 'buy' ? tokenIn : tokenOut}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Price Impact:</span>
              <span className={`font-semibold ${
                parseFloat(quote.priceImpact.toString()) > 5 ? 'text-error' : parseFloat(quote.priceImpact.toString()) > 1 ? 'text-warning' : 'text-success'
              }`}>
                {parseFloat(quote.priceImpact.toString()).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Platform Fee (0.3%):</span>
              <span className="text-dark dark:text-white font-mono text-xs">
                {(parseFloat(quote.platformFee) / Math.pow(10, (quote as any)._fromDecimals || 18)).toFixed(6)}
              </span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-muted">Gas Estimate:</span>
              <span className="text-dark dark:text-white font-mono text-xs">
                ~${parseFloat(quote.gasEstimate).toFixed(2)}
              </span>
            </div> */}
          </div>

          {parseFloat(quote.priceImpact.toString()) > 5 && (
            <div className="mt-3 p-2 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2">
              <Icon icon="ph:warning" className="text-error shrink-0 mt-0.5" width={16} />
              <p className="text-xs text-error">
                High price impact! Consider reducing your trade size.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={executeTrade}
        disabled={!quote || executing}
        className={`w-full py-3 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-success hover:bg-success/90 text-white'
            : 'bg-error hover:bg-error/90 text-white'
        }`}
      >
        {executing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Executing Trade...
          </span>
        ) : (
          `${side === 'buy' ? 'Buy' : 'Sell'} ${tokenIn}`
        )}
      </button>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-border/50 dark:border-darkborder">
        <div className="flex items-start gap-2 text-xs text-muted">
          <Icon icon="ph:info" className="shrink-0 mt-0.5" width={14} />
          <p>
            Trades are executed via 1inch DEX aggregator. Platform fee: 0.3%. 
            Funds are locked during execution and automatically unlocked on failure.
          </p>
        </div>
      </div>
    </div>
  );
}
