"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useSwap, SwapToken, ChainKey, SWAP_CHAINS, formatSwapError } from "@/app/context/swapContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useWallet } from "@/app/context/walletContext";
import TokenSelectModal from "./TokenSelectModal";
import SwapSettings from "./SwapSettings";
import SwapQuoteCard from "./SwapQuoteCard";
import SwapStatusTracker from "./SwapStatusTracker";
import PinConfirmModal from "./PinConfirmModal";

export function SwapInterface() {
  const {
    tokens,
    quote,
    quoteLoading,
    quoteError,
    executing,
    getQuote,
    executeSwap,
    fetchTokens,
    saveSwapToHistory,
  } = useSwap();

  const { address: solAddress, balance: solBalance, tokenBalances: solTokens, fetchBalance: fetchSolBalance, refreshCustomTokens: refreshSolCustom } = useSolana();
  const { address: evmAddress, balance: ethBalance, tokenBalances: evmTokens, fetchBalance: fetchEvmBalance, refreshCustomTokens: refreshEvmCustom } = useEvm();
  const { walletsGenerated } = useWallet();

  // Form state
  const [fromChain, setFromChain] = useState<ChainKey>("solana");
  const [toChain, setToChain] = useState<ChainKey>("ethereum");
  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  
  // UI state
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get addresses based on chain
  const fromAddress = fromChain === "solana" ? solAddress : evmAddress;
  const toAddress = toChain === "solana" ? solAddress : evmAddress;

  // Get balance for the selected from token
  const fromBalance = useMemo(() => {
    if (!fromToken) return 0;
    
    if (fromChain === "solana") {
      // Handle both native SOL and wrapped SOL
      const isSOL = 
        fromToken.symbol === "SOL" ||
        fromToken.address === "So11111111111111111111111111111111111111112" ||
        fromToken.address === "11111111111111111111111111111111";
      
      if (isSOL) {
        return solBalance;
      }
      
      // For other tokens, check token balances
      const found = solTokens.find(t => 
        t.mint.toLowerCase() === fromToken.address.toLowerCase() ||
        t.address.toLowerCase() === fromToken.address.toLowerCase()
      );
      return found?.amount ?? 0;
    } else {
      // Ethereum chain
      const isETH = 
        fromToken.symbol === "ETH" ||
        fromToken.address === "0x0000000000000000000000000000000000000000";
      
      if (isETH) {
        return ethBalance;
      }
      
      const found = evmTokens.find(t => t.address.toLowerCase() === fromToken.address.toLowerCase());
      return found?.amount ?? 0;
    }
  }, [fromToken, fromChain, solBalance, ethBalance, solTokens, evmTokens]);

  // Load tokens when chains change
  useEffect(() => {
    if (tokens[fromChain].length === 0) {
      fetchTokens(fromChain);
    }
    if (tokens[toChain].length === 0) {
      fetchTokens(toChain);
    }
  }, [fromChain, toChain, tokens, fetchTokens]);

  // Auto-select default tokens when available
  useEffect(() => {
    if (!fromToken && tokens[fromChain].length > 0) {
      // Try to select native token or USDT/USDC
      const native = tokens[fromChain].find(t => 
        t.symbol === (fromChain === "solana" ? "SOL" : "ETH") ||
        t.address === (fromChain === "solana" 
          ? "So11111111111111111111111111111111111111112"
          : "0x0000000000000000000000000000000000000000")
      );
      const usdt = tokens[fromChain].find(t => t.symbol === "USDT");
      setFromToken(native || usdt || tokens[fromChain][0]);
    }
  }, [tokens, fromChain, fromToken]);

  useEffect(() => {
    if (!toToken && tokens[toChain].length > 0) {
      const usdc = tokens[toChain].find(t => t.symbol === "USDC");
      const usdt = tokens[toChain].find(t => t.symbol === "USDT");
      setToToken(usdc || usdt || tokens[toChain][0]);
    }
  }, [tokens, toChain, toToken]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && fromAddress && toAddress) {
        const rawAmount = (parseFloat(fromAmount) * Math.pow(10, fromToken.decimals)).toFixed(0);
        getQuote({
          fromChain,
          toChain,
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: rawAmount,
          fromAddress,
          toAddress,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fromToken, toToken, fromAmount, fromChain, toChain, fromAddress, toAddress, getQuote]);

  // Swap chains
  const handleSwapChains = () => {
    const tempChain = fromChain;
    const tempToken = fromToken;
    
    setFromChain(toChain);
    setToChain(tempChain);
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount("");
  };

  // Set max amount
  const handleSetMax = () => {
    if (fromBalance > 0) {
      // Leave some for gas if native token
      const isNative = fromChain === "solana" 
        ? (fromToken?.symbol === "SOL" || 
           fromToken?.address === "So11111111111111111111111111111111111111112" ||
           fromToken?.address === "11111111111111111111111111111111")
        : (fromToken?.symbol === "ETH" ||
           fromToken?.address === "0x0000000000000000000000000000000000000000");
      
      const maxAmount = isNative ? Math.max(0, fromBalance - 0.01) : fromBalance;
      setFromAmount(maxAmount.toString());
    }
  };

  // Execute the swap
  const handleSwap = useCallback(async (pin: string) => {
    if (!quote) return;
    
    setError(null);
    setShowPinModal(false);
    
    try {
      const txHash = await executeSwap(quote, pin);
      setCurrentTxHash(txHash);
      setShowStatusModal(true);

      // Save to history
      await saveSwapToHistory({
        txHash,
        fromChain: quote.fromChain,
        toChain: quote.toChain,
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        status: "PENDING",
      });

      // Clear form
      setFromAmount("");
    } catch (err: unknown) {
      console.error("Swap error:", err);
      setError(formatSwapError(err));
    }
  }, [quote, executeSwap, saveSwapToHistory]);

  // Refresh balances + custom tokens after swap completes
  const handleSwapComplete = useCallback(() => {
    fetchSolBalance();
    fetchEvmBalance();
    refreshSolCustom();
    refreshEvmCustom();
  }, [fetchSolBalance, fetchEvmBalance, refreshSolCustom, refreshEvmCustom]);

  // Validation
  const canSwap = useMemo(() => {
    if (!fromToken || !toToken || !fromAmount || !quote) return false;
    if (!fromAddress || !toAddress) return false;
    if (parseFloat(fromAmount) <= 0) return false;
    if (parseFloat(fromAmount) > fromBalance) return false;
    if (quoteLoading || executing) return false;
    if (!walletsGenerated) return false;
    return true;
  }, [fromToken, toToken, fromAmount, quote, fromAddress, toAddress, fromBalance, quoteLoading, executing, walletsGenerated]);

  const buttonText = useMemo(() => {
    if (!walletsGenerated) return "Set up wallet PIN first";
    if (!fromAddress || !toAddress) return "Connect wallet";
    if (!fromToken || !toToken) return "Select tokens";
    if (!fromAmount || parseFloat(fromAmount) <= 0) return "Enter amount";
    if (parseFloat(fromAmount) > fromBalance) return "Insufficient balance";
    if (quoteLoading) return "Fetching quote...";
    if (executing) return "Swapping...";
    if (quoteError) return "No route found";
    if (!quote) return "Enter amount";
    return "Swap";
  }, [walletsGenerated, fromAddress, toAddress, fromToken, toToken, fromAmount, fromBalance, quoteLoading, executing, quoteError, quote]);

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <h2 className="text-lg font-semibold text-dark dark:text-white">Swap</h2>
        <SwapSettings />
      </div>

      <div className="p-4 space-y-3">
        {/* From section */}
        <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">From</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                Balance: {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
              {fromBalance > 0 && (
                <button
                  onClick={handleSetMax}
                  className="text-xs text-primary font-medium hover:text-primary/80"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent border-0 text-2xl font-semibold text-dark dark:text-white placeholder:text-muted focus:ring-0 p-0"
            />
            
            <button
              onClick={() => setShowFromTokenModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {fromToken ? (
                <>
                  {fromToken.logoURI && (
                    <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="font-semibold text-dark dark:text-white">{fromToken.symbol}</span>
                </>
              ) : (
                <span className="text-muted">Select</span>
              )}
              <Icon icon="ph:caret-down" className="text-muted" width={16} />
            </button>
          </div>

          {/* Chain selector */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <button
              onClick={() => {
                const newChain = fromChain === "solana" ? "ethereum" : "solana";
                setFromChain(newChain);
                setFromToken(null);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-dark dark:text-white hover:text-primary transition-colors"
            >
              <img src={SWAP_CHAINS[fromChain].logo} alt="" className="w-4 h-4" />
              {SWAP_CHAINS[fromChain].name}
              <Icon icon="ph:caret-down" width={12} />
            </button>
          </div>
        </div>

        {/* Swap direction button */}
        <div className="flex justify-center -my-1">
          <button
            onClick={handleSwapChains}
            className="w-9 h-9 bg-white dark:bg-black border-4 border-lightgray dark:border-darkborder rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <Icon icon="ph:arrows-down-up" className="text-muted" width={18} />
          </button>
        </div>

        {/* To section */}
        <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">To (estimated)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-semibold text-dark dark:text-white">
              {quoteLoading ? (
                <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
              ) : quote ? (
                (parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              ) : (
                <span className="text-muted">0.00</span>
              )}
            </div>
            
            <button
              onClick={() => setShowToTokenModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {toToken ? (
                <>
                  {toToken.logoURI && (
                    <img src={toToken.logoURI} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="font-semibold text-dark dark:text-white">{toToken.symbol}</span>
                </>
              ) : (
                <span className="text-muted">Select</span>
              )}
              <Icon icon="ph:caret-down" className="text-muted" width={16} />
            </button>
          </div>

          {/* Chain selector */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <button
              onClick={() => {
                const newChain = toChain === "solana" ? "ethereum" : "solana";
                setToChain(newChain);
                setToToken(null);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-dark dark:text-white hover:text-primary transition-colors"
            >
              <img src={SWAP_CHAINS[toChain].logo} alt="" className="w-4 h-4" />
              {SWAP_CHAINS[toChain].name}
              <Icon icon="ph:caret-down" width={12} />
            </button>
          </div>
        </div>

        {/* Quote details */}
        {quote && !quoteError && (
          <SwapQuoteCard
            quote={quote}
            fromDecimals={fromToken?.decimals ?? 18}
            toDecimals={toToken?.decimals ?? 18}
          />
        )}

        {/* Error message */}
        {(error || quoteError) && (
          <div className="flex items-center gap-2 p-3 bg-error/10 rounded-xl text-error text-sm">
            <Icon icon="ph:warning" width={18} />
            <span>{error || quoteError}</span>
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={() => setShowPinModal(true)}
          disabled={!canSwap}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            canSwap
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-lightgray dark:bg-darkborder text-muted cursor-not-allowed"
          }`}
        >
          {executing ? (
            <span className="flex items-center justify-center gap-2">
              <Icon icon="ph:spinner" className="animate-spin" width={20} />
              Processing...
            </span>
          ) : (
            buttonText
          )}
        </button>

        {/* Powered by Li.Fi */}
        <p className="text-xs text-muted text-center">
          Powered by Li.Fi • Best rates across DEXs and bridges
        </p>
      </div>

      {/* Token selection modals */}
      <TokenSelectModal
        isOpen={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        onSelect={setFromToken}
        chain={fromChain}
        excludeAddress={toToken?.address}
      />
      <TokenSelectModal
        isOpen={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        onSelect={setToToken}
        chain={toChain}
        excludeAddress={fromToken?.address}
      />

      {/* PIN entry modal */}
      <PinConfirmModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleSwap}
        title="Confirm Swap"
        description={`Enter your PIN to swap ${fromAmount} ${fromToken?.symbol} for ${toToken?.symbol}`}
      />

      {/* Status tracker */}
      <SwapStatusTracker
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        txHash={currentTxHash}
        quote={quote}
        onSwapComplete={handleSwapComplete}
        onRetry={() => {
          setShowStatusModal(false);
          setShowPinModal(true);
        }}
      />
    </div>
  );
}

export default SwapInterface;
