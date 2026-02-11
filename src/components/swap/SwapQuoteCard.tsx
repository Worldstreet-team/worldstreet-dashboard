"use client";

import { Icon } from "@iconify/react";
import { SwapQuote, SWAP_CHAINS } from "@/app/context/swapContext";

interface SwapQuoteCardProps {
  quote: SwapQuote;
  fromDecimals: number;
  toDecimals: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${Math.round(seconds / 3600)}h`;
}

function formatAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
  const value = parseFloat(amount) / Math.pow(10, decimals);
  if (value < 0.000001) return "<0.000001";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

export function SwapQuoteCard({ quote, fromDecimals, toDecimals }: SwapQuoteCardProps) {
  // Calculate total fees in USD
  const totalGasCostUSD = quote.gasCosts.reduce(
    (acc, cost) => acc + parseFloat(cost.amountUSD || "0"),
    0
  );
  const totalFeeCostUSD = quote.feeCosts.reduce(
    (acc, cost) => acc + parseFloat(cost.amountUSD || "0"),
    0
  );
  const totalCostUSD = totalGasCostUSD + totalFeeCostUSD;

  // Price impact (simplified calculation)
  const fromUSD = quote.fromToken.priceUSD ? 
    parseFloat(quote.fromAmount) / Math.pow(10, fromDecimals) * parseFloat(quote.fromToken.priceUSD) : 0;
  const toUSD = quote.toToken.priceUSD ?
    parseFloat(quote.toAmount) / Math.pow(10, toDecimals) * parseFloat(quote.toToken.priceUSD) : 0;
  const priceImpact = fromUSD > 0 ? ((fromUSD - toUSD - totalCostUSD) / fromUSD) * 100 : 0;

  const fromChainInfo = SWAP_CHAINS[quote.fromChain];
  const toChainInfo = SWAP_CHAINS[quote.toChain];
  const isCrossChain = quote.fromChain !== quote.toChain;

  return (
    <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4 space-y-3">
      {/* Route/Tool info */}
      {quote.toolDetails && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Route</span>
          <div className="flex items-center gap-2">
            {quote.toolDetails.logoURI && (
              <img
                src={quote.toolDetails.logoURI}
                alt={quote.toolDetails.name}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="text-sm font-medium text-dark dark:text-white">
              {quote.toolDetails.name}
            </span>
          </div>
        </div>
      )}

      {/* Cross-chain indicator */}
      {isCrossChain && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Bridge</span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-dark dark:text-white">{fromChainInfo.name}</span>
            <Icon icon="ph:arrow-right" className="text-muted" width={14} />
            <span className="text-dark dark:text-white">{toChainInfo.name}</span>
          </div>
        </div>
      )}

      {/* Expected output */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Expected Output</span>
        <span className="text-sm font-medium text-dark dark:text-white">
          {formatAmount(quote.toAmount, toDecimals)} {quote.toToken.symbol}
        </span>
      </div>

      {/* Minimum received (with slippage) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">Minimum Received</span>
          <div className="group relative">
            <Icon icon="ph:info" className="text-muted cursor-help" width={12} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-dark text-white text-xs p-2 rounded-lg shadow-lg w-40">
                Includes slippage tolerance
              </div>
            </div>
          </div>
        </div>
        <span className="text-sm text-dark dark:text-white">
          {formatAmount(quote.toAmountMin, toDecimals)} {quote.toToken.symbol}
        </span>
      </div>

      {/* Estimated time */}
      {quote.estimatedDuration > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Estimated Time</span>
          <div className="flex items-center gap-1.5">
            <Icon icon="ph:clock" className="text-muted" width={14} />
            <span className="text-sm text-dark dark:text-white">
              {formatDuration(quote.estimatedDuration)}
            </span>
          </div>
        </div>
      )}

      {/* Gas costs */}
      {totalGasCostUSD > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Network Fee</span>
          <span className="text-sm text-dark dark:text-white">
            ~${totalGasCostUSD.toFixed(2)}
          </span>
        </div>
      )}

      {/* Protocol fees */}
      {totalFeeCostUSD > 0.01 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Protocol Fee</span>
          <span className="text-sm text-dark dark:text-white">
            ~${totalFeeCostUSD.toFixed(2)}
          </span>
        </div>
      )}

      {/* Price impact warning */}
      {priceImpact > 1 && (
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          priceImpact > 5 ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
        }`}>
          <Icon icon="ph:warning" width={16} />
          <span className="text-xs">
            Price impact: {priceImpact.toFixed(2)}%
            {priceImpact > 5 && " - Consider swapping a smaller amount"}
          </span>
        </div>
      )}

      {/* Destination gas warning for cross-chain */}
      {isCrossChain && (
        <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
          <Icon icon="ph:info" className="text-blue-500" width={16} />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Make sure you have {toChainInfo.symbol} on {toChainInfo.name} for future transactions
          </span>
        </div>
      )}
    </div>
  );
}

export default SwapQuoteCard;
