"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useWallet } from "./walletContext";
import { useSolana } from "./solanaContext";
import { useEvm } from "./evmContext";
import { useAuth } from "./authContext";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { pollTransactionConfirmation } from "@/lib/solana/pollTransactionConfirmation";

// Li.Fi API endpoints
const LIFI_API = "https://li.quest/v1";

// Solana RPC — uses Alchemy via env, falls back to public mainnet
const SOL_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC || "https://solana-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

// Ethereum RPC — uses Alchemy via env
const ETH_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC || "https://cloudflare-eth.com";

// Supported chains for swap (Solana and Ethereum only)
export const SWAP_CHAINS = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://static.debank.com/image/chain/logo_url/eth/265c6ad30399940c562599eb8a183296.png",
    type: "EVM",
    lifiSupported: true,
  },
  solana: {
    id: 1151111081099710,
    name: "Solana",
    symbol: "SOL",
    logo: "https://static.debank.com/image/chain/logo_url/sol/1e6d4c14106579294f997c02b37be801.png",
    type: "SVM",
    lifiSupported: true,
  },
  bitcoin: {
    id: 20000000000001,
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://static.debank.com/image/coin/logo_url/btc/c543666657934440537e2315fa763c37.png",
    type: "UTXO",
    lifiSupported: false,
  },
} as const;

export type ChainKey = keyof typeof SWAP_CHAINS;

export interface SwapToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
}

export interface SwapQuote {
  id: string;
  fromChain: ChainKey;
  toChain: ChainKey;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedDuration: number; // seconds
  gasCosts: {
    amount: string;
    amountUSD: string;
    token: SwapToken;
  }[];
  feeCosts: {
    amount: string;
    amountUSD: string;
    name: string;
    token: SwapToken;
  }[];
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
  };
  toolDetails?: {
    name: string;
    logoURI: string;
  };
}

export interface SwapStatus {
  status: "NOT_FOUND" | "PENDING" | "DONE" | "FAILED";
  substatus?: string;
  substatusMessage?: string;
  fromChain?: number;
  toChain?: number;
  toAmount?: string;
  txHash?: string;
  receiving?: {
    txHash: string;
    chainId: number;
    amount: string;
    token: SwapToken;
  };
}

// ── Format swap errors into user-friendly messages ─────────────────────────
// Ported from crypto-test-1 formatSwapError + extended with Solana-specific errors
export function formatSwapError(err: unknown, chainName?: string): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  const chain = chainName || "Swap";

  // Log the raw error for debugging
  console.error(`[formatSwapError] Raw error for ${chain}:`, err);

  if (msg.includes("insufficient") || msg.includes("Attempt to debit an account")) {
    return `Insufficient ${chain} balance. Your wallet might be empty or missing funds for gas.`;
  }
  if (msg.includes("Simulation failed")) {
    // Include more details from the original error
    const errorDetails = err instanceof Error && err.stack ? `\n\nDetails: ${err.stack.split('\n')[0]}` : '';
    return `Transaction simulation failed on ${chain}. This usually means insufficient funds or an invalid transaction state.${errorDetails}`;
  }
  if (msg.includes("Could not find token")) {
    return `Asset identification error: Li.Fi could not locate the token on the destination chain.`;
  }
  if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("denied")) {
    return "Transaction was rejected by the user.";
  }
  if (msg.includes("network") || msg.includes("connection") || msg.includes("fetch")) {
    return `Network connection error. Please check your internet.`;
  }
  if (msg.includes("slippage") || msg.includes("price")) {
    return "Swap failed due to high price slippage.";
  }

  return `${chain} Error: ${msg.length > 200 ? msg.slice(0, 200) + "..." : msg}`;
}

