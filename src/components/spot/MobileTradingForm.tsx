'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

interface MobileTradingFormProps {
  selectedPair: string;
  balance: number;
}

export default function MobileTradingForm({ selectedPair, balance }: MobileTradingFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [slippageTolerance, setSlippageTolerance] = useState(false);

  const [tokenIn, tokenOut] = selectedPair.split('-');
  const currentToken = side === 'buy' ? tokenOut : tokenIn;

  const handleSetMax = () => {
    setAmount(balance.toString());
    setSliderValue(100);
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const calculatedAmount = (balance * value) / 100;
    setAmount(calculatedAmount.toFixed(6));
  };

  return (
    <div className="flex flex-col p-3 gap-3 bg-white dark:bg-darkgray h-full overflow-y-auto">
      {/* Buy/Sell Toggle */}
      <div className="flex bg-muted/20 dark:bg-white/5 rounded-lg p-0.5">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
            side === 'buy'
              ? 'bg-success text-white'
              : 'text-dark dark:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
            side === 'sell'
              ? 'bg-error text-white'
              : 'text-dark dark:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Dropdown */}
      <button className="w-full rounded-lg bg-muted/20 dark:bg-white/5 px-3 py-2.5 flex items-center justify-between">
        <span className="text-sm text-dark dark:text-white">Market</span>
        <Icon icon="ph:caret-down" width={14} className="text-muted" />
      </button>

      {/* Market Price (Disabled) */}
      <div className="w-full rounded-lg bg-muted/30 dark:bg-white/10 px-3 py-2.5">
        <span className="text-sm text-muted">Market Price</span>
      </div>

      {/* Total Input Row */}
      <div className="flex gap-2">
        <input
          type="number"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0.00"
          className="flex-1 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder px-3 py-2.5 text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button className="px-4 py-2.5 rounded-lg bg-muted/20 dark:bg-white/5 border border-border dark:border-darkborder text-sm font-medium text-dark dark:text-white flex items-center gap-1">
          USDT
          <Icon icon="ph:caret-down" width={12} className="text-muted" />
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
        <div className="flex justify-between mt-1">
          {[0, 25, 50, 75, 100].map((val) => (
            <button
              key={val}
              onClick={() => handleSliderChange(val)}
              className="text-[10px] text-muted hover:text-primary transition-colors"
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Slippage Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="slippage"
          checked={slippageTolerance}
          onChange={(e) => setSlippageTolerance(e.target.checked)}
          className="w-4 h-4 rounded border-border dark:border-darkborder accent-primary"
        />
        <label htmlFor="slippage" className="text-xs text-dark dark:text-white cursor-pointer">
          Slippage Tolerance
        </label>
      </div>

      {/* Available / Max / Fee Section */}
      <div className="flex flex-col text-xs text-muted gap-1">
        <div className="flex justify-between">
          <span>Avbl</span>
          <span className="text-dark dark:text-white font-mono">
            {balance.toFixed(4)} {currentToken}
            <Icon icon="ph:warning" width={12} className="inline ml-1 text-warning" />
          </span>
        </div>
        <div className="flex justify-between">
          <span>Max Buy</span>
          <span className="text-dark dark:text-white font-mono">0 BTC</span>
        </div>
        <div className="flex justify-between">
          <span>Est. Fee</span>
          <span className="text-dark dark:text-white font-mono">-- BTC</span>
        </div>
      </div>

      {/* Buy Button */}
      <button
        className={`w-full py-3 rounded-lg font-semibold text-base mt-2 transition-colors ${
          side === 'buy'
            ? 'bg-success hover:bg-success/90 text-white'
            : 'bg-error hover:bg-error/90 text-white'
        }`}
      >
        {side === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
      </button>
    </div>
  );
}
