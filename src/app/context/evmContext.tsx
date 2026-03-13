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
import { ETHEREUM_TOKENS, ARBITRUM_TOKENS, TokenInfo } from "@/lib/wallet/tokenLists";
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
  arbitrumBalance: number;
  arbitrumTokenBalances: TokenBalance[];
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

// RCPs from ENVs
const ETH_RPC = process.env.NEXT_PUBLIC_ETH_RPC || "https://eth-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";
const ARB_RPC = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://arb-sepolia.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

// Singleton provider instances
let ethProvider: ethers.JsonRpcProvider | null = null;
let arbProvider: ethers.JsonRpcProvider | null = null;

function getEthProvider(): ethers.JsonRpcProvider {
  if (!ethProvider) {
    ethProvider = new ethers.JsonRpcProvider(ETH_RPC);
  }
  return ethProvider;
}

function getArbProvider(): ethers.JsonRpcProvider {
  if (!arbProvider) {
    arbProvider = new ethers.JsonRpcProvider(ARB_RPC);
  }
  return arbProvider;
}

export function EvmProvider({ children }: { children: ReactNode }) {
  const { addresses } = useWallet();
  const address = addresses?.ethereum || null;
  
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [arbitrumBalance, setArbitrumBalance] = useState(0);
  const [arbitrumTokenBalances, setArbitrumTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  console.log('[EvmContext] Address from walletContext:', address);

  // Providers
  const ethProvider = useMemo(() => getEthProvider(), []);
  const arbProvider = useMemo(() => getArbProvider(), []);

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
   * Helper to fetch balances for a specific chain
   */
  const fetchChainData = async (
    targetAddr: string, 
    provider: ethers.JsonRpcProvider, 
    chainTokens: TokenInfo[],
    chainName: string
  ) => {
    // 1. Fetch native balance
    const balanceWei = await provider.getBalance(targetAddr);
    const balanceDisplay = convertRawToDisplay(balanceWei, 18);
    
    // 2. Fetch token balances
    const allTokens: TokenInfo[] = [...chainTokens];
    
    // Add custom tokens if any match this chain
    customTokens.forEach((ct) => {
      if (ct.chain === chainName && !allTokens.find((t) => t.address.toLowerCase() === ct.address.toLowerCase())) {
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

    const priorityTokens = allTokens.filter(t => t.isPopular || customTokens.some(ct => ct.address.toLowerCase() === t.address.toLowerCase()));
    if (priorityTokens.length === 0) return { native: parseFloat(balanceDisplay), tokens: [] };

    const multicallAvailable = await isMulticallAvailable(provider);
    let results: TokenBalance[] = [];

    if (multicallAvailable) {
      const calls = priorityTokens.map(token => ({
        tokenAddress: token.address,
        walletAddress: targetAddr,
      }));

      const balances = await batchFetchTokenBalances(provider, calls);

      balances.forEach((bal, index) => {
        const token = priorityTokens[index];
        if (bal !== null) {
          const amount = parseFloat(convertRawToDisplay(bal, token.decimals));
          if (amount > 0 || token.isPopular) {
            results.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              logoURI: token.logoURI,
              amount,
              isPopular: token.isPopular,
            });
          }
        }
      });
    } else {
      for (const token of priorityTokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await contract.balanceOf(targetAddr);
          const amount = parseFloat(convertRawToDisplay(bal, token.decimals));
          if (amount > 0 || token.isPopular) {
            results.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              logoURI: token.logoURI,
              amount,
            });
          }
        } catch (e) {}
      }
    }
    
    return { native: parseFloat(balanceDisplay), tokens: results };
  };

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr || isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);

      try {
        console.log('[EvmContext] Fetching multi-chain data for:', targetAddr);
        
        // Fetch Ethereum
        const ethData = await fetchChainData(targetAddr, ethProvider, ETHEREUM_TOKENS, 'ethereum');
        setBalance(ethData.native);
        setTokenBalances(ethData.tokens);

        // Fetch Arbitrum (Sepolia as testnet)
        const arbData = await fetchChainData(targetAddr, arbProvider, ARBITRUM_TOKENS, 'arbitrum');
        setArbitrumBalance(arbData.native);
        setArbitrumTokenBalances(arbData.tokens);

      } catch (error) {
        console.error("[EvmContext] fetchBalance error:", error);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [address, ethProvider, arbProvider, customTokens]
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
    ethProvider.on("block", handleNewBlock);

    // Initial fetch
    console.log('[EvmContext] Initial balance fetch');
    fetchBalance(address);

    // Cleanup
    return () => {
      console.log("[EvmContext] Removing block listener");
      ethProvider.off("block", handleNewBlock);
      blockListenerAttachedRef.current = false;
    };
  }, [address, ethProvider, fetchBalance]);

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
        arbitrumBalance,
        arbitrumTokenBalances,
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
