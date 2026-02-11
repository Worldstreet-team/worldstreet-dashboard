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

const ETH_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC ||
  "https://rpc.ankr.com/eth/e72e410e0fe837717c677b70b6a22bf76d0d5d4b782af06949a39583c3c9a0b2";

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

        // 3. Fetch balances in batches to avoid rate limiting
        const BATCH_SIZE = 10;
        const results: TokenBalance[] = [];

        for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
          const batch = allTokens.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (token) => {
              try {
                const contract = new ethers.Contract(
                  token.address,
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
              } catch (e) {
                // Only log errors for tokens we expect to exist
                if (i < 10) {
                  console.error(`Error fetching ${token.symbol} balance:`, e);
                }
                return null;
              }
            })
          );

          // Filter out failed fetches and zero balances (except custom/popular tokens)
          batchResults.forEach((result) => {
            if (result) {
              // Always show custom tokens and popular tokens, only show others with balance
              if (result.isCustom || result.isPopular || result.amount > 0) {
                results.push(result);
              }
            }
          });
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
      const interval = setInterval(() => fetchBalance(address), 30000); // Increased to 30s
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
