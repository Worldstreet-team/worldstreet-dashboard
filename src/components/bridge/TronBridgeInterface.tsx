"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useTron } from "@/app/context/tronContext";
import { useEvm } from "@/app/context/evmContext";
import { useSolana } from "@/app/context/solanaContext";
import { useWallet } from "@/app/context/walletContext";
import PinConfirmModal from "../swap/PinConfirmModal";

// Symbiosis supported chains (only chains we have wallets for)
const BRIDGE_CHAINS = {
  tron: {
    id: 728126428,
    name: "Tron",
    symbol: "TRX",
    logo: "https://logowik.com/content/uploads/images/tron-trx-icon3386.logowik.com.webp",
  },
  ethereum: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  solana: {
    id: 1151111081099710,
    name: "Solana",
    symbol: "SOL",
    logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
} as const;

type ChainKey = keyof typeof BRIDGE_CHAINS;

interface BridgeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

export default function TronBridgeInterface() {
  const { address: tronAddress, balance: trxBalance, tokenBalances: trxTokens } = useTron();
  const { address: evmAddress, balance: ethBalance } = useEvm();
  const { address: solAddress } = useSolana();
  const { walletsGenerated } = useWallet();

  const [fromChain, setFromChain] = useState<ChainKey>("tron");
  const [toChain, setToChain] = useState<ChainKey>("ethereum");
  const [fromToken, setFromToken] = useState<BridgeToken | null>(null);
  const [toToken, setToToken] = useState<BridgeToken | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Get available tokens for Tron
  const tronTokens = useMemo<BridgeToken[]>(() => {
    const tokens: BridgeToken[] = [
      {
        address: "",
        symbol: "TRX",
        name: "Tron",
        decimals: 6,
        chainId: 728126428,
        logoURI: BRIDGE_CHAINS.tron.logo,
      },
    ];

    // Add TRC20 tokens
    trxTokens.forEach((token) => {
      tokens.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        decimals: token.decimals,
        chainId: 728126428,
        logoURI: token.logoURI,
      });
    });

    return tokens;
  }, [trxTokens]);

  // Get balance for selected token
  const fromBalance = useMemo(() => {
    if (!fromToken) return 0;
    
    if (fromChain === "tron") {
      if (fromToken.symbol === "TRX") {
        return trxBalance;
      }
      const found = trxTokens.find(t => t.address === fromToken.address);
      return found?.amount ?? 0;
    } else if (fromChain === "ethereum") {
      if (fromToken.symbol === "ETH") {
        return ethBalance;
      }
      // Add EVM token balance check if needed
      return 0;
    } else if (fromChain === "solana") {
      // Add Solana balance check if needed
      return 0;
    }
    
    return 0;
  }, [fromToken, fromChain, trxBalance, trxTokens, ethBalance]);

  // Auto-select default tokens
  useEffect(() => {
    if (fromChain === "tron" && !fromToken && tronTokens.length > 0) {
      const usdt = tronTokens.find(t => t.symbol === "USDT");
      setFromToken(usdt || tronTokens[0]);
    }
  }, [fromChain, fromToken, tronTokens]);

  // Auto-select destination token
  useEffect(() => {
    if (!toToken) {
      // Default to USDT on destination chain
      setToToken({
        address: toChain === "ethereum" 
          ? "0xdAC17F958D2ee523a2206206994597C13D831ec7" // USDT on Ethereum
          : toChain === "solana"
          ? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" // USDT on Solana
          : "",
        symbol: "USDT",
        name: "Tether USD",
        decimals: toChain === "solana" ? 6 : 6,
        chainId: BRIDGE_CHAINS[toChain]?.id || 1,
      });
    }
  }, [toChain, toToken]);

  // Fetch quote from Symbiosis
  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
      
      const response = await fetch("https://api-v2.symbiosis.finance/crosschain/v1/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenAmountIn: {
            address: fromToken.address,
            amount: rawAmount,
            chainId: fromToken.chainId,
            decimals: fromToken.decimals,
          },
          tokenOut: {
            chainId: BRIDGE_CHAINS[toChain].id,
            address: toToken.address,
            symbol: toToken.symbol,
            decimals: toToken.decimals,
          },
          from: tronAddress,
          to: toChain === "tron" ? tronAddress : toChain === "solana" ? solAddress : evmAddress,
          slippage: 300, // 3%
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch quote");
      }

      const data = await response.json();
      setQuote(data);
    } catch (err: any) {
      console.error("Bridge quote error:", err);
      setError(err.message || "Failed to get bridge quote");
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, amount, tronAddress, evmAddress, toChain]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleSetMax = () => {
    if (fromBalance > 0) {
      const maxAmount = fromToken?.symbol === "TRX" 
        ? Math.max(0, fromBalance - 10) // Leave 10 TRX for fees
        : fromBalance;
      setAmount(maxAmount.toString());
    }
  };

  const canBridge = useMemo(() => {
    if (!walletsGenerated) return false;
    if (!fromToken || !toToken || !amount) return false;
    if (parseFloat(amount) <= 0) return false;
    if (parseFloat(amount) > fromBalance) return false;
    if (loading || executing) return false;
    if (!quote) return false;
    return true;
  }, [walletsGenerated, fromToken, toToken, amount, fromBalance, loading, executing, quote]);

  // Execute bridge transaction
  const handleBridge = useCallback(async (pin: string) => {
    if (!quote || !fromToken || !toToken) return;

    setExecuting(true);
    setError(null);
    setShowPinModal(false);

    try {
      // Get the transaction data from the quote
      const txData = quote.tx;
      
      if (!txData) {
        throw new Error("No transaction data in quote");
      }

      // Execute the transaction using TronWeb
      const TronWeb = (await import("tronweb")).default;
      const tronWeb = new TronWeb({
        fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.shasta.trongrid.io",
      });

      // Get encrypted keys and decrypt
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        throw new Error("Failed to get wallet keys");
      }

      const { tron: tronKeys } = await response.json();
      
      if (!tronKeys?.privateKey) {
        throw new Error("Tron private key not found");
      }

      // Sign and send the transaction
      const signedTx = await tronWeb.trx.sign(txData, tronKeys.privateKey);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!result.result) {
        throw new Error(result.message || "Transaction failed");
      }

      // Show success message
      alert(`Bridge transaction submitted! TX: ${result.txid}`);
      
      // Reset form
      setAmount("");
      setQuote(null);
    } catch (err: any) {
      console.error("Bridge execution error:", err);
      setError(err.message || "Failed to execute bridge");
    } finally {
      setExecuting(false);
    }
  }, [quote, fromToken, toToken]);

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <h2 className="text-lg font-semibold text-dark dark:text-white">Bridge Tron Assets</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Icon icon="solar:shield-check-bold-duotone" width={16} />
          <span>Powered by Symbiosis</span>
        </div>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent border-0 text-2xl font-semibold text-dark dark:text-white placeholder:text-muted focus:ring-0 p-0"
            />
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl">
              {fromToken?.logoURI && (
                <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <span className="font-semibold text-dark dark:text-white">{fromToken?.symbol || "Select"}</span>
            </div>
          </div>

          {/* Chain display */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <div className="flex items-center gap-1.5">
              {BRIDGE_CHAINS[fromChain]?.logo && (
                <img src={BRIDGE_CHAINS[fromChain].logo} alt="" className="w-4 h-4" />
              )}
              <span className="text-xs font-medium text-dark dark:text-white">
                {BRIDGE_CHAINS[fromChain]?.name || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Swap direction button */}
        <div className="flex justify-center -my-1">
          <div className="w-9 h-9 bg-white dark:bg-black border-4 border-lightgray dark:border-darkborder rounded-xl flex items-center justify-center">
            <Icon icon="ph:arrow-down" className="text-muted" width={18} />
          </div>
        </div>

        {/* To section */}
        <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">To (estimated)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-semibold text-dark dark:text-white">
              {loading ? (
                <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
              ) : quote?.tokenAmountOut ? (
                (parseFloat(quote.tokenAmountOut.amount) / Math.pow(10, quote.tokenAmountOut.decimals)).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              ) : (
                <span className="text-muted">0.00</span>
              )}
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl">
              <span className="font-semibold text-dark dark:text-white">{toToken?.symbol || "USDT"}</span>
            </div>
          </div>

          {/* Chain selector */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <div className="flex items-center gap-1.5">
              {BRIDGE_CHAINS[toChain]?.logo && (
                <img src={BRIDGE_CHAINS[toChain].logo} alt="" className="w-4 h-4" />
              )}
              <select
                value={toChain}
                onChange={(e) => setToChain(e.target.value as ChainKey)}
                className="text-xs font-medium text-dark dark:text-white bg-transparent border-0 hover:text-primary transition-colors cursor-pointer focus:outline-none"
              >
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quote details */}
        {quote && !error && (
          <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Estimated Time</span>
              <span className="text-dark dark:text-white font-medium">
                ~{Math.ceil((quote.estimatedTime || 300) / 60)} min
              </span>
            </div>
            {quote.fee && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Bridge Fee</span>
                <span className="text-dark dark:text-white font-medium">
                  {(parseFloat(quote.fee.amount) / Math.pow(10, quote.fee.decimals)).toFixed(4)} {quote.fee.symbol}
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
            : !fromToken || !toToken
            ? "Select tokens"
            : !amount || parseFloat(amount) <= 0
            ? "Enter amount"
            : parseFloat(amount) > fromBalance
            ? "Insufficient balance"
            : loading
            ? "Fetching quote..."
            : !quote
            ? "Enter amount"
            : "Bridge"}
        </button>

        {/* Info */}
        <p className="text-xs text-muted text-center">
          Cross-chain bridging powered by Symbiosis Protocol
        </p>
      </div>

      {/* PIN Confirmation Modal */}
      <PinConfirmModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleBridge}
        title="Confirm Bridge"
        description={`Enter your PIN to bridge ${amount} ${fromToken?.symbol} to ${toChain}`}
      />
    </div>
  );
}
