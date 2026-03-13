"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useTron } from "@/app/context/tronContext";
import { useSui } from "@/app/context/suiContext";
import { useWallet } from "@/app/context/walletContext";
import { formatAmount, formatUSD } from "@/lib/wallet/amounts";
import { usePrices, getPrice } from "@/lib/wallet/usePrices";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  chain: "solana" | "ethereum" | "sui" | "ton" | "tron";
  address?: string;
  icon: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset;
}

type Step = "details" | "confirm" | "sending" | "success" | "error";

const CHAIN_ICONS: Record<string, string> = {
  solana: "https://th.bing.com/th/id/OIP.hnScG3zE2G41YaH7Iir9zAHaHa?w=153&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
  ethereum: "https://tse3.mm.bing.net/th/id/OIP.Rbhwx2hMogpqEO08SXJShwHaLo?rs=1&pid=ImgDetMain&o=7&rm=3",
  sui: "https://tse4.mm.bing.net/th/id/OIP.DWTtTAPHJKclsuxvovZejgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
  ton: "https://tse1.mm.bing.net/th/id/OIP.i349pQ2gXTFBH_xGCrBHmgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
  tron: "https://tse1.mm.bing.net/th/id/OIP.jSQvLp4TC3q6vIDrO1GhkwHaFj?rs=1&pid=ImgDetMain&o=7&rm=3",
};

