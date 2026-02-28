"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import TronWeb from "tronweb";
import { decryptWithPIN } from "@/lib/wallet/encryption";

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
  const [tronWeb, setTronWeb] = useState<typeof TronWeb | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  /* ----------------------------- INIT ----------------------------- */

  useEffect(() => {
    const instance = new TronWeb({
      fullHost: TRON_RPC,
    });

    setTronWeb(instance);
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
      if (!tronWeb) return;

      const target = addr || address;
      if (!target) return;

      try {
        const trxBalance = await tronWeb.trx.getBalance(target);
        setBalance(trxBalance / 1_000_000);

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
      if (!tronWeb) throw new Error("TronWeb not ready");

      setLoading(true);
      try {
        const privateKey = decryptWithPIN(encryptedKey, pin);
        const fromAddress =
          tronWeb.address.fromPrivateKey(privateKey);

        const tx = await tronWeb.trx.sendTransaction(
          recipient,
          amount * 1_000_000,
          privateKey
        );

        const txId = tx.txid;
        setLastTx(txId);

        await fetchBalance(fromAddress);
        return txId;
      } finally {
        setLoading(false);
      }
    },
    [tronWeb, fetchBalance]
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
      if (!tronWeb) throw new Error("TronWeb not ready");

      setLoading(true);
      try {
        const privateKey = decryptWithPIN(encryptedKey, pin);
        const fromAddress =
          tronWeb.address.fromPrivateKey(privateKey);

        const contract = await tronWeb.contract(
          TRC20_ABI,
          tokenAddress
        );

        const rawAmount = Math.floor(
          amount * Math.pow(10, decimals)
        );

        const txId = await contract
          .transfer(recipient, rawAmount)
          .send({
            feeLimit: 100_000_000,
            privateKey,
          });

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

/* ----------------------------- HOOK ----------------------------- */

export function useTron() {
  const ctx = useContext(TronContext);
  if (!ctx) throw new Error("useTron must be used inside TronProvider");
  return ctx;
}