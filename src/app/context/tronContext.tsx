"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { decryptWithPIN } from "@/lib/wallet/encryption";

// TronWeb types (minimal)
interface TronWeb {
  address: {
    fromPrivateKey: (privateKey: string) => string;
  };
  trx: {
    getBalance: (address: string) => Promise<number>;
    sendTransaction: (to: string, amount: number, options?: any) => Promise<any>;
  };
  transactionBuilder: {
    triggerSmartContract: (
      contractAddress: string,
      functionSelector: string,
      options: any,
      parameters: any[],
      issuerAddress: string
    ) => Promise<any>;
  };
  contract: (abi: any[], address: string) => any;
}

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

interface TronContextType {
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

const TronContext = createContext<TronContextType | undefined>(undefined);

// Tron RPC URL
const TRON_RPC =
  process.env.NEXT_PUBLIC_TRON_RPC ||
  "https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT";

// TRC20 USDT contract address on Tron mainnet
const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// Popular TRC20 tokens
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

// Minimal ERC20 ABI for TRC20 tokens
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

export function TronProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [tronWeb, setTronWeb] = useState<TronWeb | null>(null);

  // Initialize TronWeb
  useEffect(() => {
    const initTronWeb = async () => {
      try {
        // Wait for TronWeb to be available (max 5 seconds)
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkTronWeb = async (): Promise<any> => {
          while (attempts < maxAttempts) {
            if (typeof window !== "undefined") {
              const win = window as any;
              
              // Check different possible locations for TronWeb
              if (win.TronWeb) {
                // If TronWeb is a constructor function
                if (typeof win.TronWeb === 'function') {
                  return win.TronWeb;
                }
                // If TronWeb is an object with a default export
                if (win.TronWeb.default && typeof win.TronWeb.default === 'function') {
                  return win.TronWeb.default;
                }
                // If TronWeb is already an instance, return its constructor
                if (win.TronWeb.constructor) {
                  return win.TronWeb.constructor;
                }
              }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          throw new Error("TronWeb not loaded");
        };

        const TronWebConstructor = await checkTronWeb();
        console.log('[TronContext] TronWeb loaded, type:', typeof TronWebConstructor);
        
        const instance = new TronWebConstructor({
          fullHost: TRON_RPC,
        });
        
        console.log('[TronContext] TronWeb instance created');
        setTronWeb(instance);
      } catch (error) {
        console.error("Error initializing TronWeb:", error);
      }
    };

    initTronWeb();
  }, []);

  // Fetch user's custom tokens from API
  const refreshCustomTokens = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens/custom");
      if (response.ok) {
        const data = await response.json();
        // Filter only Tron tokens
        const tronTokens = (data.tokens || []).filter(
          (t: CustomToken) => t.chain === "tron"
        );
        setCustomTokens(tronTokens);
      }
    } catch (error) {
      console.error("Error fetching custom tokens:", error);
    }
  }, []);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr || !tronWeb) return;

      try {
        // 1. Native TRX Balance
        const trxBalance = await tronWeb.trx.getBalance(targetAddr);
        // TRX has 6 decimals (sun)
        setBalance(trxBalance / 1_000_000);

        // 2. Fetch TRC20 Token Balances
        const results: TokenBalance[] = [];

        // Combine popular tokens with custom tokens
        const allTokens = [...TRON_TOKENS];
        customTokens.forEach((ct) => {
          if (!allTokens.find((t) => t.address.toLowerCase() === ct.address.toLowerCase())) {
            allTokens.push({
              symbol: ct.symbol,
              name: ct.name,
              address: ct.address,
              decimals: ct.decimals,
              isPopular: false,
            });
          }
        });

        // Fetch balances for each token
        for (const token of allTokens) {
          try {
            const contract = await tronWeb.contract(TRC20_ABI, token.address);
            const balanceResult = await contract.balanceOf(targetAddr).call();
            const rawBalance = balanceResult.toString();
            const amount = parseFloat(rawBalance) / Math.pow(10, token.decimals);

            const customToken = customTokens.find(
              (ct) => ct.address.toLowerCase() === token.address.toLowerCase()
            );

            // Show tokens with balance > 0, or popular/custom tokens
            if (amount > 0 || token.isPopular || customToken) {
              results.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                amount,
                isCustom: !!customToken,
                customTokenId: customToken?._id,
                isPopular: token.isPopular,
              });
            }
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            // Add with 0 balance if it's a popular or custom token
            if (token.isPopular || customTokens.find(ct => ct.address === token.address)) {
              results.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                amount: 0,
                isCustom: !!customTokens.find(ct => ct.address === token.address),
                isPopular: token.isPopular,
              });
            }
          }
        }

        setTokenBalances(results);
      } catch (error) {
        console.error("Tron fetchBalance error:", error);
      }
    },
    [address, tronWeb, customTokens]
  );

  // Fetch custom tokens on mount
  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

  useEffect(() => {
    if (address && tronWeb) {
      fetchBalance(address);
      const interval = setInterval(() => fetchBalance(address), 60000); // Every 60 seconds
      return () => clearInterval(interval);
    }
  }, [address, tronWeb, fetchBalance]);

  const sendTransaction = useCallback(
    async (
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number
    ): Promise<string> => {
      if (!tronWeb) {
        throw new Error("TronWeb not initialized");
      }

      setLoading(true);
      try {
        // Decrypt the private key with PIN
        const privateKey = decryptWithPIN(encryptedKey, pin);
        
        // Get address from private key
        const fromAddress = tronWeb.address.fromPrivateKey(privateKey);

        // Convert TRX to sun (1 TRX = 1,000,000 sun)
        const amountInSun = amount * 1_000_000;

        // Send transaction
        const transaction = await tronWeb.trx.sendTransaction(
          recipient,
          amountInSun,
          { privateKey }
        );

        const txId = transaction.txid || transaction.transaction?.txID;
        setLastTx(txId);
        await fetchBalance(fromAddress);
        return txId;
      } finally {
        setLoading(false);
      }
    },
    [tronWeb, fetchBalance]
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
      if (!tronWeb) {
        throw new Error("TronWeb not initialized");
      }

      setLoading(true);
      try {
        // Decrypt the private key with PIN
        const privateKey = decryptWithPIN(encryptedKey, pin);
        
        // Get address from private key
        const fromAddress = tronWeb.address.fromPrivateKey(privateKey);

        // Get contract instance
        const contract = await tronWeb.contract(TRC20_ABI, tokenAddress);

        // Convert amount to smallest unit
        const rawAmount = Math.floor(amount * Math.pow(10, decimals));

        // Send token transfer
        const transaction = await contract.transfer(recipient, rawAmount).send({
          feeLimit: 100_000_000, // 100 TRX fee limit
          callValue: 0,
          shouldPollResponse: true,
          privateKey,
        });

        const txId = transaction;
        setLastTx(txId);
        await fetchBalance(fromAddress);
        return txId;
      } finally {
        setLoading(false);
      }
    },
    [tronWeb, fetchBalance]
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
        setAddress,
        fetchBalance,
        refreshCustomTokens,
        sendTransaction,
        sendTokenTransaction,
      }}
    >
      {children}
    </TronContext.Provider>
  );
}

export function useTron() {
  const context = useContext(TronContext);
  if (context === undefined) {
    throw new Error("useTron must be used within a TronProvider");
  }
  return context;
}
