"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

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
  "https://api.shasta.trongrid.io";

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
  const [tronWeb, setTronWeb] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  /* ----------------------------- INIT ----------------------------- */

  useEffect(() => {
    // Dynamically import TronWeb only on client side
    const initTronWeb = async () => {
      try {
        const TronWeb = (await import("tronweb")).default;
        
        // Initialize TronWeb with fullHost as per documentation
        const instance = new TronWeb({
          fullHost: TRON_RPC,
        });

        console.log('[TronContext] TronWeb instance created');
        setTronWeb(instance);
      } catch (error) {
        console.error('[TronContext] Failed to initialize TronWeb:', error);
      }
    };

    initTronWeb();
  }, []);

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

        // Set TRX balance from API response
        const trxBalance = data.balance?.trx || 0;
        setBalance(trxBalance);

        // Fetch token balances using TronWeb
        if (!tronWeb) return;

        const results: TokenBalance[] = [];
        const allTokens = [...TRON_TOKENS];

        customTokens.forEach((ct) => {
          if (
            !allTokens.find(
              (t) => t.address.toLowerCase() === ct.address.toLowerCase()
            )
          ) {
            allTokens.push({ ...ct, isPopular: false });
          }
        });

        for (const token of allTokens) {
          try {
            const contract = await tronWeb.contract(
              TRC20_ABI,
              token.address
            );

            const raw = await contract.balanceOf(target).call();
            const amount =
              Number(raw.toString()) / Math.pow(10, token.decimals);

            if (amount > 0 || token.isPopular) {
              results.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                amount,
                isPopular: token.isPopular,
              });
            }
          } catch {
            continue;
          }
        }

        setTokenBalances(results);
      } catch (err) {
        console.error("Balance fetch error:", err);
      }
    },
    [tronWeb, address, customTokens]
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
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number
    ): Promise<string> => {
      setLoading(true);
      try {
        // Call backend API to sign and send transaction
        const response = await fetch("/api/tron/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin,
            recipient,
            amount,
          }),
        });

        const data = await response.json();
        console.log("Response find: ", response)
        if (!response.ok || !data.success) {
          console.log("DAta errors: ", data)
          throw new Error(data.message || "Transaction failed");
        }

        const txId = data.txHash;
        setLastTx(txId);

        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }

        return txId;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  /* ----------------------------- SEND TOKEN ----------------------------- */

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
        // Call backend API to sign and send token transaction
        const response = await fetch("/api/tron/send", {
          method: "POST",
          credentials: "include", // IMPORTANT
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin,
            recipient,
            amount,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Token transfer failed");
        }

        const txId = data.txHash;
        setLastTx(txId);

        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }

        return txId;
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
        if (!tronWeb) {
          throw new Error("TronWeb not initialized");
        }

        // Get transaction info
        const tx = await tronWeb.trx.getTransaction(txHash);
        
        if (!tx || !tx.txID) {
          return {
            success: false,
            confirmed: false,
            status: "not_found",
          };
        }

        // Get transaction info (includes confirmation status)
        const txInfo = await tronWeb.trx.getTransactionInfo(txHash);

        // Check if transaction is confirmed
        const isConfirmed = txInfo.receipt?.result === "SUCCESS";
        const blockNumber = txInfo.blockNumber || 0;

        // Get current block to calculate confirmations
        let confirmations = 0;
        if (blockNumber > 0) {
          try {
            const currentBlock = await tronWeb.trx.getCurrentBlock();
            confirmations = currentBlock.block_header.raw_data.number - blockNumber;
          } catch {
            confirmations = 0;
          }
        }

        const explorerUrl = `https://shasta.tronscan.org/#/transaction/${txHash}`;

        return {
          success: true,
          confirmed: isConfirmed,
          confirmations,
          status: isConfirmed ? "confirmed" : "pending",
          explorerUrl,
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
    [tronWeb]
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