// ── Auto-add swapped token to user's custom token list ─────────────────────
async function autoAddSwappedToken(
  toToken: SwapToken,
  toChain: ChainKey
): Promise<void> {
  // Skip native tokens — they're already tracked
  const NATIVE_ADDRESSES = [
    "So11111111111111111111111111111111111111112", // Wrapped SOL
    "11111111111111111111111111111111",              // Native SOL
    "0x0000000000000000000000000000000000000000",    // Native ETH
  ];

  if (NATIVE_ADDRESSES.includes(toToken.address)) {
    return;
  }

  try {
    const response = await fetch("/api/tokens/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        chain: toChain,
        address: toToken.address,
        symbol: toToken.symbol,
        name: toToken.name,
        decimals: toToken.decimals,
        logoURI: toToken.logoURI || "",
      }),
    });

    if (response.ok) {
      console.log(`[Swap] Auto-added ${toToken.symbol} to ${toChain} assets`);
    } else if (response.status === 409) {
      // Token already exists — this is fine
      console.log(`[Swap] ${toToken.symbol} already in ${toChain} assets`);
    } else {
      console.warn(`[Swap] Failed to auto-add token: ${response.status}`);
    }
  } catch (error) {
    console.error("[Swap] Failed to auto-add swapped token:", error);
  }
}

interface SwapContextType {
  // State
  tokens: Record<ChainKey, SwapToken[]>;
  tokensLoading: boolean;
  quote: SwapQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  executing: boolean;
  swapStatus: SwapStatus | null;
  slippage: number;

  // Actions
  fetchTokens: (chain: ChainKey) => Promise<void>;
  getQuote: (params: {
    fromChain: ChainKey;
    toChain: ChainKey;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
  }) => Promise<SwapQuote | null>;
  executeSwap: (quote: SwapQuote, pin: string) => Promise<string>;
  pollSwapStatus: (
    txHash: string,
    fromChain: ChainKey,
    toChain: ChainKey
  ) => Promise<SwapStatus>;
  setSlippage: (value: number) => void;
  saveSwapToHistory: (swap: {
    txHash: string;
    fromChain: ChainKey;
    toChain: ChainKey;
    fromToken: SwapToken;
    toToken: SwapToken;
    fromAmount: string;
    toAmount: string;
    status: string;
  }) => Promise<void>;
  addSwappedToken: (toToken: SwapToken, toChain: ChainKey) => Promise<void>;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
  const { getEncryptedKeys } = useWallet();
  const { user: authUser } = useAuth();
  const { address: solAddress } = useSolana();
  const { address: evmAddress } = useEvm();

