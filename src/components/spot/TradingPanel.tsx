'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface QuoteResponse {
  expectedOutput: string;
  priceImpact: number;
  platformFee: string;
  gasEstimate: string;
  route?: string;
}

interface TradingPanelProps {
  selectedPair: string;
  onTradeExecuted?: () => void;
}

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

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Reset quote when inputs change
  useEffect(() => {
    setQuote(null);
    setError(null);
    setSuccess(null);
  }, [amount, slippage, selectedPair, side]);

  const fetchQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoadingQuote(true);
    setError(null);

    try {
      const response = await fetch('https://trading.watchup.site/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          chain: 'EVM',
          tokenIn: side === 'buy' ? tokenOut : tokenIn,
          tokenOut: side === 'buy' ? tokenIn : tokenOut,
          amountIn: amount,
          slippage: parseFloat(slippage)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch quote');
      }

      const data = await response.json();
      setQuote(data);
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
      const response = await fetch('https://trading.watchup.site/api/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.userId,
          chain: 'EVM',
          tokenIn: side === 'buy' ? tokenOut : tokenIn,
          tokenOut: side === 'buy' ? tokenIn : tokenOut,
          amountIn: amount,
          slippage: parseFloat(slippage)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Trade execution failed');
      }

      const data = await response.json();
      setSuccess(`Trade executed! Tx: ${data.txHash?.slice(0, 10)}...`);
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

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-muted mb-2">
          Amount ({side === 'buy' ? tokenOut : tokenIn})
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
                {parseFloat(quote.expectedOutput).toFixed(6)} {side === 'buy' ? tokenIn : tokenOut}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Price Impact:</span>
              <span className={`font-semibold ${
                quote.priceImpact > 5 ? 'text-error' : quote.priceImpact > 1 ? 'text-warning' : 'text-success'
              }`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Platform Fee (0.3%):</span>
              <span className="text-dark dark:text-white font-mono text-xs">
                {parseFloat(quote.platformFee).toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Gas Estimate:</span>
              <span className="text-dark dark:text-white font-mono text-xs">
                ~${parseFloat(quote.gasEstimate).toFixed(2)}
              </span>
            </div>
          </div>

          {quote.priceImpact > 5 && (
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
