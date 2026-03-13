"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useWallet } from "./walletContext";

/* ----------------------------- TYPES ----------------------------- */

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

interface TronContextType {
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
  verifyTransaction: (txHash: string) => Promise<{
    success: boolean;
    confirmed: boolean;
    confirmations?: number;
    status?: string;
    explorerUrl?: string;
  }>;
}

const TronContext = createContext<TronContextType | undefined>(undefined);

/* ----------------------------- CONFIG ----------------------------- */

const TRON_RPC =
  process.env.NEXT_PUBLIC_TRON_RPC ||
  "https://api.trongrid.io";

const TRON_TOKENS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    decimals: 6,
    isPopular: true,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
    decimals: 6,
    isPopular: true,
  },
];

const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "who", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
];

/* ----------------------------- PROVIDER ----------------------------- */

export function TronProvider({ children }: { children: ReactNode }) {
  const { addresses } = useWallet();
  const address = addresses?.tron || null;
  
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  console.log('[TronContext] Address from walletContext:', address);

  /* ----------------------------- INIT ----------------------------- */

  // No need to initialize TronWeb here - we'll use the singleton service

  /* ----------------------- FETCH CUSTOM TOKENS ----------------------- */

  const refreshCustomTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/custom");
      if (!res.ok) return;

      const data = await res.json();
      const tronOnly = (data.tokens || []).filter(
        (t: CustomToken) => t.chain === "tron"
      );

      setCustomTokens(tronOnly);
    } catch (err) {
      console.error("Custom token fetch error:", err);
    }
  }, []);

  /* ----------------------------- FETCH BALANCE ----------------------------- */

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const target = addr || address;
      if (!target) return;

      try {
        // Call local API route which proxies to external service
        const response = await fetch("/api/tron/balance");
        
        if (!response.ok) {
          console.error("Failed to fetch Tron balance:", response.statusText);
          return;
        }

        const data = await response.json();

        if (!data.success) {
          console.error("Tron balance API error:", data.message);
          return;
        }

        console.log('[TronContext] Balance data received:', data);

        // Set TRX balance from API response
        const trxBalance = data.balance?.trx || 0;
        setBalance(trxBalance);

        // Parse tokens from API response
        const apiTokens = data.balance?.tokens || [];
        console.log('[TronContext] API tokens:', apiTokens);

        const results: TokenBalance[] = [];

        // Add tokens from API response
        apiTokens.forEach((token: any) => {
          results.push({
            address: token.contractAddress,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            amount: token.balance,
            isPopular: token.symbol === 'USDT' || token.symbol === 'USDC',
          });
        });

        // Also check for custom tokens not in API response
        for (const customToken of customTokens) {
          // Skip if already in results from API
          if (results.find(r => r.address.toLowerCase() === customToken.address.toLowerCase())) {
            continue;
          }

          try {
            // TronWeb service removed - custom token balances not supported
            console.log('[TronContext] Custom token balance fetching disabled (TronWeb removed)');
            // Skip custom token for now
            continue;

            if (amount > 0) {
              results.push({
                address: customToken.address,
                symbol: customToken.symbol,
                name: customToken.name,
                decimals: customToken.decimals,
                amount,
                isCustom: true,
                customTokenId: customToken._id,
              });
            }
          } catch (err) {
            console.error(`Error fetching custom token ${customToken.symbol}:`, err);
          }
        }

        console.log('[TronContext] Final token balances:', results);
        setTokenBalances(results);
      } catch (err) {
        console.error("Balance fetch error:", err);
      }
    },
    [address, customTokens]
  );

  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

  useEffect(() => {
    if (!address) return;
    fetchBalance(address);

    const interval = setInterval(() => {
      fetchBalance(address);
    }, 60000);

    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  /* ----------------------------- SEND TRX ----------------------------- */

  const sendTransaction = useCallback(
    async (
      recipient: string,
      amount: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // Use Privy API to send TRX
        const response = await fetch('/api/privy/wallet/tron/send', {
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

        const txId = data.txid;
        setLastTx(txId);
        
        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }
        
        return txId;
      } catch (error) {
        console.error('Tron send transaction error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  /* ----------------------------- SEND TOKEN ----------------------------- */

  const sendTokenTransaction = useCallback(
    async (
      recipient: string,
      amount: number,
      tokenAddress: string,
      decimals: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // TODO: Implement TRC20 token transfer via Privy API
        // For now, this would need a custom endpoint that handles TRC20 tokens
        throw new Error('TRC20 token transfers via Privy not yet implemented. Use native TRX transfers for now.');
        
        // Future implementation would call something like:
        // const response = await fetch('/api/privy/wallet/tron/send-token', {
        //   method: 'POST',
        //   credentials: 'include',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ to: recipient, amount: amount.toString(), tokenAddress, decimals })
        // });
      } catch (error) {
        console.error('Tron token send error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  /* ----------------------------- VERIFY TRANSACTION ----------------------------- */

  const verifyTransaction = useCallback(
    async (txHash: string) => {
      try {
        // TronWeb service removed - transaction monitoring not supported
        console.log('[TronContext] Transaction monitoring disabled (TronWeb removed)');
        return {
          hash: txHash,
          status: 'unknown',
          confirmations: 0,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error("Transaction verification error:", error);
        return {
          success: false,
          confirmed: false,
          status: "error",
        };
      }
    },
    []
  );

  return (
    <TronContext.Provider
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
        verifyTransaction,
      }}
    >
      {children}
    </TronContext.Provider>
  );
}

/* ----------------------------- HOOK ----------------------------- */

export function useTron() {
  const ctx = useContext(TronContext);
  if (!ctx) throw new Error("useTron must be used inside TronProvider");
  return ctx;
}