"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useTron } from "@/app/context/tronContext";
import { useEvm } from "@/app/context/evmContext";
import { useWallet } from "@/app/context/walletContext";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import PinConfirmModal from "../swap/PinConfirmModal";
import { 
  AllbridgeCoreSdk, 
  ChainSymbol, 
  Messenger,
  nodeRpcUrlsDefault,
  ChainDetailsMap,
  TokenWithChainDetails
} from "@allbridge/bridge-core-sdk";

const MINIMUM_BRIDGE_AMOUNT_TRX = 10;

export default function TronBridgeInterface() {
  const { address: tronAddress, balance: trxBalance } = useTron();
  const { address: evmAddress } = useEvm();
  const { walletsGenerated } = useWallet();
  
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [sdk, setSdk] = useState<AllbridgeCoreSdk | null>(null);
  const [chains, setChains] = useState<ChainDetailsMap | null>(null);
  const [sourceToken, setSourceToken] = useState<TokenWithChainDetails | null>(null);
  const [destinationToken, setDestinationToken] = useState<TokenWithChainDetails | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [allowanceChecked, setAllowanceChecked] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  // Initialize Allbridge SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        console.log("[Allbridge] Initializing SDK...");
        
        const sdkInstance = new AllbridgeCoreSdk({
          ...nodeRpcUrlsDefault,
          TRX: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
          ETH: process.env.NEXT_PUBLIC_ETH_RPC || "https://eth-mainnet.g.alchemy.com/v2/Hzb8ZnlDROuI4aqqHYBeV",
        });
        
        setSdk(sdkInstance);
        
        // Fetch supported chains and tokens
        const chainDetails = await sdkInstance.chainDetailsMap();
        setChains(chainDetails);
        
        console.log("[Allbridge] Supported chains:", Object.keys(chainDetails));
        
        // Find TRX on Tron (native token)
        const tronChain = chainDetails[ChainSymbol.TRX];
        console.log("[Allbridge] Tron chain tokens:", tronChain?.tokens.map(t => ({ symbol: t.symbol, name: t.name })));
        
        const trxToken = tronChain?.tokens.find(
          (token) => token.symbol === "TRX" || token.symbol === "TRON" || token.name.includes("TRX")
        );
        
        // Find ETH on Ethereum (native token)
        const ethChain = chainDetails[ChainSymbol.ETH];
        console.log("[Allbridge] Ethereum chain tokens:", ethChain?.tokens.map(t => ({ symbol: t.symbol, name: t.name })));
        
        const ethToken = ethChain?.tokens.find(
          (token) => token.symbol === "ETH" || token.symbol === "WETH" || token.name.includes("ETH")
        );
        
        // If native tokens not found, try to find USDT as fallback
        if (!trxToken || !ethToken) {
          console.log("[Allbridge] Native tokens not found, looking for USDT...");
          const usdtOnTron = tronChain?.tokens.find((token) => token.symbol === "USDT");
          const usdtOnEth = ethChain?.tokens.find((token) => token.symbol === "USDT");
          
          if (usdtOnTron && usdtOnEth) {
            console.log("[Allbridge] Using USDT bridge instead");
            setSourceToken(usdtOnTron);
            setDestinationToken(usdtOnEth);
            setSdkInitialized(true);
            console.log("[Allbridge] SDK initialized with USDT");
            return;
          }
          
          throw new Error("No suitable bridge tokens found. Available tokens logged to console.");
        }
        
        setSourceToken(trxToken);
        setDestinationToken(ethToken);
        setSdkInitialized(true);
        
        console.log("[Allbridge] SDK initialized successfully");
        console.log("[Allbridge] Source token:", trxToken.symbol, "on", trxToken.chainSymbol);
        console.log("[Allbridge] Destination token:", ethToken.symbol, "on", ethToken.chainSymbol);
      } catch (err) {
        console.error("[Allbridge] SDK initialization error:", err);
        setError("Failed to initialize bridge SDK");
      }
    };

    initSdk();
  }, []);

  // Check allowance when amount changes
  useEffect(() => {
    const checkAllowance = async () => {
      if (!sdk || !sourceToken || !tronAddress || !amount || parseFloat(amount) <= 0) {
        setAllowanceChecked(false);
        setNeedsApproval(false);
        return;
      }

      try {
        const hasAllowance = await sdk.bridge.checkAllowance({
          token: sourceToken,
          owner: tronAddress,
          amount: amount,
        });
        
        setNeedsApproval(!hasAllowance);
        setAllowanceChecked(true);
        
        console.log("[Allbridge] Allowance check:", hasAllowance ? "Approved" : "Needs approval");
      } catch (err) {
        console.error("[Allbridge] Allowance check error:", err);
        setAllowanceChecked(false);
      }
    };

    const timer = setTimeout(() => {
      checkAllowance();
    }, 500);

    return () => clearTimeout(timer);
  }, [sdk, sourceToken, tronAddress, amount]);

  // Fetch quote
  const fetchQuote = useCallback(async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0 || !sdk || !sourceToken || !destinationToken) {
      setQuote(null);
      setError(null);
      return;
    }

    // Validate minimum amount
    if (amountNum < MINIMUM_BRIDGE_AMOUNT_TRX) {
      setError(`Minimum bridge amount is ${MINIMUM_BRIDGE_AMOUNT_TRX} ${sourceToken.symbol}`);
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[Allbridge] Fetching quote for", amountNum, sourceToken.symbol);
      
      // Use the SDK's calculation method
      const receiveAmountFloat = await sdk.getAmountToBeReceived(
        amount,
        sourceToken,
        destinationToken,
        Messenger.ALLBRIDGE
      );
      
      // Calculate fee manually (input - output)
      const receiveAmountNum = typeof receiveAmountFloat === 'number' 
        ? receiveAmountFloat 
        : parseFloat(receiveAmountFloat.toString());
      const feeAmount = parseFloat(amount) - receiveAmountNum;
      
      // Estimate transfer time (typically 5-10 minutes for Allbridge)
      const transferTime = 600; // 10 minutes in seconds
      
      // Gas fee estimation (approximate)
      const gasFee = "0.5"; // Approximate gas fee in USD
      
      const quoteData = {
        amountIn: amount,
        amountOut: receiveAmountNum.toString(),
        fee: feeAmount.toString(),
        transferTime: transferTime,
        gasFee: gasFee,
        sourceToken: sourceToken,
        destinationToken: destinationToken,
      };
      
      console.log("[Allbridge] Quote received:", quoteData);
      setQuote(quoteData);
    } catch (err: any) {
      console.error("[Allbridge] Quote error:", err);
      setError(err.message || "Failed to get bridge quote");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [amount, sdk, sourceToken, destinationToken]);

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
      // Leave some TRX for fees
      const maxAmount = Math.max(0, trxBalance - 10);
      setAmount(maxAmount.toString());
    }
  };

  const canBridge = useMemo(() => {
    if (!walletsGenerated) return false;
    if (!sdkInitialized) return false;
    if (!amount) return false;
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return false;
    if (amountNum < MINIMUM_BRIDGE_AMOUNT_TRX) return false;
    if (amountNum > trxBalance) return false;
    if (loading || executing) return false;
    if (!quote) return false;
    if (!allowanceChecked) return false;
    return true;
  }, [walletsGenerated, sdkInitialized, amount, trxBalance, loading, executing, quote, allowanceChecked]);

  // Approve tokens
  const handleApprove = useCallback(async (pin: string) => {
    if (!sdk || !sourceToken || !tronAddress) return;

    setExecuting(true);
    setError(null);
    setShowPinModal(false);

    try {
      console.log("[Allbridge] Starting approval...");

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
      
      if (!data.success || !data.wallets?.tron?.encryptedPrivateKey) {
        throw new Error("Tron wallet not found");
      }

      const privateKey = decryptWithPIN(data.wallets.tron.encryptedPrivateKey, pin);

      // Build approve transaction
      const rawTx = await sdk.bridge.rawTxBuilder.approve({
        token: sourceToken,
        owner: tronAddress,
      });

      console.log("[Allbridge] Approve transaction built:", rawTx);

      // Sign and send transaction
      const TronWeb = (await import("tronweb")).default;
      const tronWeb = new TronWeb({
        fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
        privateKey: privateKey,
      });

      const signedTx = await tronWeb.trx.sign(rawTx, privateKey);
      const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!receipt.result) {
        throw new Error(receipt.message || "Approval transaction failed");
      }

      const txHash = receipt.txid || receipt.transaction?.txID;
      console.log("[Allbridge] Approval transaction:", txHash);

      // Wait for confirmation
      let attempts = 0;
      const maxAttempts = 30;
      let confirmed = false;
      
      while (attempts < maxAttempts && !confirmed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
          
          if (txInfo && Object.keys(txInfo).length > 0) {
            if (txInfo.receipt?.result === "SUCCESS") {
              confirmed = true;
              console.log("[Allbridge] Approval confirmed");
              
              // Recheck allowance
              setNeedsApproval(false);
              setAllowanceChecked(true);
              
              alert(`Approval successful!\nTX: ${txHash}\n\nYou can now proceed with the bridge.`);
              break;
            } else if (txInfo.receipt?.result === "REVERT") {
              throw new Error(`Approval reverted: ${txInfo.resMessage || "Unknown reason"}`);
            }
          }
        } catch (err: any) {
          if (err.message.includes("reverted")) {
            throw err;
          }
        }
        
        attempts++;
      }
      
      if (!confirmed) {
        alert(`Approval pending confirmation.\nTX: ${txHash}\n\nPlease wait for confirmation before bridging.`);
      }
    } catch (err: any) {
      console.error("[Allbridge] Approval error:", err);
      setError(err.message || "Failed to approve tokens");
    } finally {
      setExecuting(false);
    }
  }, [sdk, sourceToken, tronAddress]);

  // Execute bridge transaction
  const handleBridge = useCallback(async (pin: string) => {
    if (!sdk || !sourceToken || !destinationToken || !quote || !tronAddress || !evmAddress) return;

    setExecuting(true);
    setError(null);
    setShowPinModal(false);

    try {
      console.log("[Allbridge] Starting bridge transaction...");
      console.log("[Allbridge] Amount:", amount, sourceToken.symbol);
      console.log("[Allbridge] From:", tronAddress, "(Tron)");
      console.log("[Allbridge] To:", evmAddress, "(Ethereum)");

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
      
      if (!data.success || !data.wallets?.tron?.encryptedPrivateKey) {
        throw new Error("Tron wallet not found");
      }

      const privateKey = decryptWithPIN(data.wallets.tron.encryptedPrivateKey, pin);

      // Build send transaction
      const rawTx = await sdk.bridge.rawTxBuilder.send({
        amount: amount,
        fromAccountAddress: tronAddress,
        toAccountAddress: evmAddress,
        sourceToken: sourceToken,
        destinationToken: destinationToken,
        messenger: Messenger.ALLBRIDGE,
      });

      console.log("[Allbridge] Bridge transaction built:", rawTx);

      // Sign and send transaction
      const TronWeb = (await import("tronweb")).default;
      const tronWeb = new TronWeb({
        fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
        privateKey: privateKey,
      });

      const signedTx = await tronWeb.trx.sign(rawTx, privateKey);
      const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!receipt.result) {
        throw new Error(receipt.message || "Bridge transaction failed");
      }

      const txHash = receipt.txid || receipt.transaction?.txID;
      console.log("[Allbridge] Bridge transaction:", txHash);

      // Wait for confirmation
      let attempts = 0;
      const maxAttempts = 30;
      let confirmed = false;
      
      while (attempts < maxAttempts && !confirmed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
          
          if (txInfo && Object.keys(txInfo).length > 0) {
            if (txInfo.receipt?.result === "SUCCESS") {
              confirmed = true;
              console.log("[Allbridge] Bridge transaction confirmed");
              break;
            } else if (txInfo.receipt?.result === "REVERT") {
              throw new Error(`Transaction reverted: ${txInfo.resMessage || "Unknown reason"}`);
            }
          }
        } catch (err: any) {
          if (err.message.includes("reverted")) {
            throw err;
          }
        }
        
        attempts++;
      }
      
      if (!confirmed) {
        alert(`Bridge transaction submitted!\nTX: ${txHash}\n\nTransaction is pending confirmation.\n\nView on TronScan: https://tronscan.org/#/transaction/${txHash}`);
      } else {
        alert(`Bridge successful!\nTX: ${txHash}\n\nYou will receive ${quote.amountOut} ${destinationToken.symbol} on Ethereum.\n\nEstimated time: ~${Math.ceil((quote.transferTime || 300) / 60)} minutes\n\nView on TronScan: https://tronscan.org/#/transaction/${txHash}`);
      }
      
      // Reset form
      setAmount("");
      setQuote(null);
      setAllowanceChecked(false);
      setNeedsApproval(false);
    } catch (err: any) {
      console.error("[Allbridge] Bridge error:", err);
      setError(err.message || "Failed to execute bridge");
    } finally {
      setExecuting(false);
    }
  }, [sdk, sourceToken, destinationToken, quote, amount, tronAddress, evmAddress]);

  return (
    <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-darkborder">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          {sourceToken && destinationToken 
            ? `${sourceToken.symbol} → ${destinationToken.symbol} Bridge`
            : "Cross-Chain Bridge"
          }
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Icon icon="solar:shield-check-bold-duotone" width={16} />
          <span>Powered by Allbridge</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {!sdkInitialized ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted">
              <Icon icon="ph:spinner" className="animate-spin" width={24} />
              <span>Initializing bridge...</span>
            </div>
          </div>
        ) : (
          <>
            {/* From section - USDT on Tron */}
            <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">From</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    Balance: {trxBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {sourceToken?.symbol || "TRX"}
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
                  <img 
                    src={sourceToken?.symbol === "USDT" 
                      ? "https://cryptologos.cc/logos/tether-usdt-logo.png"
                      : "https://logowik.com/content/uploads/images/tron-trx-icon3386.logowik.com.webp"
                    }
                    alt={sourceToken?.symbol || "Token"} 
                    className="w-6 h-6 rounded-full" 
                  />
                  <span className="font-semibold text-dark dark:text-white">{sourceToken?.symbol || "..."}</span>
                </div>
              </div>

              {/* Chain info */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
                <span className="text-xs text-muted">Network:</span>
                <div className="flex items-center gap-1.5">
                  <img 
                    src="https://logowik.com/content/uploads/images/tron-trx-icon3386.logowik.com.webp" 
                    alt="Tron" 
                    className="w-4 h-4" 
                  />
                  <span className="text-xs font-medium text-dark dark:text-white">Tron</span>
                </div>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center -my-1">
              <div className="w-9 h-9 bg-white dark:bg-black border-4 border-lightgray dark:border-darkborder rounded-xl flex items-center justify-center">
                <Icon icon="ph:arrow-down" className="text-muted" width={18} />
              </div>
            </div>

            {/* To section - ETH on Ethereum */}
            <div className="bg-lightgray dark:bg-darkborder rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">To (estimated)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 text-2xl font-semibold text-dark dark:text-white">
                  {loading ? (
                    <Icon icon="ph:spinner" className="animate-spin text-muted" width={24} />
                  ) : quote?.amountOut ? (
                    parseFloat(quote.amountOut).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })
                  ) : (
                    <span className="text-muted">0.00</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl">
                  <img 
                    src={destinationToken?.symbol === "USDT"
                      ? "https://cryptologos.cc/logos/tether-usdt-logo.png"
                      : "https://cryptologos.cc/logos/ethereum-eth-logo.png"
                    }
                    alt={destinationToken?.symbol || "Token"} 
                    className="w-6 h-6 rounded-full" 
                  />
                  <span className="font-semibold text-dark dark:text-white">{destinationToken?.symbol || "..."}</span>
                </div>
              </div>

              {/* Chain info */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-darkborder/50">
                <span className="text-xs text-muted">Network:</span>
                <div className="flex items-center gap-1.5">
                  <img 
                    src="https://cryptologos.cc/logos/ethereum-eth-logo.png" 
                    alt="Ethereum" 
                    className="w-4 h-4" 
                  />
                  <span className="text-xs font-medium text-dark dark:text-white">Ethereum</span>
                </div>
              </div>
            </div>

            {/* Quote details */}
            {quote && !error && (
              <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Estimated Time</span>
                  <span className="text-dark dark:text-white font-medium">
                    ~{Math.ceil((quote.transferTime || 300) / 60)} min
                  </span>
                </div>
                {quote.fee && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Bridge Fee</span>
                    <span className="text-dark dark:text-white font-medium">
                      {parseFloat(quote.fee).toFixed(6)} {sourceToken?.symbol || ""}
                    </span>
                  </div>
                )}
                {quote.gasFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Est. Gas Fee</span>
                    <span className="text-dark dark:text-white font-medium">
                      ${parseFloat(quote.gasFee).toFixed(4)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Minimum Amount</span>
                  <span className="text-dark dark:text-white font-medium">
                    {MINIMUM_BRIDGE_AMOUNT_TRX} {sourceToken?.symbol || ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Bridge Provider</span>
                  <span className="text-dark dark:text-white font-medium">
                    Allbridge Core
                  </span>
                </div>
              </div>
            )}

            {/* Approval status */}
            {allowanceChecked && needsApproval && amount && parseFloat(amount) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl text-warning text-sm">
                <Icon icon="ph:warning" width={18} />
                <span>You need to approve {sourceToken?.symbol || "token"} spending first</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-error/10 rounded-xl text-error text-sm">
                <Icon icon="ph:warning" width={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            {needsApproval && allowanceChecked ? (
              <button
                onClick={() => setShowPinModal(true)}
                disabled={!amount || parseFloat(amount) <= 0 || executing}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  amount && parseFloat(amount) > 0 && !executing
                    ? "bg-warning text-white hover:bg-warning/90"
                    : "bg-lightgray dark:bg-darkborder text-muted cursor-not-allowed"
                }`}
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="ph:spinner" className="animate-spin" width={20} />
                    Approving...
                  </span>
                ) : (
                  `Approve ${sourceToken?.symbol || "Token"}`
                )}
              </button>
            ) : (
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
                  : !sdkInitialized
                  ? "Initializing..."
                  : !amount || parseFloat(amount) <= 0
                  ? "Enter amount"
                  : parseFloat(amount) < MINIMUM_BRIDGE_AMOUNT_TRX
                  ? `Minimum ${MINIMUM_BRIDGE_AMOUNT_TRX} ${sourceToken?.symbol || ""}`
                  : parseFloat(amount) > trxBalance
                  ? "Insufficient balance"
                  : loading
                  ? "Fetching quote..."
                  : !quote
                  ? "Enter amount"
                  : `Bridge ${sourceToken?.symbol || ""} → ${destinationToken?.symbol || ""}`}
              </button>
            )}

            {/* Info */}
            <p className="text-xs text-muted text-center">
              Bridge {sourceToken?.symbol || "tokens"} from Tron to {destinationToken?.symbol || "tokens"} on Ethereum • Minimum: {MINIMUM_BRIDGE_AMOUNT_TRX} {sourceToken?.symbol || ""} • Powered by Allbridge Core
            </p>
          </>
        )}
      </div>

      {/* PIN Confirmation Modal */}
      <PinConfirmModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={needsApproval ? handleApprove : handleBridge}
        title={needsApproval ? `Approve ${sourceToken?.symbol || "Token"}` : "Confirm Bridge"}
        description={
          needsApproval
            ? `Enter your PIN to approve ${sourceToken?.symbol || "token"} spending`
            : `Enter your PIN to bridge ${amount} ${sourceToken?.symbol || ""} to ${destinationToken?.symbol || ""} on Ethereum`
        }
      />
    </div>
  );
}
