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
import { useWallet } from "./walletContext";

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
  fetchBalance: (address?: string) => Promise<void>;
  refreshCustomTokens: () => Promise<void>;
  sendTransaction: (
    recipient: string,
    amount: number
  ) => Promise<string>;
  sendTokenTransaction: (
    recipient: string,
    amount: number,
    tokenAddress: string,
    decimals: number
  ) => Promise<string>;
}

const EvmContext = createContext<EvmContextType | undefined>(undefined);

// Use Alchemy's Ethereum mainnet RPC (hardcoded)
const ETH_RPC = "https://eth-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

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
  const { addresses } = useWallet();
  const address = addresses?.ethereum || null;
  
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  console.log('[EvmContext] Address from walletContext:', address);

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
      if (!targetAddr || isFetchingRef.current) {
        console.log('[EvmContext] Skipping fetch - no address or already fetching');
        return;
      }

      console.log('[EvmContext] Fetching balance for:', targetAddr);
      isFetchingRef.current = true;
      setLoading(true);

      try {
        // 1. Fetch native ETH balance
        const balanceWei = await provider.getBalance(targetAddr);
        const balanceEth = convertRawToDisplay(balanceWei, 18);
        console.log('[EvmContext] ETH Balance:', balanceEth);
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

        let results: TokenBalance[] = [];

        if (multicallAvailable) {
          // Use Multicall3 for batched balance fetching (single RPC call)
          console.log(`[EvmContext] Fetching ${priorityTokens.length} token balances via Multicall3`);
          
          const calls = priorityTokens.map(token => ({
            tokenAddress: token.address,
            walletAddress: targetAddr,
          }));

          const balances = await batchFetchTokenBalances(provider, calls);

          // Process results
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
        
        console.log('[EvmContext] Token balances:', results.length);
      } catch (error) {
        console.error("[EvmContext] fetchBalance error:", error);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
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
    console.log('[EvmContext] Initial balance fetch');
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
      recipient: string,
      amount: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // Use Privy API to send ETH
        const response = await fetch('/api/privy/wallet/ethereum/send', {
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

        const txHash = data.transactionHash;
        setLastTx(txHash);
        
        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }
        
        return txHash;
      } catch (error) {
        console.error('Ethereum send transaction error:', error);
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
      tokenAddress: string,
      decimals: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // TODO: Implement ERC20 token transfer via Privy API
        // For now, this would need a custom endpoint that handles ERC20 tokens
        throw new Error('ERC20 token transfers via Privy not yet implemented. Use native ETH transfers for now.');
        
        // Future implementation would call something like:
        // const response = await fetch('/api/privy/wallet/ethereum/send-token', {
        //   method: 'POST',
        //   credentials: 'include',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ to: recipient, amount: amount.toString(), tokenAddress, decimals })
        // });
      } catch (error) {
        console.error('Ethereum token send error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
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
