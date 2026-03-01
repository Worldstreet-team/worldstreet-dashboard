"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useTron } from "@/app/context/tronContext";
import { useEvm } from "@/app/context/evmContext";
import { useSolana } from "@/app/context/solanaContext";
import { useWallet } from "@/app/context/walletContext";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { 
  validateSymbiosisQuote, 
  formatValidationErrors,
  isQuoteExecutable,
  getFeeSummary 
} from "@/lib/bridge/symbiosisValidator";
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
  const [validatedQuote, setValidatedQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);

  // Get available tokens for each chain
  const availableTokens = useMemo<Record<ChainKey, BridgeToken[]>>(() => {
    const tokens: Record<ChainKey, BridgeToken[]> = {
      tron: [],
      ethereum: [],
      solana: [],
    };

    // Tron tokens
    tokens.tron = [
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
      tokens.tron.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        decimals: token.decimals,
        chainId: 728126428,
        logoURI: token.logoURI,
      });
    });

    // Ethereum tokens (add common ones)
    tokens.ethereum = [
      {
        address: "",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        chainId: 1,
        logoURI: BRIDGE_CHAINS.ethereum.logo,
      },
      {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        chainId: 1,
        logoURI: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        chainId: 1,
        logoURI: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
    ];

    // Solana tokens (add common ones)
    tokens.solana = [
      {
        address: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        chainId: 1151111081099710,
        logoURI: BRIDGE_CHAINS.solana.logo,
      },
      {
        address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        chainId: 1151111081099710,
        logoURI: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      },
      {
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        chainId: 1151111081099710,
        logoURI: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      },
    ];

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
    if (!fromToken && availableTokens[fromChain].length > 0) {
      const usdt = availableTokens[fromChain].find(t => t.symbol === "USDT");
      setFromToken(usdt || availableTokens[fromChain][0]);
    }
  }, [fromChain, fromToken, availableTokens]);

  // Auto-select destination token
  useEffect(() => {
    if (!toToken && availableTokens[toChain].length > 0) {
      const usdt = availableTokens[toChain].find(t => t.symbol === "USDT");
      setToToken(usdt || availableTokens[toChain][0]);
    }
  }, [toChain, toToken, availableTokens]);

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
      console.log("[Bridge] Raw Symbiosis response:", data);
      
      // Validate the quote before setting it
      if (fromToken && toToken) {
        const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
        const validation = validateSymbiosisQuote(data, fromToken, toToken, rawAmount);
        
        console.log("[Bridge] Validation result:", validation);
        
        if (!validation.isValid) {
          const errorMsg = formatValidationErrors(validation);
          console.error("[Bridge] Quote validation failed:", errorMsg);
          setError(validation.errors[0] || "Invalid quote data");
          setQuote(null);
          setValidatedQuote(null);
          return;
        }
        
        if (validation.warnings.length > 0) {
          console.warn("[Bridge] Quote warnings:", validation.warnings);
        }
        
        setValidatedQuote(validation);
      }
      
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

  // Swap chains and tokens
  const handleSwapChains = () => {
    const tempChain = fromChain;
    const tempToken = fromToken;
    
    setFromChain(toChain);
    setToChain(tempChain);
    setFromToken(toToken);
    setToToken(tempToken);
    setAmount("");
  };

  // Set max amount
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
    if (!quote || !validatedQuote) return false;
    if (!isQuoteExecutable(validatedQuote)) return false;
    return true;
  }, [walletsGenerated, fromToken, toToken, amount, fromBalance, loading, executing, quote, validatedQuote]);

  // Execute bridge transaction
  const handleBridge = useCallback(async (pin: string) => {
    if (!quote || !fromToken || !toToken) return;

    setExecuting(true);
    setError(null);
    setShowPinModal(false);

    try {
      console.log("[Bridge] Starting bridge execution");
      console.log("[Bridge] Quote data:", quote);
      console.log("[Bridge] Validated data:", validatedQuote);

      // Use validated transaction data
      if (!validatedQuote || !validatedQuote.tx) {
        throw new Error("No validated transaction data available");
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

      // Determine which chain we're sending from and get the appropriate key
      let privateKey: string;
      let txHash: string;
      
      if (fromChain === "tron") {
        if (!data.wallets?.tron?.encryptedPrivateKey) {
          throw new Error("Tron wallet not found");
        }
        privateKey = decryptWithPIN(data.wallets.tron.encryptedPrivateKey, pin);

        // Execute Tron transaction
        const TronWeb = (await import("tronweb")).default;
        const tronWeb = new TronWeb({
          fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.shasta.trongrid.io",
          privateKey: privateKey,
        });

        // Use validated transaction data
        const txTo = validatedQuote.tx.to;
        const txValue = validatedQuote.tx.value;
        const txData = validatedQuote.tx.data;

        console.log("[Bridge] Executing Tron transaction to:", txTo);

        // For TRC20 tokens, we need to trigger the contract
        if (fromToken.address) {
          // TRC20 token transfer - use contract interaction
          const contract = await tronWeb.contract().at(fromToken.address);
          const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals));
          
          console.log("[Bridge] TRC20 transfer:", rawAmount, "to", txTo);
          
          const tx = await contract.transfer(txTo, rawAmount).send({
            feeLimit: parseInt(validatedQuote.tx.feeLimit),
          });

          txHash = tx;
          console.log("[Bridge] TRC20 transaction sent:", txHash);
        } else {
          // Native TRX transfer
          const rawAmount = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals));
          
          console.log("[Bridge] Native TRX transfer:", rawAmount, "to", txTo);
          
          const tx = await tronWeb.transactionBuilder.sendTrx(
            txTo,
            rawAmount,
            tronAddress
          );
          
          const signedTx = await tronWeb.trx.sign(tx, privateKey);
          const result = await tronWeb.trx.sendRawTransaction(signedTx);

          if (!result.result) {
            throw new Error(result.message || "Transaction failed");
          }

          txHash = result.txid;
          console.log("[Bridge] Native TRX transaction sent:", txHash);
        }

        alert(`Bridge transaction submitted!\nTX: ${txHash}\n\nFees: ${getFeeSummary(validatedQuote)}`);
      } else if (fromChain === "ethereum") {
        if (!data.wallets?.ethereum?.encryptedPrivateKey) {
          throw new Error("Ethereum wallet not found");
        }
        privateKey = decryptWithPIN(data.wallets.ethereum.encryptedPrivateKey, pin);

        // Execute EVM transaction
        const { ethers } = await import("ethers");
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_ETH_RPC || "https://cloudflare-eth.com"
        );
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log("[Bridge] Executing Ethereum transaction");

        const tx = await wallet.sendTransaction({
          to: validatedQuote.tx.to,
          data: validatedQuote.tx.data || "0x",
          value: BigInt(validatedQuote.tx.value || "0"),
          gasLimit: BigInt(validatedQuote.tx.feeLimit || "500000"),
        });

        await tx.wait(1);
        txHash = tx.hash;
        console.log("[Bridge] Ethereum transaction sent:", txHash);
        
        alert(`Bridge transaction submitted!\nTX: ${txHash}\n\nFees: ${getFeeSummary(validatedQuote)}`);
      } else if (fromChain === "solana") {
        if (!data.wallets?.solana?.encryptedPrivateKey) {
          throw new Error("Solana wallet not found");
        }
        privateKey = decryptWithPIN(data.wallets.solana.encryptedPrivateKey, pin);

        // Execute Solana transaction
        const { Connection, Keypair, VersionedTransaction } = await import("@solana/web3.js");
        
        const secretKey = new Uint8Array(Buffer.from(privateKey, "base64"));
        const keypair = Keypair.fromSecretKey(secretKey);
        
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com",
          "confirmed"
        );

        console.log("[Bridge] Executing Solana transaction");

        // Deserialize and sign the transaction
        const txData = Buffer.from(validatedQuote.tx.data, "base64");
        const transaction = VersionedTransaction.deserialize(txData);
        transaction.sign([keypair]);

        const signature = await connection.sendTransaction(transaction, {
          maxRetries: 5,
          preflightCommitment: "confirmed",
        });

        txHash = signature;
        console.log("[Bridge] Solana transaction sent:", txHash);
        
        alert(`Bridge transaction submitted!\nTX: ${txHash}\n\nFees: ${getFeeSummary(validatedQuote)}`);
      }
      
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
  }, [quote, validatedQuote, fromToken, toToken, fromChain, amount, tronAddress]);

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <h2 className="text-lg font-semibold text-dark dark:text-white">Cross-Chain Bridge</h2>
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
            
            <button
              onClick={() => setShowFromTokenModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {fromToken?.logoURI && (
                <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <span className="font-semibold text-dark dark:text-white">{fromToken?.symbol || "Select"}</span>
              <Icon icon="ph:caret-down" className="text-muted" width={16} />
            </button>
          </div>

          {/* Chain selector */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
            <span className="text-xs text-muted">Network:</span>
            <div className="flex items-center gap-1.5">
              {BRIDGE_CHAINS[fromChain]?.logo && (
                <img src={BRIDGE_CHAINS[fromChain].logo} alt="" className="w-4 h-4" />
              )}
              <select
                value={fromChain}
                onChange={(e) => {
                  setFromChain(e.target.value as ChainKey);
                  setFromToken(null);
                }}
                className="text-xs font-medium text-dark dark:text-white bg-transparent border-0 hover:text-primary transition-colors cursor-pointer focus:outline-none"
              >
                <option value="tron">Tron</option>
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
              </select>
            </div>
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
            
            <button
              onClick={() => setShowToTokenModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {toToken?.logoURI && (
                <img src={toToken.logoURI} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <span className="font-semibold text-dark dark:text-white">{toToken?.symbol || "Select"}</span>
              <Icon icon="ph:caret-down" className="text-muted" width={16} />
            </button>
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
                onChange={(e) => {
                  setToChain(e.target.value as ChainKey);
                  setToToken(null);
                }}
                className="text-xs font-medium text-dark dark:text-white bg-transparent border-0 hover:text-primary transition-colors cursor-pointer focus:outline-none"
              >
                <option value="tron">Tron</option>
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quote details */}
        {quote && !error && validatedQuote && (
          <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Estimated Time</span>
              <span className="text-dark dark:text-white font-medium">
                ~{Math.ceil((quote.estimatedTime || 300) / 60)} min
              </span>
            </div>
            {validatedQuote.aggregatedFees && validatedQuote.aggregatedFees.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Bridge Fees</span>
                <span className="text-dark dark:text-white font-medium">
                  {getFeeSummary(validatedQuote)}
                </span>
              </div>
            )}
            {validatedQuote.priceImpact !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Price Impact</span>
                <span className={`font-medium ${
                  validatedQuote.priceImpact > 5 ? 'text-warning' : 
                  validatedQuote.priceImpact > 15 ? 'text-error' : 
                  'text-dark dark:text-white'
                }`}>
                  {validatedQuote.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            {validatedQuote.warnings && validatedQuote.warnings.length > 0 && (
              <div className="pt-2 border-t border-border/50 dark:border-darkborder/50">
                <p className="text-xs text-warning mb-1">Warnings:</p>
                {validatedQuote.warnings.slice(0, 2).map((warning: string, i: number) => (
                  <p key={i} className="text-xs text-muted">• {warning}</p>
                ))}
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

      {/* Token Selection Modals */}
      {showFromTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFromTokenModal(false)}>
          <div className="bg-white dark:bg-black rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Select Token</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableTokens[fromChain].map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    setFromToken(token);
                    setShowFromTokenModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-lightgray dark:hover:bg-darkborder transition-colors"
                >
                  {token.logoURI && (
                    <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-dark dark:text-white">{token.symbol}</p>
                    <p className="text-xs text-muted">{token.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showToTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowToTokenModal(false)}>
          <div className="bg-white dark:bg-black rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Select Token</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableTokens[toChain].map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    setToToken(token);
                    setShowToTokenModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-lightgray dark:hover:bg-darkborder transition-colors"
                >
                  {token.logoURI && (
                    <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-dark dark:text-white">{token.symbol}</p>
                    <p className="text-xs text-muted">{token.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