const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose, asset }) => {
  const [step, setStep] = useState<Step>("details");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const { prices } = usePrices();
  const { sendTransaction: sendSol, sendTokenTransaction: sendSolToken } = useSolana();
  const { sendTransaction: sendEth, sendTokenTransaction: sendEthToken } = useEvm();
  const { sendTransaction: sendTrx, sendTokenTransaction: sendTrxToken } = useTron();
  const { sendTransaction: sendSui } = useSui();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("details");
      setRecipient("");
      setAmount("");
      setError("");
      setTxHash("");
    }
  }, [isOpen]);

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * getPrice(prices, asset?.symbol || "");
  const isValidAmount = amountNum > 0 && amountNum <= (asset?.balance || 0);
  const isValidRecipient = recipient.length > 0;

  const handleContinue = () => {
    setError("");
    if (step === "details") {
      if (!isValidRecipient) {
        setError("Please enter a valid recipient address");
        return;
      }
      if (!isValidAmount) {
        setError("Please enter a valid amount");
        return;
      }
      setStep("confirm");
    } else if (step === "confirm") {
      handleSend();
    }
  };

  // Sanitize error messages for better user experience
  const sanitizeError = (error: string): string => {
    // Insufficient balance errors
    if (error.includes("Balance of gas object") && error.includes("is lower than the needed amount")) {
      return "Insufficient balance for transaction fees. Please ensure you have enough SUI to cover gas costs.";
    }
    
    if (error.includes("insufficient funds") || error.includes("Insufficient balance")) {
      return "Insufficient balance to complete this transaction.";
    }

    // Network/RPC errors
    if (error.includes("Network request failed") || error.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    // Invalid address errors
    if (error.includes("invalid address") || error.includes("Invalid address")) {
      return "Invalid recipient address. Please check the address and try again.";
    }

    // Gas/fee related errors
    if (error.includes("gas") && (error.includes("too low") || error.includes("insufficient"))) {
      return "Transaction fee too low. Please try again with a higher fee.";
    }

    // Transaction timeout
    if (error.includes("timeout") || error.includes("timed out")) {
      return "Transaction timed out. Please try again.";
    }

    // User rejection
    if (error.includes("rejected") || error.includes("denied")) {
      return "Transaction was rejected. Please try again.";
    }

    // Generic blockchain errors
    if (error.includes("Error checking transaction input objects")) {
      return "Transaction validation failed. Please check your balance and try again.";
    }

    // Return original error if no match found, but clean it up
    return error.replace(/^Error:\s*/, "").trim();
  };

  const handleSend = async () => {
    if (!asset) return;

    setStep("sending");
    setError("");

    try {
      let hash = "";

      if (asset.chain === "solana") {
        if (asset.address) {
          // SPL token - not yet supported via Privy
          throw new Error("SPL token transfers not yet supported. Use native SOL for now.");
        } else {
          // Native SOL
          hash = await sendSol(recipient, amountNum);
        }
      } else if (asset.chain === "ethereum") {
        if (asset.address) {
          // ERC20 token - not yet supported via Privy
          throw new Error("ERC20 token transfers not yet supported. Use native ETH for now.");
        } else {
          // Native ETH
          hash = await sendEth(recipient, amountNum);
        }
      } else if (asset.chain === "tron") {
        if (asset.address) {
          // TRC20 token - not yet supported via Privy
          throw new Error("TRC20 token transfers not yet supported. Use native TRX for now.");
        } else {
          // Native TRX
          hash = await sendTrx(recipient, amountNum);
        }
      } else if (asset.chain === "sui") {
        if (asset.address) {
          // SUI token - not yet supported via Privy
          throw new Error("SUI token transfers not yet supported. Use native SUI for now.");
        } else {
          // Native SUI
          hash = await sendSui(recipient, amountNum);
        }
      } else if (asset.chain === "ton") {
        throw new Error(`${asset.chain.toUpperCase()} transfers not yet supported`);
      }

      setTxHash(hash);
      setStep("success");
    } catch (err: unknown) {
      console.error("Send error:", err);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(sanitizeError(errorMessage));
      setStep("error");
    }
  };

  const handleSetMax = () => {
    if (asset) {
      // Leave a small buffer for gas on native tokens
      if (!asset.address) {
        const buffer = 
          asset.chain === "ethereum" ? 0.001 : 
          asset.chain === "tron" ? 1 : // Leave 1 TRX for fees
          asset.chain === "sui" ? 0.02 : // Leave 0.02 SUI for fees (more conservative)
          0.01;
        setAmount(Math.max(0, asset.balance - buffer).toString());
      } else {
        setAmount(asset.balance.toString());
      }
    }
  };

  const getExplorerUrl = () => {
    if (!txHash || !asset) return "";
    switch (asset.chain) {
      case "solana":
        return `https://solscan.io/tx/${txHash}`;
      case "ethereum":
        return `https://etherscan.io/tx/${txHash}`;
      case "sui":
        return `https://suiscan.xyz/mainnet/tx/${txHash}`;
      case "ton":
        return `https://tonscan.org/tx/${txHash}`;
      case "tron":
        return `https://tronscan.org/#/transaction/${txHash}`;
      default:
        return "";
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 dark:border-darkborder">
          <div className="flex items-center gap-3">
            <img src={asset.icon} alt={asset.symbol} className="w-8 h-8 rounded-full" />
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Send {asset.symbol}
              </h2>
              <p className="text-sm text-muted">
                {step === "details" && "Enter recipient and amount"}
                {step === "confirm" && "Review transaction"}
                {step === "sending" && "Processing..."}
                {step === "success" && "Transaction sent!"}
                {step === "error" && "Transaction failed"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/30 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Details Step */}
          {step === "details" && (
            <div className="space-y-4">
              {/* Balance Display */}
              <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-white/5 rounded-lg">
                <span className="text-sm text-muted">Available Balance</span>
                <span className="text-sm font-medium text-dark dark:text-white">
                  {formatAmount(asset.balance)} {asset.symbol}
                </span>
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-sm text-muted mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={`Enter ${asset.chain} address`}
                  className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-muted mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="w-full px-4 py-3 pr-20 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    onClick={handleSetMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {amountNum > 0 && (
                  <p className="mt-1 text-sm text-muted">≈ {formatUSD(usdValue)}</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={!isValidRecipient || !isValidAmount}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Confirm Step */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 dark:bg-white/5 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted">Sending</span>
                  <span className="text-dark dark:text-white font-medium">
                    {formatAmount(amountNum)} {asset.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Value</span>
                  <span className="text-dark/70 dark:text-gray-300">≈ {formatUSD(usdValue)}</span>
                </div>
                <div className="border-t border-border/50 dark:border-darkborder my-2" />
                <div className="flex justify-between items-start">
                  <span className="text-muted">To</span>
                  <span className="text-dark dark:text-white text-sm font-mono text-right max-w-[200px] break-all">
                    {recipient}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Network</span>
                  <div className="flex items-center gap-2">
                    <img src={CHAIN_ICONS[asset.chain]} alt={asset.chain} className="w-4 h-4 rounded-full" />
                    <span className="text-dark dark:text-white capitalize">{asset.chain}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("details")}
                  className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                >
                  Send Now
                </button>
              </div>
            </div>
          )}

          {/* Sending Step */}
          {step === "sending" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Processing Transaction</h3>
              <p className="text-muted">Please wait while your transaction is being sent...</p>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Transaction Sent!</h3>
              <p className="text-muted mb-4">
                {formatAmount(amountNum)} {asset.symbol} has been sent successfully.
              </p>
              
              {txHash && (
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                >
                  View on Explorer
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              <button
                onClick={onClose}
                className="w-full mt-6 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Transaction Failed</h3>
              <p className="text-red-400 mb-4">{error || "Something went wrong"}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("details")}
                  className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendModal;
