"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { convertRawToDisplay, convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { ETHEREUM_TOKENS, TokenInfo } from "@/lib/wallet/tokenLists";

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

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

interface EvmContextType {
  address: string | null;
  balance: number;
  tokenBalances: TokenBalance[];
  customTokens: CustomToken[];
  loading: boolean;
  lastTx: string | null;
  setAddress: (address: string | null) => void;
  fetchBalance: (address?: string) => Promise<void>;
  refreshCustomTokens: () => Promise<void>;
  sendTransaction: (
    encryptedKey: string,
    pin: string,
    recipient: string,
    amount: number
  ) => Promise<string>;
  sendTokenTransaction: (
    encryptedKey: string,
    pin: string,
    recipient: string,
    amount: number,
    tokenAddress: string,
    decimals: number
  ) => Promise<string>;
}

const EvmContext = createContext<EvmContextType | undefined>(undefined);

// Use Cloudflare's free public RPC as default (no API key needed)
const ETH_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC ||
  "https://cloudflare-eth.com";

export function EvmProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const provider = new ethers.JsonRpcProvider(ETH_RPC);

  // Fetch user's custom tokens from API
  const refreshCustomTokens = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens/custom");
      if (response.ok) {
        const data = await response.json();
        // Filter only Ethereum tokens
        const ethTokens = (data.tokens || []).filter(
          (t: CustomToken) => t.chain === "ethereum"
        );
        setCustomTokens(ethTokens);
      }
    } catch (error) {
      console.error("Error fetching custom tokens:", error);
    }
  }, []);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      try {
        // 1. Native ETH Balance
        const balanceWei = await provider.getBalance(targetAddr);
        const balanceEth = convertRawToDisplay(balanceWei, 18);
        setBalance(parseFloat(balanceEth));

        // 2. Combine pre-loaded tokens with custom tokens
        const allTokens: TokenInfo[] = [...ETHEREUM_TOKENS];
        
        // Add custom tokens that aren't already in the list
        customTokens.forEach((ct) => {
          if (!allTokens.find((t) => t.address.toLowerCase() === ct.address.toLowerCase())) {
            allTokens.push({
              symbol: ct.symbol,
              name: ct.name,
              address: ct.address,
              decimals: ct.decimals,
              logoURI: ct.logoURI,
              coingeckoId: ct.coingeckoId,
            });
          }
        });

        // 3. Fetch balances - prioritize popular/custom tokens first
        const popularTokens = allTokens.filter(t => t.isPopular);
        const customTokenAddrs = customTokens.map(ct => ct.address.toLowerCase());
        const userCustomTokens = allTokens.filter(t => customTokenAddrs.includes(t.address.toLowerCase()));
        
        // Only fetch popular and custom tokens to reduce RPC calls
        const priorityTokens = [...popularTokens, ...userCustomTokens.filter(t => !t.isPopular)];
        const BATCH_SIZE = 3; // Reduced batch size for public RPC
        const results: TokenBalance[] = [];
        let rpcFailed = false;

        // Helper to fetch a batch of tokens with delay between batches
        const fetchBatch = async (batch: TokenInfo[]) => {
          return Promise.all(
            batch.map(async (token) => {
              try {
                // Normalize address to proper checksum format
                const normalizedAddress = ethers.getAddress(token.address.toLowerCase());
                const contract = new ethers.Contract(
                  normalizedAddress,
                  ERC20_ABI,
                  provider
                );
                const bal = await contract.balanceOf(targetAddr);
                const amount = parseFloat(convertRawToDisplay(bal, token.decimals));
                
                // Check if this is a custom token
                const customToken = customTokens.find(
                  (ct) => ct.address.toLowerCase() === token.address.toLowerCase()
                );

                return {
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURI: token.logoURI,
                  amount,
                  isCustom: !!customToken,
                  customTokenId: customToken?._id,
                  isPopular: token.isPopular,
                };
              } catch (e: unknown) {
                // Check if RPC is completely failing (403, network error)
                const errorMessage = e instanceof Error ? e.message : String(e);
                if (errorMessage.includes("403") || errorMessage.includes("forbidden") || errorMessage.includes("network")) {
                  rpcFailed = true;
                }
                return null;
              }
            })
          );
        };

        // Fetch priority tokens only (popular + custom) with delays between batches
        for (let i = 0; i < priorityTokens.length && !rpcFailed; i += BATCH_SIZE) {
          const batch = priorityTokens.slice(i, i + BATCH_SIZE);
          const batchResults = await fetchBatch(batch);

          // Filter out failed fetches and zero balances (except custom/popular tokens)
          batchResults.forEach((result) => {
            if (result) {
              // Always show custom tokens and popular tokens, only show others with balance
              if (result.isCustom || result.isPopular || result.amount > 0) {
                results.push(result);
              }
            }
          });

          // Add 500ms delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < priorityTokens.length && !rpcFailed) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        setTokenBalances(results);
      } catch (error) {
        console.error("EVM fetchBalance error:", error);
      }
    },
    [address, provider, customTokens]
  );

  // Fetch custom tokens on mount
  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

  useEffect(() => {
    if (address) {
      fetchBalance(address);
      // Increased polling interval to 5 minutes (300 seconds) to avoid rate limiting
      const interval = setInterval(() => fetchBalance(address), 300000);
      return () => clearInterval(interval);
    }
  }, [address, fetchBalance]);

  const sendTransaction = useCallback(
    async (
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // Decrypt the private key with PIN
        const privateKey = decryptWithPIN(encryptedKey, pin);
        const wallet = new ethers.Wallet(privateKey, provider);
        const fromAddress = wallet.address;

        const tx = await wallet.sendTransaction({
          to: recipient,
          value: ethers.parseEther(amount.toString()),
        });

        setLastTx(tx.hash);
        await tx.wait();
        await fetchBalance(fromAddress);
        return tx.hash;
      } finally {
        setLoading(false);
      }
    },
    [provider, fetchBalance]
  );

  const sendTokenTransaction = useCallback(
    async (
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number,
      tokenAddress: string,
      decimals: number
    ): Promise<string> => {
      setLoading(true);
      try {
        const privateKey = decryptWithPIN(encryptedKey, pin);
        const wallet = new ethers.Wallet(privateKey, provider);
        const fromAddress = wallet.address;

        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
        const rawAmount = BigInt(convertDisplayToRaw(amount, decimals));

        const tx = await contract.transfer(recipient, rawAmount);

        setLastTx(tx.hash);
        await tx.wait();
        await fetchBalance(fromAddress);
        return tx.hash;
      } finally {
        setLoading(false);
      }
    },
    [provider, fetchBalance]
  );

  return (
    <EvmContext.Provider
      value={{
        address,
        balance,
        tokenBalances,
        customTokens,
        loading,
        lastTx,
        setAddress,
        fetchBalance,
        refreshCustomTokens,
        sendTransaction,
        sendTokenTransaction,
      }}
    >
      {children}
    </EvmContext.Provider>
  );
}

export function useEvm() {
  const context = useContext(EvmContext);
  if (context === undefined) {
    throw new Error("useEvm must be used within an EvmProvider");
  }
  return context;
}
