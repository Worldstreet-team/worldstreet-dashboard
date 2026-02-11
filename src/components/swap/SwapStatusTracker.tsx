"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { SwapQuote, SwapStatus, ChainKey, useSwap, SWAP_CHAINS } from "@/app/context/swapContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";

interface SwapStatusTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string | null;
  quote: SwapQuote | null;
  onSwapComplete?: () => void;
  onRetry?: () => void;
}

function formatAmount(amount: string, decimals: number): string {
  const value = parseFloat(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function getExplorerUrl(txHash: string, chain: ChainKey): string {
  if (chain === "ethereum") {
    return `https://etherscan.io/tx/${txHash}`;
  } else {
    return `https://solscan.io/tx/${txHash}`;
  }
}

const STATUS_MESSAGES: Record<string, string> = {
  PENDING: "Processing your swap...",
  DONE: "Swap completed successfully!",
  FAILED: "Swap failed",
  NOT_FOUND: "Transaction not found yet...",
};

const SUBSTATUS_MESSAGES: Record<string, string> = {
  WAIT_SOURCE_CONFIRMATIONS: "Waiting for source chain confirmations...",
  WAIT_DESTINATION_TRANSACTION: "Waiting for destination transaction...",
  BRIDGE_PENDING: "Bridge in progress...",
  WAIT_RELAYER: "Waiting for relayer...",
  COMPLETED: "Completed!",
};

export function SwapStatusTracker({
  isOpen,
  onClose,
  txHash,
  quote,
  onSwapComplete,
  onRetry,
}: SwapStatusTrackerProps) {
  const { pollSwapStatus, saveSwapToHistory, addSwappedToken } = useSwap();
  const { refreshCustomTokens: refreshSolTokens } = useSolana();
  const { refreshCustomTokens: refreshEvmTokens } = useEvm();
  const [status, setStatus] = useState<SwapStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [tokenAdded, setTokenAdded] = useState(false);

  // Poll status when modal is open and we have a txHash
  const pollStatus = useCallback(async () => {
    if (!txHash || !quote) return;

    try {
      const result = await pollSwapStatus(txHash, quote.fromChain, quote.toChain);
      setStatus(result);

      // Update in database
      if (result.status === "DONE" || result.status === "FAILED") {
        await fetch("/api/swap/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            txHash,
            status: result.status,
            substatus: result.substatus,
            receivingTxHash: result.receiving?.txHash,
            toAmount: result.toAmount || quote.toAmount,
          }),
        });

        if (result.status === "DONE") {
          // Auto-add the received token to the user's asset list
          if (!tokenAdded) {
            try {
              await addSwappedToken(quote.toToken, quote.toChain);
              setTokenAdded(true);
              // Refresh custom tokens so balance shows immediately
              if (quote.toChain === "solana") {
                await refreshSolTokens();
              } else {
                await refreshEvmTokens();
              }
            } catch (addErr) {
              console.error("[SwapStatus] Failed to auto-add token:", addErr);
            }
          }
          onSwapComplete?.();
        }
      }
    } catch (err) {
      console.error("Poll status error:", err);
      setError("Failed to check status");
    }
  }, [txHash, quote, pollSwapStatus, onSwapComplete]);

  useEffect(() => {
    if (!isOpen || !txHash || !quote) return;

    // Initial poll
    pollStatus();
    setPolling(true);

    // Poll every 10 seconds until complete
    const interval = setInterval(() => {
      if (status?.status === "DONE" || status?.status === "FAILED") {
        setPolling(false);
        clearInterval(interval);
        return;
      }
      pollStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [isOpen, txHash, quote, status?.status, pollStatus]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStatus(null);
      setError(null);
      setTokenAdded(false);
    }
  }, [isOpen]);

  if (!quote) return null;

  const fromChainInfo = SWAP_CHAINS[quote.fromChain];
  const toChainInfo = SWAP_CHAINS[quote.toChain];
  const isCrossChain = quote.fromChain !== quote.toChain;

  return (
    <Modal show={isOpen} onClose={onClose} size="md" dismissible>
      <ModalHeader className="border-b border-border dark:border-darkborder">
        Swap Status
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Token swap visual */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-lightgray dark:bg-darkborder flex items-center justify-center overflow-hidden mb-2">
              {quote.fromToken.logoURI ? (
                <img src={quote.fromToken.logoURI} alt={quote.fromToken.symbol} className="w-12 h-12" />
              ) : (
                <span className="font-bold text-muted">{quote.fromToken.symbol[0]}</span>
              )}
            </div>
            <p className="text-sm font-medium text-dark dark:text-white">
              {formatAmount(quote.fromAmount, quote.fromToken.decimals)}
            </p>
            <p className="text-xs text-muted">{quote.fromToken.symbol}</p>
            <p className="text-xs text-muted mt-1">{fromChainInfo.name}</p>
          </div>

          <Icon icon="ph:arrow-right" className="text-muted" width={24} />

          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-lightgray dark:bg-darkborder flex items-center justify-center overflow-hidden mb-2">
              {quote.toToken.logoURI ? (
                <img src={quote.toToken.logoURI} alt={quote.toToken.symbol} className="w-12 h-12" />
              ) : (
                <span className="font-bold text-muted">{quote.toToken.symbol[0]}</span>
              )}
            </div>
            <p className="text-sm font-medium text-dark dark:text-white">
              {status?.toAmount
                ? formatAmount(status.toAmount, quote.toToken.decimals)
                : formatAmount(quote.toAmount, quote.toToken.decimals)}
            </p>
            <p className="text-xs text-muted">{quote.toToken.symbol}</p>
            <p className="text-xs text-muted mt-1">{toChainInfo.name}</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="text-center py-4">
          {!status || status.status === "NOT_FOUND" || status.status === "PENDING" ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Icon icon="ph:spinner" className="text-primary animate-spin" width={32} />
              </div>
              <p className="text-lg font-medium text-dark dark:text-white">
                {status?.substatus
                  ? SUBSTATUS_MESSAGES[status.substatus] || status.substatusMessage || STATUS_MESSAGES.PENDING
                  : STATUS_MESSAGES.PENDING}
              </p>
              {isCrossChain && (
                <p className="text-sm text-muted mt-2">
                  Cross-chain swaps may take 1-20 minutes
                </p>
              )}
            </>
          ) : status.status === "DONE" ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Icon icon="ph:check-circle" className="text-success" width={32} />
              </div>
              <p className="text-lg font-medium text-success">
                {STATUS_MESSAGES.DONE}
              </p>
              <p className="text-sm text-muted mt-2">
                Your tokens have arrived on {toChainInfo.name}
              </p>
              {tokenAdded && (
                <p className="text-sm text-primary mt-1 font-medium">
                  {quote.toToken.symbol} has been added to your {toChainInfo.name} assets
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-3">
                <Icon icon="ph:x-circle" className="text-error" width={32} />
              </div>
              <p className="text-lg font-medium text-error">
                {STATUS_MESSAGES.FAILED}
              </p>
              <p className="text-sm text-muted mt-2">
                {status.substatusMessage || "The swap could not be completed"}
              </p>
            </>
          )}

          {error && (
            <p className="text-sm text-error mt-2">{error}</p>
          )}
        </div>

        {/* Transaction links */}
        {txHash && (
          <div className="space-y-2 pt-4 border-t border-border dark:border-darkborder">
            <a
              href={getExplorerUrl(txHash, quote.fromChain)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-lightgray dark:bg-darkborder rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon icon="ph:arrow-square-out" className="text-muted" width={16} />
                <span className="text-sm text-dark dark:text-white">
                  Source Transaction ({fromChainInfo.name})
                </span>
              </div>
              <span className="text-xs text-muted font-mono">
                {txHash.slice(0, 8)}...{txHash.slice(-6)}
              </span>
            </a>

            {status?.receiving?.txHash && (
              <a
                href={getExplorerUrl(status.receiving.txHash, quote.toChain)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-lightgray dark:bg-darkborder rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon icon="ph:arrow-square-out" className="text-muted" width={16} />
                  <span className="text-sm text-dark dark:text-white">
                    Destination Transaction ({toChainInfo.name})
                  </span>
                </div>
                <span className="text-xs text-muted font-mono">
                  {status.receiving.txHash.slice(0, 8)}...{status.receiving.txHash.slice(-6)}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {status?.status === "FAILED" && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Icon icon="ph:arrow-clockwise" width={18} />
              Retry Swap
            </button>
          )}
          <button
            onClick={onClose}
            className={`${
              status?.status === "FAILED" && onRetry ? "flex-1" : "w-full"
            } py-3 bg-lightgray dark:bg-darkborder text-dark dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
          >
            {status?.status === "DONE" || status?.status === "FAILED" ? "Close" : "Close (continues in background)"}
          </button>
        </div>

        {/* Polling indicator */}
        {polling && (
          <p className="text-xs text-muted text-center">
            Auto-refreshing every 10 seconds...
          </p>
        )}
      </ModalBody>
    </Modal>
  );
}

export default SwapStatusTracker;
