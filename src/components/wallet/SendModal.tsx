"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useBitcoin } from "@/app/context/bitcoinContext";
import { useWallet } from "@/app/context/walletContext";
import { formatAmount, formatUSD } from "@/lib/wallet/amounts";
import { usePrices, getPrice } from "@/lib/wallet/usePrices";
import CryptoJS from "crypto-js";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  chain: "solana" | "ethereum" | "bitcoin";
  address?: string;
  icon: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset;
}

type Step = "details" | "confirm" | "pin" | "sending" | "success" | "error";

const CHAIN_ICONS: Record<string, string> = {
  solana: "https://cryptologos.cc/logos/solana-sol-logo.png",
  ethereum: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  bitcoin: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
};

const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose, asset }) => {
  const [step, setStep] = useState<Step>("details");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { prices } = usePrices();
  const { getEncryptedKeys } = useWallet();
  const { sendTransaction: sendSol, sendTokenTransaction: sendSolToken } = useSolana();
  const { sendTransaction: sendEth, sendTokenTransaction: sendEthToken } = useEvm();
  const { sendTransaction: sendBtc } = useBitcoin();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("details");
      setRecipient("");
      setAmount("");
      setPin(["", "", "", "", "", ""]);
      setError("");
      setTxHash("");
    }
  }, [isOpen]);

  // Focus first PIN input when entering PIN step
  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-advance to next input
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPin(newPin);
    if (pastedData.length === 6) {
      pinInputRefs.current[5]?.focus();
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * getPrice(prices, asset?.symbol || "");
  const isValidAmount = amountNum > 0 && amountNum <= (asset?.balance || 0);
  const isValidRecipient = recipient.length > 0;
  const pinComplete = pin.every((d) => d !== "");

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
      setStep("pin");
    }
  };

  const handleSend = async () => {
    if (!pinComplete || !asset) return;

    setStep("sending");
    setError("");

    const pinString = pin.join("");

    try {
      // Hash the PIN for verification
      const pinHash = CryptoJS.SHA256(pinString).toString();
      
      // Get encrypted keys (this verifies the PIN)
      const encryptedKeys = await getEncryptedKeys(pinHash);
      if (!encryptedKeys) {
        throw new Error("Invalid PIN or failed to get wallet keys");
      }

      let hash = "";

      if (asset.chain === "solana") {
        const encryptedKey = encryptedKeys.solana.encryptedPrivateKey;
        if (asset.address) {
          // SPL token
          hash = await sendSolToken(encryptedKey, pinString, recipient, amountNum, asset.address, asset.decimals);
        } else {
          // Native SOL
          hash = await sendSol(encryptedKey, pinString, recipient, amountNum);
        }
      } else if (asset.chain === "ethereum") {
        const encryptedKey = encryptedKeys.ethereum.encryptedPrivateKey;
        if (asset.address) {
          // ERC20 token
          hash = await sendEthToken(encryptedKey, pinString, recipient, amountNum, asset.address, asset.decimals);
        } else {
          // Native ETH
          hash = await sendEth(encryptedKey, pinString, recipient, amountNum);
        }
      } else if (asset.chain === "bitcoin") {
        const encryptedKey = encryptedKeys.bitcoin.encryptedPrivateKey;
        hash = await sendBtc(encryptedKey, pinString, recipient, amountNum);
      }

      setTxHash(hash);
      setStep("success");
    } catch (err: unknown) {
      console.error("Send error:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  };

  const handleSetMax = () => {
    if (asset) {
      // Leave a small buffer for gas on native tokens
      if (!asset.address) {
        const buffer = asset.chain === "bitcoin" ? 0.0001 : asset.chain === "ethereum" ? 0.001 : 0.01;
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
      case "bitcoin":
        return `https://blockstream.info/tx/${txHash}`;
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
                {step === "pin" && "Enter PIN to confirm"}
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
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* PIN Step */}
          {step === "pin" && (
            <div className="space-y-6">
              <p className="text-center text-muted">
                Enter your 6-digit PIN to authorize this transaction
              </p>

              {/* PIN Input */}
              <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { pinInputRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPin(["", "", "", "", "", ""]);
                    setStep("confirm");
                  }}
                  className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={!pinComplete}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  Send
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
                  onClick={() => {
                    setPin(["", "", "", "", "", ""]);
                    setStep("pin");
                  }}
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
