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
import { decryptWithPIN } from "@/lib/wallet/encryption";

// Li.Fi API endpoints
const LIFI_API = "https://li.quest/v1";

// Solana RPC — uses Alchemy via env, falls back to public mainnet
const SOL_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com";

// Ethereum RPC — uses Alchemy via env
const ETH_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC || "https://cloudflare-eth.com";

// Supported chains for swap (excluding Bitcoin - not supported by Li.Fi)
export const SWAP_CHAINS = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg",
  },
  solana: {
    id: 1151111081099710,
    name: "Solana",
    symbol: "SOL",
    logo: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg",
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
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  const chain = chainName || "Network";

  // --- Solana-specific errors ---
  if (
    msg.includes("TransactionExpiredTimeoutError") ||
    msg.includes("Transaction was not confirmed in")
  ) {
    return "Transaction timed out waiting for confirmation. It may still succeed — check your wallet in a few minutes.";
  }
  if (msg.includes("TransactionExpiredBlockheightExceededError") || msg.includes("block height exceeded")) {
    return "Transaction expired because the network was too busy. Please try again.";
  }
  if (msg.includes("Simulation failed") || msg.includes("SimulationFailed")) {
    return `Transaction simulation failed on ${chain}. This usually means insufficient funds or the swap route has expired. Try getting a new quote.`;
  }
  if (msg.includes("Blockhash not found") || msg.includes("blockhash")) {
    return "Transaction blockhash expired. Please try the swap again.";
  }
  if (msg.includes("Non-base58 character") || msg.includes("non-base58") || msg.includes("not base58")) {
    return "Transaction data format error. The swap route may not be compatible — try a different token pair or amount.";
  }
  if (msg.includes("could not find mint")) {
    return "Token mint account not found on Solana. The token may not exist on this network.";
  }
  if (msg.includes("insufficient lamports") || msg.includes("Attempt to debit an account")) {
    return `Insufficient SOL balance for transaction fees. You need a small amount of SOL to cover gas.`;
  }
  if (msg.includes("rent-exempt") || msg.includes("rent exempt")) {
    return "Insufficient SOL for account rent. You need at least 0.002 SOL to create token accounts.";
  }
  if (msg.includes("VersionedTransaction") || msg.includes("deserialize")) {
    return "Failed to process the swap transaction data. The route may have changed — try refreshing the quote.";
  }
  if (msg.includes("AccountNotFound") || msg.includes("Account does not exist")) {
    return "Token account not found. Ensure your wallet has been properly initialized.";
  }

  // --- EVM-specific errors ---
  if (msg.includes("insufficient funds") || msg.includes("INSUFFICIENT_FUNDS")) {
    return `Insufficient ${chain} balance. Make sure you have enough ETH for gas fees.`;
  }
  if (msg.includes("nonce") || msg.includes("NONCE_EXPIRED")) {
    return "Transaction nonce conflict. Please wait a moment and try again.";
  }
  if (msg.includes("replacement fee too low") || msg.includes("REPLACEMENT_UNDERPRICED")) {
    return "A pending transaction is blocking this one. Wait for it to confirm or increase gas.";
  }
  if (msg.includes("execution reverted") || msg.includes("CALL_EXCEPTION")) {
    return "Swap transaction reverted on-chain. The route may have expired — try a new quote.";
  }

  // --- General errors ---
  if (msg.includes("Could not find token")) {
    return "Li.Fi could not locate the token on the destination chain. Try a different token or route.";
  }
  if (msg.includes("rejected") || msg.includes("cancelled") || msg.includes("denied")) {
    return "Transaction was rejected.";
  }
  if (msg.includes("network") || msg.includes("NETWORK_ERROR") || msg.includes("fetch")) {
    return "Network connection error. Please check your internet and try again.";
  }
  if (msg.includes("slippage") || msg.includes("price") || msg.includes("SLIPPAGE")) {
    return "Swap failed due to high price slippage. Try increasing your slippage tolerance in settings.";
  }
  if (msg.includes("No transaction data")) {
    return "The quote didn't include transaction data. This route may not be available — try a different pair.";
  }
  if (msg.includes("wallet keys") || msg.includes("wallet not available")) {
    return "Wallet not available. Please ensure your wallet is set up and try again.";
  }
  if (msg.includes("Incorrect PIN") || msg.includes("Failed to retrieve")) {
    return "Failed to unlock wallet. Check your PIN and try again.";
  }
  if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
    return "Request timed out. The network might be congested — please try again.";
  }

  // Fallback
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
  const { address: solAddress } = useSolana();
  const { address: evmAddress } = useEvm();

  const [tokens, setTokens] = useState<Record<ChainKey, SwapToken[]>>({
    ethereum: [],
    solana: [],
  });
  const [tokensLoading, setTokensLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [swapStatus, setSwapStatus] = useState<SwapStatus | null>(null);
  const [slippage, setSlippage] = useState(0.5); // 0.5% default

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

  // Get swap quote
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
        const fromChainId = SWAP_CHAINS[params.fromChain].id;
        const toChainId = SWAP_CHAINS[params.toChain].id;

        const queryParams = new URLSearchParams({
          fromChain: fromChainId.toString(),
          toChain: toChainId.toString(),
          fromToken: params.fromToken,
          toToken: params.toToken,
          fromAmount: params.fromAmount,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          slippage: (slippage / 100).toString(),
          integrator: "worldstreet",
        });

        const res = await fetch(`${LIFI_API}/quote?${queryParams}`);
        const data = await res.json();

        if (data.message) {
          setQuoteError(data.message);
          return null;
        }

        const parsedQuote: SwapQuote = {
          id: data.id || `${Date.now()}`,
          fromChain: params.fromChain,
          toChain: params.toChain,
          fromToken: data.action?.fromToken || data.estimate?.fromToken,
          toToken: data.action?.toToken || data.estimate?.toToken,
          fromAmount: data.action?.fromAmount || params.fromAmount,
          toAmount: data.estimate?.toAmount || "0",
          toAmountMin: data.estimate?.toAmountMin || "0",
          estimatedDuration: data.estimate?.executionDuration || 0,
          gasCosts: data.estimate?.gasCosts || [],
          feeCosts: data.estimate?.feeCosts || [],
          transactionRequest: data.transactionRequest,
          toolDetails: data.toolDetails,
        };

        setQuote(parsedQuote);
        return parsedQuote;
      } catch (error) {
        console.error("Failed to get quote:", error);
        setQuoteError(formatSwapError(error, "Li.Fi"));
        return null;
      } finally {
        setQuoteLoading(false);
      }
    },
    [slippage]
  );

  // ── Execute the swap ─────────────────────────────────────────────────────
  const executeSwap = useCallback(
    async (swapQuote: SwapQuote, pin: string): Promise<string> => {
      if (!swapQuote.transactionRequest) {
        throw new Error("No transaction data available");
      }

      setExecuting(true);
      setSwapStatus({ status: "PENDING" });

      try {
        // First, get the encrypted keys using the PIN
        const encryptedKeys = await getEncryptedKeys(pin);
        if (!encryptedKeys) {
          throw new Error("Failed to retrieve wallet keys");
        }

        const isFromSolana = swapQuote.fromChain === "solana";

        if (isFromSolana) {
          // ── Solana transaction path ────────────────────────────────────
          if (!encryptedKeys.solana?.encryptedPrivateKey) {
            throw new Error("Solana wallet not available");
          }

          const {
            Connection,
            VersionedTransaction,
            Keypair,
            PublicKey,
            Transaction,
          } = await import("@solana/web3.js");
          const {
            getAssociatedTokenAddress,
            createAssociatedTokenAccountInstruction,
          } = await import("@solana/spl-token");

          const privateKeyBase64 = decryptWithPIN(
            encryptedKeys.solana.encryptedPrivateKey,
            pin
          );
          const secretKey = new Uint8Array(
            Buffer.from(privateKeyBase64, "base64")
          );
          const keypair = Keypair.fromSecretKey(secretKey);

          const connection = new Connection(SOL_RPC, "confirmed");

          // Native SOL address — skip ATA creation for native SOL only
          const NATIVE_SOL = "So11111111111111111111111111111111111111112";

          // Create destination ATA if the to-chain is also Solana and the token isn't native SOL.
          // For cross-chain swaps (SOL → ETH), the destination is on EVM so no ATA needed.
          if (
            swapQuote.toChain === "solana" &&
            swapQuote.toToken.address !== NATIVE_SOL
          ) {
            const mint = new PublicKey(swapQuote.toToken.address);
            const ata = await getAssociatedTokenAddress(
              mint,
              keypair.publicKey
            );
            const ataInfo = await connection.getAccountInfo(ata);

            if (!ataInfo) {
              console.log(
                `[Swap] Creating ATA for ${swapQuote.toToken.symbol}...`
              );
              const ataIx = createAssociatedTokenAccountInstruction(
                keypair.publicKey, // payer
                ata, // ata address
                keypair.publicKey, // owner
                mint // mint
              );

              const createAtaTx = new Transaction().add(ataIx);
              const { blockhash, lastValidBlockHeight } =
                await connection.getLatestBlockhash("confirmed");
              createAtaTx.recentBlockhash = blockhash;
              createAtaTx.feePayer = keypair.publicKey;
              createAtaTx.sign(keypair);

              const ataSignature = await connection.sendRawTransaction(
                createAtaTx.serialize(),
                {
                  skipPreflight: false,
                  preflightCommitment: "confirmed",
                }
              );

              // Wait for ATA creation to confirm with blockhash strategy
              await connection.confirmTransaction(
                {
                  signature: ataSignature,
                  blockhash,
                  lastValidBlockHeight,
                },
                "confirmed"
              );
              console.log(`[Swap] ATA created: ${ataSignature}`);
            }
          }

          // Detect transaction data format:
          // Li.Fi returns base64 for Solana transactions, but cross-chain routes
          // might vary. We detect by checking if data starts with "0x" (hex/EVM format).
          const txDataRaw = swapQuote.transactionRequest.data;
          let txData: Uint8Array;

          if (txDataRaw.startsWith("0x")) {
            // Hex-encoded data — convert from hex
            txData = new Uint8Array(
              Buffer.from(txDataRaw.slice(2), "hex")
            );
          } else {
            // Base64-encoded (standard Li.Fi Solana format)
            txData = new Uint8Array(Buffer.from(txDataRaw, "base64"));
          }

          let transaction: InstanceType<typeof VersionedTransaction>;
          try {
            transaction = VersionedTransaction.deserialize(txData);
          } catch (deserializeErr) {
            console.error(
              "[Swap] Failed to deserialize Solana transaction:",
              deserializeErr
            );
            throw new Error(
              "Failed to process swap transaction. The route may have changed — try refreshing the quote."
            );
          }

          transaction.sign([keypair]);

          // Get a fresh blockhash for confirmation tracking
          const { blockhash: sendBlockhash, lastValidBlockHeight: sendBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

          // Send the transaction
          const signature = await connection.sendTransaction(transaction, {
            maxRetries: 5,
            preflightCommitment: "confirmed",
          });

          console.log(`[Swap] Solana TX sent: ${signature}`);

          // Wait for on-chain confirmation (with timeout fallback)
          // This ensures the token balance actually reflects before we report success.
          try {
            const confirmResult = await connection.confirmTransaction(
              {
                signature,
                blockhash: sendBlockhash,
                lastValidBlockHeight: sendBlockHeight,
              },
              "confirmed"
            );

            if (confirmResult.value.err) {
              console.error(
                "[Swap] Transaction confirmed but failed on-chain:",
                confirmResult.value.err
              );
              throw new Error(
                `Transaction confirmed but failed on-chain: ${JSON.stringify(confirmResult.value.err)}`
              );
            }

            console.log(`[Swap] Solana TX confirmed: ${signature}`);
          } catch (confirmErr: unknown) {
            // If confirmation times out, the TX may still succeed.
            // We return the signature and let Li.Fi polling track it.
            const errMsg =
              confirmErr instanceof Error ? confirmErr.message : String(confirmErr);
            if (
              errMsg.includes("TransactionExpiredTimeoutError") ||
              errMsg.includes("TransactionExpiredBlockheightExceededError") ||
              errMsg.includes("block height exceeded") ||
              errMsg.includes("was not confirmed")
            ) {
              console.warn(
                `[Swap] Confirmation timed out for ${signature}, but TX was broadcast. Li.Fi will track it.`
              );
            } else {
              // Re-throw non-timeout errors
              throw confirmErr;
            }
          }

          return signature;
        } else {
          // ── EVM transaction path ──────────────────────────────────────
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

          // Check if we need to approve the token (skip for native ETH)
          if (
            swapQuote.fromToken.address !==
            "0x0000000000000000000000000000000000000000"
          ) {
            const ERC20_ABI = [
              "function allowance(address owner, address spender) view returns (uint256)",
              "function approve(address spender, uint256 amount) returns (bool)",
            ];

            const tokenContract = new ethers.Contract(
              swapQuote.fromToken.address,
              ERC20_ABI,
              wallet
            );

            const allowance = await tokenContract.allowance(
              wallet.address,
              swapQuote.transactionRequest.to
            );

            const fromAmountBN = BigInt(swapQuote.fromAmount);

            if (allowance < fromAmountBN) {
              console.log("[Swap] Approving ERC20 token spend...");
              const approveTx = await tokenContract.approve(
                swapQuote.transactionRequest.to,
                ethers.MaxUint256
              );
              await approveTx.wait();
              console.log("[Swap] ERC20 approval confirmed");
            }
          }

          // Execute the swap transaction
          const tx = await wallet.sendTransaction({
            to: swapQuote.transactionRequest.to,
            data: swapQuote.transactionRequest.data,
            value: BigInt(swapQuote.transactionRequest.value || "0"),
            gasLimit: BigInt(
              swapQuote.transactionRequest.gasLimit || "500000"
            ),
          });

          console.log(`[Swap] EVM TX sent: ${tx.hash}`);

          // Wait for 1 confirmation
          const receipt = await tx.wait(1);
          if (receipt && receipt.status === 0) {
            throw new Error("Transaction reverted on-chain");
          }
          console.log(`[Swap] EVM TX confirmed: ${tx.hash}`);

          return tx.hash;
        }
      } catch (err) {
        // Re-throw with formatted message
        throw new Error(
          formatSwapError(
            err,
            swapQuote.fromChain === "solana" ? "Solana" : "Ethereum"
          )
        );
      } finally {
        setExecuting(false);
      }
    },
    [getEncryptedKeys]
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
