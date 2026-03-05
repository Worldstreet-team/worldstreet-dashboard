/**
 * Spot Quote Details Component
 * Displays LI.FI swap quote information
 */

'use client';

import { Icon } from '@iconify/react';
import { SpotSwapQuote } from '@/hooks/useSpotSwap';

interface SpotQuoteDetailsProps {
  quote: SpotSwapQuote;
  pair: string;
  side: 'buy' | 'sell';
}

export default function SpotQuoteDetails({ quote, pair, side }: SpotQuoteDetailsProps) {
  const [base, quoteToken] = pair.split('-');

  // Calculate total fees in USD
  const totalFeesUSD = quote.feeCosts.reduce((sum, fee) => sum + parseFloat(fee.amountUSD || '0'), 0);
  const totalGasUSD = quote.gasCosts.reduce((sum, gas) => sum + parseFloat(gas.amountUSD || '0'), 0);
  const totalCostUSD = totalFeesUSD + totalGasUSD;

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes}m`;
  };

  return (
    <div className="space-y-3">
      {/* Route Info */}
      <div className="flex items-center justify-between p-3 bg-[#2b3139] rounded-lg">
        <div className="flex items-center gap-2">
          <Icon icon="ph:swap" className="text-[#fcd535]" width={20} />
          <span className="text-sm text-white font-medium">{quote.route}</span>
        </div>
        <span className="text-xs text-[#848e9c]">{formatDuration(quote.estimatedDuration)}</span>
      </div>

      {/* Amounts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#848e9c]">You {side === 'buy' ? 'pay' : 'sell'}</span>
          <span className="text-white font-mono">
            {quote.fromAmount} {side === 'buy' ? quoteToken : base}
          </span>
        </div>
        
        <div className="flex items-center justify-center">
          <Icon 
            icon="ph:arrow-down" 
            className={side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'} 
            width={16} 
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[#848e9c]">You {side === 'buy' ? 'receive' : 'get'}</span>
          <span className="text-white font-mono font-semibold">
            {quote.toAmount} {side === 'buy' ? base : quoteToken}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-[#848e9c]">Minimum received</span>
          <span className="text-[#848e9c] font-mono">
            {quote.toAmountMin} {side === 'buy' ? base : quoteToken}
          </span>
        </div>
      </div>

      {/* Execution Price */}
      <div className="flex items-center justify-between p-2 bg-[#2b3139]/50 rounded">
        <span className="text-xs text-[#848e9c]">Execution Price</span>
        <span className="text-xs text-white font-mono">
          1 {base} = {quote.executionPrice} {quoteToken}
        </span>
      </div>

      {/* Fees Breakdown */}
      <div className="space-y-2">
        <div className="text-xs text-[#848e9c] font-medium">Fees</div>
        
        {/* Gas Costs */}
        {quote.gasCosts.map((gas, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-[#848e9c]">Network Fee ({gas.token.symbol})</span>
            <div className="text-right">
              <div className="text-white font-mono">{gas.amount}</div>
              <div className="text-[#848e9c]">${parseFloat(gas.amountUSD).toFixed(2)}</div>
            </div>
          </div>
        ))}

        {/* Protocol Fees */}
        {quote.feeCosts.map((fee, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-[#848e9c]">{fee.name}</span>
            <div className="text-right">
              <div className="text-white font-mono">{fee.amount}</div>
              <div className="text-[#848e9c]">${parseFloat(fee.amountUSD).toFixed(2)}</div>
            </div>
          </div>
        ))}

        {/* Total Cost */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#2b3139]">
          <span className="text-white font-medium">Total Cost</span>
          <span className="text-white font-mono">${totalCostUSD.toFixed(2)}</span>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-[rgba(252,213,53,0.1)] border border-[#fcd535] rounded-lg">
        <Icon icon="ph:warning" className="text-[#fcd535] flex-shrink-0 mt-0.5" width={16} />
        <p className="text-xs text-[#fcd535]">
          Price may change before confirmation. Minimum received amount is guaranteed.
        </p>
      </div>
    </div>
  );
}
