"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { convertRawToDisplay, convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { SOLANA_TOKENS, getTokenByAddress } from "@/lib/wallet/tokenLists";
import { useWallet } from "./walletContext";

// Custom token from user's saved list
interface CustomToken {
  _id: string;
  chain: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
}

export interface TokenBalance {
  mint: string;
  address: string;
  amount: number;
  decimals: number;
  symbol: string;
  name?: string;
  logoURI?: string;
  isCustom?: boolean;
  customTokenId?: string;
  isPopular?: boolean;
}

interface SolanaContextType {
  balance: number;
  tokenBalances: TokenBalance[];
  customTokens: CustomToken[];
  loading: boolean;
  lastTx: string | null;
  fetchBalance: (address?: string) => Promise<void>;
  refreshCustomTokens: () => Promise<void>;
  getUsdtBalance: () => number;
  sendTransaction: (
    recipient: string,
    amount: number
  ) => Promise<string>;
  sendTokenTransaction: (
    recipient: string,
    amount: number,
    mint: string,
    decimals: number
  ) => Promise<string>;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

const SOL_RPC = "https://solana-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

export function SolanaProvider({ children }: { children: ReactNode}) {
  const { addresses } = useWallet();
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const connection = useMemo(() => new Connection(SOL_RPC), []);
  
  // Get address directly from wallet context
  const address = addresses?.solana || null;

  // Fetch user's custom tokens from API
  const refreshCustomTokens = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens/custom");
      if (response.ok) {
        const data = await response.json();
        // Filter only Solana tokens
        const solTokens = (data.tokens || []).filter(
          (t: CustomToken) => t.chain === "solana"
        );
        setCustomTokens(solTokens);
      }
    } catch (error) {
      console.error("Error fetching custom tokens:", error);
    }
  }, []);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) {
        console.log('[SolanaContext] No address to fetch balance for');
        return;
      }

      console.log('[SolanaContext] Fetching balance for:', targetAddr);
      setLoading(true);

      try {
        const pubKey = new PublicKey(targetAddr);

        // 1. Fetch SOL Balance
        const lamports = await connection.getBalance(pubKey);
        const solBalance = parseFloat(convertRawToDisplay(lamports, 9));
        console.log('[SolanaContext] SOL Balance:', solBalance);
        setBalance(solBalance);

        // 2. Fetch SPL Token Balances
        const processedTokens: TokenBalance[] = [];
        const foundMints = new Set<string>();

        try {
          const [tokenAccounts, token2022Accounts] = await Promise.all([
            connection
              .getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_PROGRAM_ID,
              })
              .catch(() => ({ value: [] })),
            connection
              .getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_2022_PROGRAM_ID,
              })
              .catch(() => ({ value: [] })),
          ]);

          const allAccounts = [
            ...tokenAccounts.value,
            ...token2022Accounts.value,
          ];

          allAccounts.forEach((account) => {
            const parsedData = account.account.data.parsed;
            if (!parsedData || parsedData.type !== "account") return;

            const info = parsedData.info;
            const mint = info.mint;
            const uiAmount = info.tokenAmount.uiAmount || 0;
            const decimals = info.tokenAmount.decimals;

            // Look up in our known token list
            const knownToken = getTokenByAddress(mint, "solana");
            
            // Check if this is a custom token
            const customToken = customTokens.find(
              (ct) => ct.address.toLowerCase() === mint.toLowerCase()
            );

            // Get symbol and name from known list, custom token, or use defaults
            const symbol = knownToken?.symbol || customToken?.symbol || "Unknown";
            const name = knownToken?.name || customToken?.name || "Unknown Token";
            const logoURI = knownToken?.logoURI || customToken?.logoURI;

            foundMints.add(mint);

            // Only include tokens with balance > 0, OR known tokens, OR custom tokens
            if (uiAmount > 0 || knownToken || customToken) {
              processedTokens.push({
                mint,
                address: mint,
                amount: uiAmount,
                decimals,
                symbol,
                name,
                logoURI,
                isCustom: !!customToken,
                customTokenId: customToken?._id,
                isPopular: knownToken?.isPopular,
              });
            }
          });
        } catch (e) {
          console.error("Token Balance fetch error:", e);
        }

        // Add popular tokens that weren't found (0 balance)
        SOLANA_TOKENS.filter(t => t.isPopular).forEach((token) => {
          if (!foundMints.has(token.address)) {
            processedTokens.push({
              mint: token.address,
              address: token.address,
              amount: 0,
              decimals: token.decimals,
              symbol: token.symbol,
              name: token.name,
              logoURI: token.logoURI,
              isCustom: false,
              isPopular: true,
            });
          }
        });

        // Add custom tokens that weren't found (0 balance)
        customTokens.forEach((ct) => {
          if (!foundMints.has(ct.address)) {
            processedTokens.push({
              mint: ct.address,
              address: ct.address,
              amount: 0,
              decimals: ct.decimals,
              symbol: ct.symbol,
              name: ct.name,
              logoURI: ct.logoURI,
              isCustom: true,
              customTokenId: ct._id,
            });
          }
        });

        console.log('[SolanaContext] Token balances:', processedTokens.length);
        setTokenBalances(processedTokens);
      } catch (error) {
        console.error("Solana fetchBalance error:", error);
      } finally {
        setLoading(false);
      }
    },
    [address, connection, customTokens]
  );

  // Fetch custom tokens on mount
  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

  useEffect(() => {
    if (address) {
      console.log('[SolanaContext] Address set, fetching balance:', address);
      fetchBalance(address);
      const interval = setInterval(() => fetchBalance(address), 40000);
      return () => clearInterval(interval);
    } else {
      console.log('[SolanaContext] No address set yet');
    }
  }, [address, fetchBalance]);

  const sendTransaction = useCallback(
    async (
      recipient: string,
      amount: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // Use Privy API to send SOL
        const response = await fetch('/api/privy/wallet/solana/send', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipient,
            amount: amount.toString()
          })
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error('Server error - please check your authentication');
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Transaction failed');
        }

        const signature = data.signature;
        setLastTx(signature);
        
        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }
        
        return signature;
      } catch (error) {
        console.error('Solana send transaction error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  const sendTokenTransaction = useCallback(
    async (
      recipient: string,
      amount: number,
      mint: string,
      decimals: number
    ): Promise<string> => {
      setLoading(true);
      try {
        const response = await fetch('/api/privy/wallet/solana/send-token', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipient, amount, mint, decimals }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'SPL token transfer failed');
        }

        const signature = data.signature;
        setLastTx(signature);

        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }

        return signature;
      } catch (error) {
        console.error('Solana token send error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  // Helper to get USDT balance from token balances
  const getUsdtBalance = useCallback((): number => {
    const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
    const usdtToken = tokenBalances.find(
      (token) => token.mint === USDT_MINT
    );
    return usdtToken?.amount || 0;
  }, [tokenBalances]);

  return (
    <SolanaContext.Provider
      value={{
        balance,
        tokenBalances,
        customTokens,
        loading,
        lastTx,
        fetchBalance,
        refreshCustomTokens,
        getUsdtBalance,
        sendTransaction,
        sendTokenTransaction,
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (context === undefined) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}