  const [tokens, setTokens] = useState<Record<ChainKey, SwapToken[]>>({
    ethereum: [],
    solana: [],
    bitcoin: [],
  });
  const [tokensLoading, setTokensLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [swapStatus, setSwapStatus] = useState<SwapStatus | null>(null);
  const [slippage, setSlippage] = useState(3); // 3% default — reasonable for DeFi swaps

  // Fetch available tokens for a chain
  const fetchTokens = useCallback(async (chain: ChainKey) => {
    const chainId = SWAP_CHAINS[chain].id;
    setTokensLoading(true);

    try {
      const res = await fetch(`${LIFI_API}/tokens?chains=${chainId}`);
      const data = await res.json();

      if (data.tokens && data.tokens[chainId]) {
        // Filter out tokens with very small liquidity
        const filteredTokens = data.tokens[chainId].filter(
          (t: SwapToken) => t.priceUSD && parseFloat(t.priceUSD) > 0
        );

        setTokens((prev) => ({
          ...prev,
          [chain]: filteredTokens.slice(0, 100), // Limit to top 100 tokens
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch tokens for ${chain}:`, error);
    } finally {
      setTokensLoading(false);
    }
  }, []);

  // ── Get swap quote via backend API ──────────────────────────────────────
  const getQuote = useCallback(
    async (params: {
      fromChain: ChainKey;
      toChain: ChainKey;
      fromToken: string;
      toToken: string;
      fromAmount: string;
      fromAddress: string;
      toAddress: string;
    }): Promise<SwapQuote | null> => {
      setQuoteLoading(true);
      setQuoteError(null);
      setQuote(null);

      try {
        const chainLabel = params.fromChain === "solana" ? "SOL" : "ETH";
        const toChainLabel = params.toChain === "solana" ? "SOL" : "ETH";

        console.log("[SwapContext] Fetching quote via /api/quote:", {
          fromChain: chainLabel,
          tokenIn: params.fromToken,
          tokenOut: params.toToken,
          amountIn: params.fromAmount,
        });

        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authUser?.userId || "unknown",
            fromChain: chainLabel,
            toChain: toChainLabel,
            tokenIn: params.fromToken,
            tokenOut: params.toToken,
            amountIn: params.fromAmount,
            slippage: slippage / 100, // percentage → decimal (3% → 0.03)
          }),
        });

        const data = await res.json();
        console.log("[SwapContext] Quote response:", data);

        if (!res.ok || data.message) {
          const errMsg = data.message || data.error || "Failed to get quote";
          setQuoteError(errMsg);
          return null;
        }

        // Extract tool name safely (backend might return string or object)
        const toolName = typeof data.route === "string"
          ? data.route
          : (data.route?.tool || data.route?.name || "LI.FI");

        const parsedQuote: SwapQuote = {
          id: `quote-${Date.now()}`,
          fromChain: params.fromChain,
          toChain: params.toChain,
          fromToken: {
            chainId: SWAP_CHAINS[params.fromChain].id,
            address: params.fromToken,
            symbol: params.fromToken.length > 20 ? "TOKEN" : params.fromToken,
            name: "",
            decimals: 18,
          } as SwapToken,
          toToken: {
            chainId: SWAP_CHAINS[params.toChain].id,
            address: params.toToken,
            symbol: params.toToken.length > 20 ? "TOKEN" : params.toToken,
            name: "",
            decimals: 18,
          } as SwapToken,
          fromAmount: params.fromAmount,
          toAmount: data.expectedOutput || data.expectedOut || "0",
          toAmountMin: data.toAmountMin || data.expectedOutput || "0",
          estimatedDuration: 30,
          gasCosts: [],
          feeCosts: [],
          transactionRequest: data.executionData || undefined,
          toolDetails: { name: toolName, logoURI: "" },
        };

        setQuote(parsedQuote);
        return parsedQuote;
      } catch (error) {
        console.error("Failed to get quote:", error);
        setQuoteError(formatSwapError(error, "Backend"));
        return null;
      } finally {
        setQuoteLoading(false);
      }
    },
    [slippage, solAddress, evmAddress]
  );

  // ── Execute the swap via Client-Side Signing ────────────────────────────
  // We fetch a quote (which contains the raw transaction data), then
  // simulate, sign, and submit it directly from the client.
  const executeSwap = useCallback(
    async (swapQuote: SwapQuote, pin: string): Promise<string> => {
      setExecuting(true);
      setSwapStatus({ status: "PENDING" });

      try {
        // 1. Get transaction request data from the quote
        if (!swapQuote.transactionRequest) {
          throw new Error("No transaction data available from this quote. Try refreshing.");
        }

        // 2. Resolve wallet keys
        const encryptedKeys = await getEncryptedKeys(pin);
        if (!encryptedKeys) {
          throw new Error("Failed to retrieve wallet keys — check your PIN");
        }

        const isFromSolana = swapQuote.fromChain === "solana";

        if (isFromSolana) {
          // ── Solana Execution Logic ──
          if (!encryptedKeys.solana?.encryptedPrivateKey) {
            throw new Error("Solana wallet not available in this profile");
          }

          const {
            Connection,
            VersionedTransaction,
            Keypair,
            PublicKey,
            Transaction,
          } = await import("@solana/web3.js");

          const connection = new Connection(SOL_RPC, "confirmed");

          // Decrypt key
          const privateKeyBase64 = decryptWithPIN(
            encryptedKeys.solana.encryptedPrivateKey,
            pin
          );
          const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
          const keypair = Keypair.fromSecretKey(secretKey);

          // Deserialize transaction
          const txDataRaw = swapQuote.transactionRequest.data;
          let txData: Uint8Array;
          if (txDataRaw.startsWith("0x")) {
            txData = new Uint8Array(Buffer.from(txDataRaw.slice(2), "hex"));
          } else {
            txData = new Uint8Array(Buffer.from(txDataRaw, "base64"));
          }

          let transaction: any;
          try {
            transaction = VersionedTransaction.deserialize(txData);
          } catch (err) {
            console.error("[Swap] Deserialization error:", err);
            throw new Error("Failed to process transaction data from backend. The route might be stale. Try refreshing the quote.");
          }

          // ── STEP 3: SIMULATION ──
          console.log("[Swap] Simulating Solana transaction...");

          let simulation;
          try {
            simulation = await connection.simulateTransaction(transaction, {
              commitment: "confirmed",
              replaceRecentBlockhash: true, // Use a fresh blockhash for simulation
            });
          } catch (simErr) {
            console.error("[Swap] Connection-level simulation failure:", simErr);
            throw new Error(`Simulation request failed: ${simErr instanceof Error ? simErr.message : String(simErr)}`);
          }

          if (simulation.value.err) {
            console.error("[Swap] Simulation REJECTED:", {
              error: simulation.value.err,
              logs: simulation.value.logs,
            });
            const logLines = simulation.value.logs?.join("\n") || "No logs available";
            throw new Error(`On-chain simulation failed. This usually means insufficient funds or invalid input.\n\nSim Error: ${JSON.stringify(simulation.value.err)}\n\nLogs:\n${logLines.slice(0, 1000)}`);
          }
          console.log("[Swap] Simulation successful:", { unitsConsumed: simulation.value.unitsConsumed });

          // ── STEP 4: SIGNING ──
          transaction.sign([keypair]);

          // ── STEP 5: SENDING ──
          console.log("[Swap] Sending transaction to blockchain...");
          const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true, // We already simulated
            maxRetries: 5,
          });

          console.log(`[Swap] TX Sent: ${signature}`);

          // ── STEP 6: POLLING ──
          const confirmResult = await pollTransactionConfirmation(
            connection,
            signature,
            { commitment: "confirmed", timeoutMs: 90_000, intervalMs: 2000 }
          );

          if (confirmResult.confirmed && confirmResult.err) {
            throw new Error(`Transaction confirmed but failed on-chain: ${JSON.stringify(confirmResult.err)}`);
          }

          if (!confirmResult.confirmed) {
            console.warn(`[Swap] Confirmation timed out for ${signature}`);
          } else {
            console.log(`[Swap] Transaction confirmed: ${signature}`);
          }

          // Optional: Track on backend AFTER success
          fetch("/api/execute-trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: authUser?.userId || "unknown",
              txHash: signature,
              fromChain: "SOL",
              tokenIn: swapQuote.fromToken.address,
              tokenOut: swapQuote.toToken.address,
              amountIn: swapQuote.fromAmount,
              status: "COMPLETED",
            }),
          }).catch(console.warn);

          setSwapStatus({ status: "DONE", txHash: signature });
          return signature;

        } else {
          // ── EVM Execution Logic ──
          if (!encryptedKeys.ethereum?.encryptedPrivateKey) {
            throw new Error("Ethereum wallet not available");
          }

          const { ethers } = await import("ethers");
          const privateKey = decryptWithPIN(
            encryptedKeys.ethereum.encryptedPrivateKey,
            pin
          );
          const provider = new ethers.JsonRpcProvider(ETH_RPC);
          const wallet = new ethers.Wallet(privateKey, provider);

          const txRequest = {
            to: swapQuote.transactionRequest.to,
            data: swapQuote.transactionRequest.data,
            value: BigInt(swapQuote.transactionRequest.value || "0"),
            gasLimit: BigInt(swapQuote.transactionRequest.gasLimit || "500000"),
          };

          // ── STEP 3: SIMULATION (Gas Estimation) ──
          console.log("[Swap] Simulating EVM transaction (Estimate Gas)...");
          try {
            const estimatedGas = await wallet.estimateGas(txRequest);
            txRequest.gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
            console.log("[Swap] EVM simulation successful:", { estimatedGas: estimatedGas.toString() });
          } catch (err) {
            console.error("[Swap] EVM simulation failed:", err);
            throw new Error(`EVM Simulation/Estimation Failed: ${err instanceof Error ? err.message : String(err)}`);
          }

          // ── STEP 4 & 5: SENDING ──
          console.log("[Swap] Sending EVM transaction...");
          const tx = await wallet.sendTransaction(txRequest);
          console.log(`[Swap] EVM TX Sent: ${tx.hash}`);

          const receipt = await tx.wait(1);
          if (receipt && receipt.status === 0) {
            throw new Error("Transaction reverted on-chain");
          }

          // Optional: Track on backend
          fetch("/api/execute-trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: authUser?.userId || "unknown",
              txHash: tx.hash,
              fromChain: "ETH",
              tokenIn: swapQuote.fromToken.address,
              tokenOut: swapQuote.toToken.address,
              amountIn: swapQuote.fromAmount,
              status: "COMPLETED",
            }),
          }).catch(console.warn);

          setSwapStatus({ status: "DONE", txHash: tx.hash });
          return tx.hash;
        }
      } catch (err) {
        console.error("[SwapContext] Execution failed:", err);
        setSwapStatus({ status: "FAILED" });
        throw err;
      } finally {
        setExecuting(false);
      }
    },
    [getEncryptedKeys, authUser, solAddress, evmAddress]
  );

  // ── Poll swap status via Li.Fi ───────────────────────────────────────────
  const pollSwapStatus = useCallback(
    async (
      txHash: string,
      fromChain: ChainKey,
      toChain: ChainKey
    ): Promise<SwapStatus> => {
      const fromChainId = SWAP_CHAINS[fromChain].id;
      const toChainId = SWAP_CHAINS[toChain].id;

      const queryParams = new URLSearchParams({
        txHash,
        fromChain: fromChainId.toString(),
        toChain: toChainId.toString(),
      });

      const res = await fetch(`${LIFI_API}/status?${queryParams}`);
      const data = await res.json();

      const status: SwapStatus = {
        status: data.status || "NOT_FOUND",
        substatus: data.substatus,
        substatusMessage: data.substatusMessage,
        fromChain: data.sending?.chainId,
        toChain: data.receiving?.chainId,
        toAmount: data.receiving?.amount,
        txHash: data.sending?.txHash,
        receiving: data.receiving,
      };

      setSwapStatus(status);
      return status;
    },
    []
  );

  // Save swap to history (MongoDB)
  const saveSwapToHistory = useCallback(
    async (swap: {
      txHash: string;
      fromChain: ChainKey;
      toChain: ChainKey;
      fromToken: SwapToken;
      toToken: SwapToken;
      fromAmount: string;
      toAmount: string;
      status: string;
    }) => {
      try {
        await fetch("/api/swap/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(swap),
        });
      } catch (error) {
        console.error("Failed to save swap history:", error);
      }
    },
    []
  );

  // Expose autoAddSwappedToken via context
  const addSwappedToken = useCallback(
    async (toToken: SwapToken, toChain: ChainKey) => {
      await autoAddSwappedToken(toToken, toChain);
    },
    []
  );

  return (
    <SwapContext.Provider
      value={{
        tokens,
        tokensLoading,
        quote,
        quoteLoading,
        quoteError,
        executing,
        swapStatus,
        slippage,
        fetchTokens,
        getQuote,
        executeSwap,
        pollSwapStatus,
        setSlippage,
        saveSwapToHistory,
        addSwappedToken,
      }}
    >
      {children}
    </SwapContext.Provider>
  );
}

export function useSwap() {
  const context = useContext(SwapContext);
  if (context === undefined) {
    throw new Error("useSwap must be used within a SwapProvider");
  }
  return context;
}
