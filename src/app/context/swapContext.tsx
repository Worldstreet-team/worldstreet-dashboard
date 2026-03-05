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

        // Build SwapQuote from backend response
        // The backend returns: expectedOutput, priceImpact, gasEstimate, route, executionData, toAmountMin
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
          toolDetails: data.route ? { name: data.route, logoURI: "" } : undefined,
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

  // ── Execute the swap via backend API ────────────────────────────────────
  // The backend handles: LI.FI call, signing, submitting the transaction.
  // We just POST the trade params and get back a txHash.
  const executeSwap = useCallback(
    async (swapQuote: SwapQuote, pin: string): Promise<string> => {
      setExecuting(true);
      setSwapStatus({ status: "PENDING" });

      try {
        // We still need the PIN to verify user identity / unlock wallet on backend
        const chainLabel = swapQuote.fromChain === "solana" ? "SOL" : "ETH";
        const toChainLabel = swapQuote.toChain === "solana" ? "SOL" : "ETH";
        const userAddress = swapQuote.fromChain === "solana" ? solAddress : evmAddress;

        console.log("[SwapContext] Executing trade via /api/execute-trade:", {
          fromChain: chainLabel,
          tokenIn: swapQuote.fromToken.address,
          tokenOut: swapQuote.toToken.address,
          amountIn: swapQuote.fromAmount,
        });

        const res = await fetch("/api/execute-trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authUser?.userId || "unknown",
            fromChain: chainLabel,
            toChain: toChainLabel,
            tokenIn: swapQuote.fromToken.address,
            tokenOut: swapQuote.toToken.address,
            amountIn: swapQuote.fromAmount,
            slippage: slippage / 100,
          }),
        });

        const data = await res.json();
        console.log("[SwapContext] Execute-trade response:", data);

        if (!res.ok) {
          const errMsg = data.message || data.error || "Trade execution failed";
          throw new Error(errMsg);
        }

        const txHash = data.txHash || data.transactionHash || data.signature;
        if (!txHash) {
          throw new Error("No transaction hash returned from backend");
        }

        console.log(`[SwapContext] Trade submitted, txHash: ${txHash}`);

        // Poll blockchain for confirmation (Solana only — EVM backend already confirms)
        if (swapQuote.fromChain === "solana") {
          try {
            const { Connection } = await import("@solana/web3.js");
            const connection = new Connection(SOL_RPC, "confirmed");

            console.log("[SwapContext] Polling Solana blockchain for confirmation...");
            const confirmResult = await pollTransactionConfirmation(
              connection,
              txHash,
              { commitment: "confirmed", timeoutMs: 90_000, intervalMs: 2000 }
            );

            if (confirmResult.confirmed && confirmResult.err) {
              console.error("[SwapContext] TX confirmed but FAILED:", confirmResult.err);
              throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmResult.err)}`);
            }

            if (!confirmResult.confirmed) {
              console.warn(`[SwapContext] Confirmation timed out for ${txHash}, TX may still land.`);
            } else {
              console.log(`[SwapContext] Solana TX confirmed: ${txHash}`);
            }
          } catch (pollErr) {
            // Don't fail the whole swap if polling fails — the TX was already submitted
            console.warn("[SwapContext] Polling failed (TX may still succeed):", pollErr);
          }
        }

        setSwapStatus({ status: "DONE", txHash });
        return txHash;
      } catch (err) {
        console.error("[SwapContext] Execute-trade failed:", err);
        setSwapStatus({ status: "FAILED" });

        if (err instanceof Error) {
          throw err;
        } else {
          throw new Error(String(err));
        }
      } finally {
        setExecuting(false);
      }
    },
    [solAddress, evmAddress, slippage]
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
