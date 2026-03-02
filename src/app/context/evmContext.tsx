"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { convertRawToDisplay, convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { ETHEREUM_TOKENS, TokenInfo } from "@/lib/wallet/tokenLists";
import { batchFetchTokenBalances, isMulticallAvailable } from "@/lib/evm/multicall";

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

// Singleton provider instance - created once and reused
let providerInstance: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(ETH_RPC);
    console.log("[EvmContext] Provider instance created");
  }
  return providerInstance;
}

export function EvmProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  // Use singleton provider
  const provider = useMemo(() => getProvider(), []);

  // Refs to track state and prevent unnecessary refetches
  const isFetchingRef = useRef(false);
  const blockListenerAttachedRef = useRef(false);
  const lastFetchedBlockRef = useRef<number>(0);

  // Fetch user's custom tokens from API
  // Memoized with useCallback to maintain stable reference
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
      console.error("[EvmContext] Error fetching custom tokens:", error);
    }
  }, []);

  /**
   * Fetch balances using Multicall for efficiency
   * Stable reference via useCallback with proper dependencies
   */
  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr || isFetchingRef.current) return;

      isFetchingRef.current = true;

      try {
        // 1. Fetch native ETH balance
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

        // 3. Filter to priority tokens (popular + custom)
        const popularTokens = allTokens.filter(t => t.isPopular);
        const customTokenAddrs = customTokens.map(ct => ct.address.toLowerCase());
        const userCustomTokens = allTokens.filter(t => 
          customTokenAddrs.includes(t.address.toLowerCase()) && !t.isPopular
        );
        
        const priorityTokens = [...popularTokens, ...userCustomTokens];

        if (priorityTokens.length === 0) {
          setTokenBalances([]);
          return;
        }

        // 4. Check if Multicall3 is available
        const multicallAvailable = await isMulticallAvailable(provider);

        if (multicallAvailable) {
          // Use Multicall3 for batched balance fetching (single RPC call)
          console.log(`[EvmContext] Fetching ${priorityTokens.length} token balances via Multicall3`);
          
          const calls = priorityTokens.map(token => ({
            tokenAddress: token.address,
            walletAddress: targetAddr,
          }));

          const balances = await batchFetchTokenBalances(provider, calls);

          // Process results
          const results: TokenBalance[] = [];
          balances.forEach((balance, index) => {
            const token = priorityTokens[index];
            
            if (balance !== null) {
              const amount = parseFloat(convertRawToDisplay(balance, token.decimals));
              
              const customToken = customTokens.find(
                (ct) => ct.address.toLowerCase() === token.address.toLowerCase()
              );

              // Show custom/popular tokens always, others only with balance
              if (customToken || token.isPopular || amount > 0) {
                results.push({
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURI: token.logoURI,
                  amount,
                  isCustom: !!customToken,
                  customTokenId: customToken?._id,
                  isPopular: token.isPopular,
                });
              }
            }
          });

          setTokenBalances(results);
        } else {
          // Fallback: individual calls (less efficient but works without Multicall3)
          console.log(`[EvmContext] Multicall3 not available, using individual calls`);
          
          const results: TokenBalance[] = [];
          
          for (const token of priorityTokens) {
            try {
              const normalizedAddress = ethers.getAddress(token.address.toLowerCase());
              const contract = new ethers.Contract(
                normalizedAddress,
                ERC20_ABI,
                provider
              );
              const bal = await contract.balanceOf(targetAddr);
              const amount = parseFloat(convertRawToDisplay(bal, token.decimals));
              
              const customToken = customTokens.find(
                (ct) => ct.address.toLowerCase() === token.address.toLowerCase()
              );

              if (customToken || token.isPopular || amount > 0) {
                results.push({
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURI: token.logoURI,
                  amount,
                  isCustom: !!customToken,
                  customTokenId: customToken?._id,
                  isPopular: token.isPopular,
                });
              }
            } catch (error) {
              console.error(`[EvmContext] Failed to fetch balance for ${token.symbol}:`, error);
            }
          }

          setTokenBalances(results);
        }
      } catch (error) {
        console.error("[EvmContext] fetchBalance error:", error);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [address, provider, customTokens]
  );

  // Fetch custom tokens on mount
  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

  /**
   * Set up block listener for real-time balance updates
   * Replaces polling with event-driven updates
   */
  useEffect(() => {
    if (!address || blockListenerAttachedRef.current) return;

    console.log("[EvmContext] Attaching block listener for address:", address);
    blockListenerAttachedRef.current = true;

    const handleNewBlock = async (blockNumber: number) => {
      // Throttle: only fetch if we haven't fetched in the last 2 blocks (~24 seconds)
      if (blockNumber - lastFetchedBlockRef.current >= 2) {
        console.log(`[EvmContext] New block ${blockNumber}, refreshing balances`);
        lastFetchedBlockRef.current = blockNumber;
        await fetchBalance(address);
      }
    };

    // Attach block listener
    provider.on("block", handleNewBlock);

    // Initial fetch
    fetchBalance(address);

    // Cleanup
    return () => {
      console.log("[EvmContext] Removing block listener");
      provider.off("block", handleNewBlock);
      blockListenerAttachedRef.current = false;
    };
  }, [address, provider, fetchBalance]);

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
