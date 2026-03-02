"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useTron } from "@/app/context/tronContext";
import { useEvm } from "@/app/context/evmContext";
import { useWallet } from "@/app/context/walletContext";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import PinConfirmModal from "../swap/PinConfirmModal";

// Fixed bridge configuration: TRX → ETH only
const BRIDGE_CONFIG = {
  from: {
    chain: "tron",
    chainId: 728126428,
    name: "Tron",
    symbol: "TRX",
    logo: "https://logowik.com/content/uploads/images/tron-trx-icon3386.logowik.com.webp",
    tokenAddress: "0x0000000000000000000000000000000000000000",
    decimals: 6,
  },
  to: {
    chain: "ethereum",
    chainId: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    tokenAddress: "0x0000000000000000000000000000000000000000",
    decimals: 18,
  },
} as const;

const MINIMUM_BRIDGE_AMOUNT_TRX = 11;
const MINIMUM_BRIDGE_FEE_USD = 7.5;

export default function TronBridgeInterface() {
  const { address: tronAddress, balance: trxBalance } = useTron();
  const { address: evmAddress } = useEvm();
  const { walletsGenerated } = useWallet();
  
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [validatedQuote, setValidatedQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Fetch quote from Swing API (GET request)
  const fetchQuote = useCallback(async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      setQuote(null);
      setValidatedQuote(null);
      setError(null);
      return;
    }

    // Validate minimum amount
    if (amountNum < MINIMUM_BRIDGE_AMOUNT_TRX) {
      setError(`Minimum bridge amount is ${MINIMUM_BRIDGE_AMOUNT_TRX} TRX`);
      setQuote(null);
      setValidatedQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert TRX to Sun (6 decimals)
      const rawAmount = Math.floor(amountNum * 1_000_000).toString();
      
      // Build query parameters for GET request
      const params = new URLSearchParams({
        fromChain: BRIDGE_CONFIG.from.chain,
        tokenSymbol: BRIDGE_CONFIG.from.symbol,
        fromTokenAddress: BRIDGE_CONFIG.from.tokenAddress,
        fromUserAddress: tronAddress || "",
        toChain: BRIDGE_CONFIG.to.chain,
        toTokenSymbol: BRIDGE_CONFIG.to.symbol,
        toTokenAddress: BRIDGE_CONFIG.to.tokenAddress,
        toUserAddress: evmAddress || "",
        tokenAmount: rawAmount,
        projectId: "world-street-gold",
      });
      
      const response = await fetch(`https://swap.prod.swing.xyz/v0/transfer/quote?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch quote");
      }

      const data = await response.json();
      console.log("[Bridge] Raw Swing API response:", data);
      
      // Validate the quote
      if (!data.routes || data.routes.length === 0) {
        setError("No routes available for this bridge");
        setQuote(null);
        setValidatedQuote(null);
        return;
      }

      // Use the first route (best route)
      const bestRoute = data.routes[0];
      
      // Create a validated quote object
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        amountIn: rawAmount,
        amountOut: bestRoute.quote.amount,
        amountOutMin: bestRoute.quote.amount,
        route: bestRoute,
        aggregatedFees: bestRoute.quote.fees?.map((fee: any) => ({
          symbol: fee.tokenSymbol,
          amount: fee.amount,
          amountHuman: (parseFloat(fee.amount) / Math.pow(10, fee.decimals || 18)).toFixed(6),
          usdValue: fee.amountUSD,
        })) || [],
        totalFeeUsd: bestRoute.quote.fees?.reduce((sum: number, fee: any) => 
          sum + parseFloat(fee.amountUSD || "0"), 0
        ).toFixed(2),
        estimatedTime: bestRoute.duration,
        gasUSD: bestRoute.gasUSD,
      };
      
      console.log("[Bridge] Validation result:", validation);
      
      setValidatedQuote(validation);
      setQuote(data);
    } catch (err: any) {
      console.error("Bridge quote error:", err);
      setError(err.message || "Failed to get bridge quote");
    } finally {
      setLoading(false);
    }
  }, [amount, tronAddress, evmAddress]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Set max amount
  const handleSetMax = () => {
    if (trxBalance > 0) {
      // Leave 10 TRX for fees
      const maxAmount = Math.max(0, trxBalance - 10);
      setAmount(maxAmount.toString());
    }
  };

  const canBridge = useMemo(() => {
    if (!walletsGenerated) return false;
    if (!amount) return false;
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return false;
    if (amountNum < MINIMUM_BRIDGE_AMOUNT_TRX) return false;
    if (amountNum > trxBalance) return false;
    if (loading || executing) return false;
    if (!quote || !validatedQuote) return false;
    if (!validatedQuote.isValid) return false;
    return true;
  }, [walletsGenerated, amount, trxBalance, loading, executing, quote, validatedQuote]);

  // Helper function to get fee summary
  const getFeeSummary = useCallback(() => {
    if (!validatedQuote || !validatedQuote.aggregatedFees || validatedQuote.aggregatedFees.length === 0) {
      return "No fees";
    }
    return validatedQuote.aggregatedFees
      .map((fee: any) => `${fee.amountHuman} ${fee.symbol}`)
      .join(" + ");
  }, [validatedQuote]);

  // Execute bridge transaction (TRX → ETH only)
  const handleBridge = useCallback(async (pin: string) => {
    if (!quote || !validatedQuote) return;

    setExecuting(true);
    setError(null);
    setShowPinModal(false);

    try {
      console.log("[Bridge] Starting TRX → ETH bridge execution");
      console.log("[Bridge] Quote data:", quote);
      console.log("[Bridge] Validated data:", validatedQuote);

      // Get the best route
      const bestRoute = validatedQuote.route;
      
      if (!bestRoute) {
        throw new Error("No route available");
      }

      // Get encrypted keys and decrypt
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        throw new Error("Failed to get wallet keys");
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error("Failed to retrieve wallet keys");
      }

      // Get transaction data from Swing API
      const txResponse = await fetch("https://swap.prod.swing.xyz/v0/transfer/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromChain: BRIDGE_CONFIG.from.chain,
          tokenSymbol: BRIDGE_CONFIG.from.symbol,
          fromTokenAddress: BRIDGE_CONFIG.from.tokenAddress,
          fromUserAddress: tronAddress,
          toChain: BRIDGE_CONFIG.to.chain,
          toTokenSymbol: BRIDGE_CONFIG.to.symbol,
          toTokenAddress: BRIDGE_CONFIG.to.tokenAddress,
          toUserAddress: evmAddress,
          tokenAmount: validatedQuote.amountIn,
          route: bestRoute.route,
          projectId: "world-street-gold",
        }),
      });

      if (!txResponse.ok) {
        const errorData = await txResponse.json();
        throw new Error(errorData.message || "Failed to get transaction data");
      }

      const txData = await txResponse.json();
      console.log("[Bridge] Transaction data:", txData);

      // Execute Tron transaction
      if (!data.wallets?.tron?.encryptedPrivateKey) {
        throw new Error("Tron wallet not found");
      }
      const privateKey = decryptWithPIN(data.wallets.tron.encryptedPrivateKey, pin);

      const TronWeb = (await import("tronweb")).default;
      const tronWeb = new TronWeb({
        fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
        privateKey: privateKey,
      });

      console.log("[Bridge] Executing Tron transaction");

      // Send the transaction using Swing's transaction data
      const tx = await tronWeb.trx.sendRawTransaction(txData.tx);

      if (!tx.result) {
        throw new Error(tx.message || "Transaction failed");
      }

      const txHash = tx.txid;
      console.log("[Bridge] Tron transaction sent:", txHash);

      alert(`Bridge transaction submitted!\nTX: ${txHash}\n\nFees: ${getFeeSummary()}\n\nYou will receive ETH on Ethereum network.`);
      
      // Reset form
      setAmount("");
      setQuote(null);
      setValidatedQuote(null);
    } catch (err: any) {
      console.error("[Bridge] Execution error:", err);
      setError(err.message || "Failed to execute bridge");
    } finally {
      setExecuting(false);
    }
  }, [quote, validatedQuote, amount, tronAddress, evmAddress, getFeeSummary]);

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <h2 className="text-lg font-semibold text-dark dark:text-white">TRX → ETH Bridge</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Icon icon="solar:shield-check-bold-duotone" width={16} />
          <span>Powered by Swing</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* From section - TRX */}
        <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">From</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                Balance: {trxBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} TRX
              </span>
              {trxBalance > 0 && (
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent border-0 text-2xl font-semibold text-dark dark:text-white placeholder:text-muted focus:ring-0 p-0"
            />
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl">
              <img src={BRIDGE_CONFIG.from.logo} alt="TRX" className="w-6 h-6 rounded-full" />
              <span className="font-semibold text-dark dark:text-white">{BRIDGE_CONFIG.from.symbol}</span>
            </div>
          </div>

          {/* Chain info */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <div className="flex items-center gap-1.5">
              <img src={BRIDGE_CONFIG.from.logo} alt="" className="w-4 h-4" />
              <span className="text-xs font-medium text-dark dark:text-white">{BRIDGE_CONFIG.from.name}</span>
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex justify-center -my-1">
          <div className="w-9 h-9 bg-white dark:bg-black border-4 border-lightgray dark:border-darkborder rounded-xl flex items-center justify-center">
            <Icon icon="ph:arrow-down" className="text-muted" width={18} />
          </div>
        </div>

        {/* To section - ETH */}
        <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">To (estimated)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-semibold text-dark dark:text-white">
              {loading ? (
                <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
              ) : validatedQuote?.amountOut ? (
                (parseFloat(validatedQuote.amountOut) / Math.pow(10, BRIDGE_CONFIG.to.decimals)).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              ) : (
                <span className="text-muted">0.00</span>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl">
              <img src={BRIDGE_CONFIG.to.logo} alt="ETH" className="w-6 h-6 rounded-full" />
              <span className="font-semibold text-dark dark:text-white">{BRIDGE_CONFIG.to.symbol}</span>
            </div>
          </div>

          {/* Chain info */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <div className="flex items-center gap-1.5">
              <img src={BRIDGE_CONFIG.to.logo} alt="" className="w-4 h-4" />
              <span className="text-xs font-medium text-dark dark:text-white">{BRIDGE_CONFIG.to.name}</span>
            </div>
          </div>
        </div>

        {/* Quote details */}
        {quote && !error && validatedQuote && (
          <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Estimated Time</span>
              <span className="text-dark dark:text-white font-medium">
                ~{Math.ceil((validatedQuote.estimatedTime || 300) / 60)} min
              </span>
            </div>
            {validatedQuote.aggregatedFees && validatedQuote.aggregatedFees.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Bridge Fees</span>
                <span className="text-dark dark:text-white font-medium">
                  {getFeeSummary()}
                </span>
              </div>
            )}
            {validatedQuote.totalFeeUsd && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Total Fee (USD)</span>
                <span className="text-dark dark:text-white font-medium">
                  ${validatedQuote.totalFeeUsd}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted">Minimum Amount</span>
              <span className="text-dark dark:text-white font-medium">
                {MINIMUM_BRIDGE_AMOUNT_TRX} TRX
              </span>
            </div>
            {validatedQuote.gasUSD && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Est. Gas Cost</span>
                <span className="text-dark dark:text-white font-medium">
                  ${parseFloat(validatedQuote.gasUSD).toFixed(4)}
                </span>
              </div>
            )}
            {validatedQuote.route?.quote?.integration && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Bridge Provider</span>
                <span className="text-dark dark:text-white font-medium capitalize">
                  {validatedQuote.route.quote.integration}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-error/10 rounded-xl text-error text-sm">
            <Icon icon="ph:warning" width={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Bridge button */}
        <button
          onClick={() => setShowPinModal(true)}
          disabled={!canBridge}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            canBridge
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-lightgray dark:bg-darkborder text-muted cursor-not-allowed"
          }`}
        >
          {executing ? (
            <span className="flex items-center justify-center gap-2">
              <Icon icon="ph:spinner" className="animate-spin" width={20} />
              Processing...
            </span>
          ) : !walletsGenerated
            ? "Set up wallet first"
            : !amount || parseFloat(amount) <= 0
            ? "Enter amount"
            : parseFloat(amount) < MINIMUM_BRIDGE_AMOUNT_TRX
            ? `Minimum ${MINIMUM_BRIDGE_AMOUNT_TRX} TRX`
            : parseFloat(amount) > trxBalance
            ? "Insufficient balance"
            : loading
            ? "Fetching quote..."
            : !quote
            ? "Enter amount"
            : "Bridge TRX → ETH"}
        </button>

        {/* Info */}
        <p className="text-xs text-muted text-center">
          Bridge TRX from Tron to ETH on Ethereum • Minimum: {MINIMUM_BRIDGE_AMOUNT_TRX} TRX • Powered by Swing
        </p>
      </div>

      {/* PIN Confirmation Modal */}
      <PinConfirmModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleBridge}
        title="Confirm Bridge"
        description={`Enter your PIN to bridge ${amount} TRX to ETH on Ethereum`}
      />
    </div>
  );
}
