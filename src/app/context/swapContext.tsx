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

// Supported chains for swap (excluding Bitcoin - not supported by Li.Fi)
export const SWAP_CHAINS = {
  ethereum: { 
    id: 1, 
    name: "Ethereum", 
    symbol: "ETH", 
    logo: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg" 
  },
  solana: { 
    id: 1151111081099710, 
    name: "Solana", 
    symbol: "SOL", 
    logo: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg" 
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
  pollSwapStatus: (txHash: string, fromChain: ChainKey, toChain: ChainKey) => Promise<SwapStatus>;
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
        const filteredTokens = data.tokens[chainId].filter((t: SwapToken) => 
          t.priceUSD && parseFloat(t.priceUSD) > 0
        );
        
        setTokens(prev => ({
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
  const getQuote = useCallback(async (params: {
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
      setQuoteError("Failed to get quote. Please try again.");
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [slippage]);

  // Execute the swap
  const executeSwap = useCallback(async (quote: SwapQuote, pin: string): Promise<string> => {
    if (!quote.transactionRequest) {
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

      const isFromSolana = quote.fromChain === "solana";
      
      if (isFromSolana) {
        // Solana transaction
        if (!encryptedKeys.solana?.encryptedPrivateKey) {
          throw new Error("Solana wallet not available");
        }
        
        // For Solana cross-chain, we need to use versioned transactions
        // Li.Fi provides the transaction in a format we can sign
        const { Connection, VersionedTransaction, Keypair, PublicKey, TransactionMessage } = await import("@solana/web3.js");
        const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");
        
        const privateKeyBase64 = decryptWithPIN(encryptedKeys.solana.encryptedPrivateKey, pin);
        const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
        const keypair = Keypair.fromSecretKey(secretKey);
        
        // Deserialize and sign the transaction
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com"
        );
        
        // Li.Fi returns Solana transaction data in base64 format
        const txData = Buffer.from(quote.transactionRequest.data, "base64");
        let transaction = VersionedTransaction.deserialize(txData);
        
        // Native SOL address - skip ATA creation for native SOL only
        const NATIVE_SOL = "So11111111111111111111111111111111111111112";
        
        // Ensure destination token account (ATA) exists for SPL tokens
        if (quote.toToken.address !== NATIVE_SOL) {
          const mint = new PublicKey(quote.toToken.address);
          const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
          const ataInfo = await connection.getAccountInfo(ata);
          
          if (!ataInfo) {
            // ATA doesn't exist, we need to create it
            const ataIx = createAssociatedTokenAccountInstruction(
              keypair.publicKey, // payer
              ata,               // ata address
              keypair.publicKey, // owner
              mint               // mint
            );
            
            // Decompile the versioned message, prepend ATA instruction, recompile
            const addressLookupTableAccounts = await Promise.all(
              transaction.message.addressTableLookups.map(async (lookup) => {
                const accountInfo = await connection.getAccountInfo(lookup.accountKey);
                if (!accountInfo) return null;
                const { AddressLookupTableAccount } = await import("@solana/web3.js");
                return new AddressLookupTableAccount({
                  key: lookup.accountKey,
                  state: AddressLookupTableAccount.deserialize(accountInfo.data),
                });
              })
            );
            
            const validLookupTables = addressLookupTableAccounts.filter(
              (table): table is NonNullable<typeof table> => table !== null
            );
            
            const decompiledMessage = TransactionMessage.decompile(
              transaction.message,
              { addressLookupTableAccounts: validLookupTables }
            );
            
            // Prepend the ATA creation instruction
            decompiledMessage.instructions.unshift(ataIx);
            
            // Get fresh blockhash for the modified transaction
            const { blockhash } = await connection.getLatestBlockhash();
            decompiledMessage.recentBlockhash = blockhash;
            
            // Recompile to V0 message with lookup tables
            const newMessage = decompiledMessage.compileToV0Message(validLookupTables);
            transaction = new VersionedTransaction(newMessage);
          }
        }
        
        transaction.sign([keypair]);
        
        const signature = await connection.sendRawTransaction(transaction.serialize());
        return signature;
        
      } else {
        // EVM transaction
        if (!encryptedKeys.ethereum?.encryptedPrivateKey) {
          throw new Error("Ethereum wallet not available");
        }
        
        const { ethers } = await import("ethers");
        
        const privateKey = decryptWithPIN(encryptedKeys.ethereum.encryptedPrivateKey, pin);
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_ETH_RPC || "https://rpc.ankr.com/eth"
        );
        const wallet = new ethers.Wallet(privateKey, provider);
        
        // First check if we need to approve the token
        if (quote.fromToken.address !== "0x0000000000000000000000000000000000000000") {
          const ERC20_ABI = [
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
          ];
          
          const tokenContract = new ethers.Contract(
            quote.fromToken.address,
            ERC20_ABI,
            wallet
          );
          
          const allowance = await tokenContract.allowance(
            wallet.address,
            quote.transactionRequest.to
          );
          
          const fromAmountBN = BigInt(quote.fromAmount);
          
          if (allowance < fromAmountBN) {
            // Approve max amount
            const approveTx = await tokenContract.approve(
              quote.transactionRequest.to,
              ethers.MaxUint256
            );
            await approveTx.wait();
          }
        }
        
        // Execute the swap transaction
        const tx = await wallet.sendTransaction({
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: BigInt(quote.transactionRequest.value || "0"),
          gasLimit: BigInt(quote.transactionRequest.gasLimit || "500000"),
        });
        
        return tx.hash;
      }
    } finally {
      setExecuting(false);
    }
  }, [getEncryptedKeys]);

  // Poll swap status
  const pollSwapStatus = useCallback(async (
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
  }, []);

  // Save swap to history (MongoDB)
  const saveSwapToHistory = useCallback(async (swap: {
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
  }, []);

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
