"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useTron } from "@/app/context/tronContext";
import { useWallet } from "@/app/context/walletContext";
import { getQuoteTrxToUsdt, getQuoteUsdtToTrx, validateQuoteParams, type QuoteResult } from "@/services/tron/quote.service";
import { executeTrxToUsdtSwap, executeUsdtToTrxSwap, validateSwapBalance } from "@/services/tron/swap.service";
import { decryptPrivateKey, clearSensitiveData, validatePIN } from "@/services/tron/wallet.service";

type TokenType = "TRX" | "USDT";

const TronSwapPage = () => {
  const { addresses, walletsGenerated, getEncryptedKeys } = useWallet();
  const { address, balance: trxBalance, tokenBalances, fetchBalance } = useTron();

  // Token selection
  const [fromToken, setFromToken] = useState<TokenType>("TRX");
  const [toToken, setToToken] = useState<TokenType>("USDT");

  // Input state
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);

  // Quote state
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Transaction state
  const [swapping, setSwapping] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");

  // PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Get USDT balance
  const usdtBalance = tokenBalances.find(
    (t) => t.symbol === "USDT"
  )?.amount || 0;

  // Get current balance for from token
  const fromBalance = fromToken === "TRX" ? trxBalance : usdtBalance;

  // Switch tokens
  const handleSwitchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    setQuote(null);
    setQuoteError("");
  };

  // Fetch quote with debounce
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setQuote(null);
        return;
      }

      const numAmount = parseFloat(amount);

      // Validate amount
      const validation = validateQuoteParams(numAmount, fromBalance);
      if (!validation.valid) {
        setQuoteError(validation.error || "Invalid amount");
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      setQuoteError("");

      try {
        // Dynamically import TronWeb
        const TronWeb = (await import("tronweb")).default;
        const tronWeb = new TronWeb({
          fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN",
        });

        let quoteResult: QuoteResult;

        if (fromToken === "TRX") {
          quoteResult = await getQuoteTrxToUsdt(tronWeb, numAmount, slippage);
        } else {
          quoteResult = await getQuoteUsdtToTrx(tronWeb, numAmount, slippage);
        }

        setQuote(quoteResult);
      } catch (error: any) {
        console.error("[TronSwap] Quote error:", error);
        setQuoteError(error.message || "Failed to get quote");
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    // Debounce quote fetching
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, fromToken, slippage, fromBalance]);

  // Handle swap button click
  const handleSwapClick = () => {
    if (!walletsGenerated || !addresses?.tron) {
      setTxError("No Tron wallet found. Please generate a wallet first.");
      return;
    }

    setShowPinModal(true);
    setPin("");
    setPinError("");
  };

  // Execute swap
  const executeSwap = async () => {
    if (!quote || !walletsGenerated || !address) {
      return;
    }

    // Validate PIN
    const pinValidation = validatePIN(pin);
    if (!pinValidation.valid) {
      setPinError(pinValidation.error || "Invalid PIN");
      return;
    }

    setSwapping(true);
    setTxError("");
    setTxHash("");
    setPinError("");

    let privateKey = "";

    try {
      // Get encrypted keys from API
      const encryptedKeys = await getEncryptedKeys(pin);
      
      if (!encryptedKeys?.tron?.encryptedPrivateKey) {
        throw new Error("Tron wallet not found");
      }

      // Decrypt private key
      privateKey = decryptPrivateKey(encryptedKeys.tron.encryptedPrivateKey, pin);

      // Initialize TronWeb
      const TronWeb = (await import("tronweb")).default;
      const tronWeb = new TronWeb({
        fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN",
      });

      // Validate balance
      const balanceCheck = await validateSwapBalance(
        tronWeb,
        address,
        fromToken,
        parseFloat(amount)
      );

      if (!balanceCheck.valid) {
        setTxError(balanceCheck.error || "Insufficient balance");
        setShowPinModal(false);
        return;
      }

      // Execute swap
      let result;
      if (fromToken === "TRX") {
        result = await executeTrxToUsdtSwap(
          tronWeb,
          privateKey,
          parseFloat(amount),
          quote.minimumOutput
        );
      } else {
        result = await executeUsdtToTrxSwap(
          tronWeb,
          privateKey,
          parseFloat(amount),
          quote.minimumOutput
        );
      }

      if (result.success) {
        setTxHash(result.txHash);
        setShowPinModal(false);
        
        // Reset form
        setAmount("");
        setQuote(null);

        // Refresh balances
        setTimeout(() => {
          fetchBalance(address);
        }, 3000);
      } else {
        setTxError(result.message || "Swap failed");
      }
    } catch (error: any) {
      console.error("[TronSwap] Swap execution error:", error);
      
      if (error.message?.includes("PIN") || error.message?.includes("decrypt")) {
        setPinError("Invalid PIN");
      } else {
        setTxError(error.message || "Swap failed");
        setShowPinModal(false);
      }
    } finally {
      // Clear private key from memory
      if (privateKey) {
        clearSensitiveData(privateKey);
      }
      setSwapping(false);
    }
  };

  // Check if swap button should be disabled
  const isSwapDisabled = 
    !address ||
    !amount ||
    parseFloat(amount) <= 0 ||
    parseFloat(amount) > fromBalance ||
    quoteLoading ||
    !quote ||
    swapping;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Tron Chain Swap
        </h1>
        <p className="text-sm text-muted dark:text-darklink mt-1">
          Swap TRX and USDT on Tron network
        </p>
      </div>

      {/* Main Swap Card */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm p-6">
          {/* Slippage Settings */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-dark dark:text-white">
              Swap
            </h3>
            <button
              onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              className="flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors"
            >
              <Icon icon="solar:settings-linear" className="h-4 w-4" />
              <span>{slippage}%</span>
            </button>
          </div>

          {/* Slippage Settings Panel */}
          {showSlippageSettings && (
            <div className="mb-4 p-3 bg-muted/10 dark:bg-darkborder/20 rounded-lg">
              <label className="text-xs font-medium text-muted dark:text-darklink block mb-2">
                Slippage Tolerance
              </label>
              <div className="flex gap-2">
                {[0.5, 1, 2, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      slippage === value
                        ? "bg-primary text-white"
                        : "bg-white dark:bg-black border border-border dark:border-darkborder text-dark dark:text-white hover:border-primary"
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* From Token */}
          <div className="space-y-2 mb-2">
            <label className="text-xs font-medium text-muted dark:text-darklink">
              From
            </label>
            <div className="bg-muted/10 dark:bg-darkborder/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black rounded-lg border border-border dark:border-darkborder">
                  <Icon
                    icon={fromToken === "TRX" ? "cryptocurrency:trx" : "cryptocurrency:usdt"}
                    className="h-5 w-5"
                  />
                  <span className="font-medium text-dark dark:text-white">
                    {fromToken}
                  </span>
                </div>
                <div className="text-xs text-muted dark:text-darklink">
                  Balance: {fromBalance.toFixed(6)}
                </div>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-2xl font-semibold text-dark dark:text-white outline-none"
                step="any"
                min="0"
              />
              <button
                onClick={() => setAmount(fromBalance.toString())}
                className="text-xs text-primary hover:underline mt-1"
              >
                Max
              </button>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwitchTokens}
              className="bg-white dark:bg-black border-2 border-border dark:border-darkborder rounded-xl p-2 hover:border-primary transition-colors"
            >
              <Icon icon="solar:transfer-vertical-linear" className="h-5 w-5 text-dark dark:text-white" />
            </button>
          </div>

          {/* To Token */}
          <div className="space-y-2 mt-2">
            <label className="text-xs font-medium text-muted dark:text-darklink">
              To
            </label>
            <div className="bg-muted/10 dark:bg-darkborder/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black rounded-lg border border-border dark:border-darkborder">
                  <Icon
                    icon={toToken === "TRX" ? "cryptocurrency:trx" : "cryptocurrency:usdt"}
                    className="h-5 w-5"
                  />
                  <span className="font-medium text-dark dark:text-white">
                    {toToken}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-semibold text-dark dark:text-white">
                {quoteLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/20 border-t-primary" />
                    <span className="text-muted">Loading...</span>
                  </div>
                ) : quote ? (
                  quote.outputAmount.toFixed(6)
                ) : (
                  "0.00"
                )}
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && !quoteError && (
            <div className="mt-4 p-3 bg-muted/10 dark:bg-darkborder/20 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted dark:text-darklink">Minimum received:</span>
                <span className="font-medium text-dark dark:text-white">
                  {quote.minimumOutput.toFixed(6)} {toToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-darklink">Price impact:</span>
                <span className={`font-medium ${quote.priceImpact > 1 ? "text-error" : "text-success"}`}>
                  ~{quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-darklink">Liquidity pool:</span>
                <span className="font-mono text-xs text-muted dark:text-darklink">
                  {quote.poolAddress.slice(0, 6)}...{quote.poolAddress.slice(-4)}
                </span>
              </div>
              <div className="pt-2 border-t border-border dark:border-darkborder">
                <p className="text-xs text-muted dark:text-darklink">
                  <Icon icon="solar:info-circle-linear" className="inline h-3.5 w-3.5 mr-1" />
                  Network fees: ~10-50 TRX (varies by network)
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {quoteError && (
            <div className="mt-4 p-3 bg-error/10 rounded-lg flex items-start gap-2">
              <Icon icon="solar:danger-circle-linear" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{quoteError}</p>
            </div>
          )}

          {txError && (
            <div className="mt-4 p-3 bg-error/10 rounded-lg flex items-start gap-2">
              <Icon icon="solar:danger-circle-linear" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{txError}</p>
            </div>
          )}

          {/* Success Display */}
          {txHash && (
            <div className="mt-4 p-3 bg-success/10 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Icon icon="solar:check-circle-linear" className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success mb-1">Swap successful!</p>
                  <p className="text-xs text-muted dark:text-darklink font-mono break-all">
                    {txHash}
                  </p>
                </div>
              </div>
              <a
                href={`https://tronscan.org/#/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View on TronScan
                <Icon icon="solar:arrow-right-up-linear" className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwapClick}
            disabled={isSwapDisabled}
            className={`w-full mt-4 py-3.5 rounded-xl font-semibold transition-all ${
              isSwapDisabled
                ? "bg-muted/20 text-muted cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
            }`}
          >
            {!address
              ? "Connect Wallet"
              : swapping
              ? "Swapping..."
              : quoteLoading
              ? "Loading quote..."
              : "Swap"}
          </button>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Confirm Swap
              </h3>
              <button
                onClick={() => setShowPinModal(false)}
                disabled={swapping}
                className="text-muted hover:text-dark dark:hover:text-white transition-colors"
              >
                <Icon icon="solar:close-circle-linear" className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-muted/10 dark:bg-darkborder/20 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted dark:text-darklink">You pay:</span>
                  <span className="font-medium text-dark dark:text-white">
                    {amount} {fromToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted dark:text-darklink">You receive:</span>
                  <span className="font-medium text-dark dark:text-white">
                    ~{quote?.outputAmount.toFixed(6)} {toToken}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark dark:text-white block mb-2">
                  Enter PIN to confirm
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  className="w-full px-4 py-2.5 bg-muted/10 dark:bg-darkborder/20 border border-border dark:border-darkborder rounded-lg text-dark dark:text-white outline-none focus:border-primary transition-colors"
                  disabled={swapping}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !swapping) {
                      executeSwap();
                    }
                  }}
                />
                {pinError && (
                  <p className="text-xs text-error mt-1">{pinError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPinModal(false)}
                  disabled={swapping}
                  className="flex-1 py-2.5 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white font-medium hover:bg-muted/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSwap}
                  disabled={swapping || !pin}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {swapping && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  )}
                  {swapping ? "Swapping..." : "Confirm Swap"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TronSwapPage;
