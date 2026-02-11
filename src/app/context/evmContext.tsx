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

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Common mainnet tokens
const COMMON_TOKENS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
];

export interface TokenBalance {
  address: string;
  amount: number;
  decimals: number;
  symbol: string;
  name?: string;
  logoURI?: string;
}

interface EvmContextType {
  address: string | null;
  balance: number;
  tokenBalances: TokenBalance[];
  loading: boolean;
  lastTx: string | null;
  setAddress: (address: string | null) => void;
  fetchBalance: (address?: string) => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const provider = new ethers.JsonRpcProvider(ETH_RPC);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      try {
        // 1. Native ETH Balance
        const balanceWei = await provider.getBalance(targetAddr);
        const balanceEth = convertRawToDisplay(balanceWei, 18);
        setBalance(parseFloat(balanceEth));

        // 2. Token Balances
        const results = await Promise.all(
          COMMON_TOKENS.map(async (token) => {
            try {
              const contract = new ethers.Contract(
                token.address,
                ERC20_ABI,
                provider
              );
              const bal = await contract.balanceOf(targetAddr);
              return {
                ...token,
                amount: parseFloat(convertRawToDisplay(bal, token.decimals)),
              };
            } catch (e) {
              console.error(`Error fetching ${token.symbol} balance:`, e);
              return { ...token, amount: 0 };
            }
          })
        );

        setTokenBalances(results);
      } catch (error) {
        console.error("EVM fetchBalance error:", error);
      }
    },
    [address, provider]
  );

  useEffect(() => {
    if (address) {
      fetchBalance(address);
      const interval = setInterval(() => fetchBalance(address), 15000);
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
        loading,
        lastTx,
        setAddress,
        fetchBalance,
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
