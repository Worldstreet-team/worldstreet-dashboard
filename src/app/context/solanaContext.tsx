"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { convertRawToDisplay, convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import bs58 from "bs58";

// Known token mints on mainnet
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface TokenBalance {
  mint: string;
  address: string;
  amount: number;
  decimals: number;
  symbol: string;
  name?: string;
  logoURI?: string;
}

interface SolanaContextType {
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
    mint: string,
    decimals: number
  ) => Promise<string>;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

const SOL_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC ||
  "https://solana-mainnet.g.alchemy.com/v2/m15B-STIDlwShr712rmVB";

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const connection = useMemo(() => new Connection(SOL_RPC), []);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      try {
        const pubKey = new PublicKey(targetAddr);

        // 1. Fetch SOL Balance
        const lamports = await connection.getBalance(pubKey);
        setBalance(parseFloat(convertRawToDisplay(lamports, 9)));

        // 2. Fetch SPL Token Balances
        let processedTokens: TokenBalance[] = [];

        try {
          const [tokenAccounts, token2022Accounts] = await Promise.all([
            connection
              .getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_PROGRAM_ID,
              })
              .catch(() => ({ value: [] })),
            connection
              .getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_2022_PROGRAM_ID,
              })
              .catch(() => ({ value: [] })),
          ]);

          const allAccounts = [
            ...tokenAccounts.value,
            ...token2022Accounts.value,
          ];

          processedTokens = allAccounts
            .map((account): TokenBalance | null => {
              const parsedData = account.account.data.parsed;
              if (!parsedData || parsedData.type !== "account") return null;

              const info = parsedData.info;
              const mint = info.mint;
              const uiAmount = info.tokenAmount.uiAmount || 0;

              let symbol = "Unknown";
              let name = "Unknown Token";
              if (mint === USDT_MINT) {
                symbol = "USDT";
                name = "Tether USD";
              } else if (mint === USDC_MINT) {
                symbol = "USDC";
                name = "USD Coin";
              }

              return {
                mint,
                address: mint,
                amount: uiAmount,
                decimals: info.tokenAmount.decimals,
                symbol,
                name,
              };
            })
            .filter(
              (t): t is TokenBalance =>
                t !== null && (t.amount > 0 || t.mint === USDT_MINT || t.mint === USDC_MINT)
            );
        } catch (e) {
          console.error("Token Balance fetch error:", e);
        }

        // Ensure USDT/USDC entries exist for UI
        [USDT_MINT, USDC_MINT].forEach((mint) => {
          if (!processedTokens.find((t) => t.mint === mint)) {
            processedTokens.push({
              mint,
              address: mint,
              amount: 0,
              symbol: mint === USDT_MINT ? "USDT" : "USDC",
              name: mint === USDT_MINT ? "Tether USD" : "USD Coin",
              decimals: 6,
            });
          }
        });

        setTokenBalances(processedTokens);
      } catch (error) {
        console.error("Solana fetchBalance error:", error);
      }
    },
    [address, connection]
  );

  useEffect(() => {
    if (address) {
      fetchBalance(address);
      const interval = setInterval(() => fetchBalance(address), 30000);
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
        const privateKeyBase58 = decryptWithPIN(encryptedKey, pin);
        const secretKey = bs58.decode(privateKeyBase58);
        const keypair = Keypair.fromSecretKey(secretKey);
        const fromAddress = keypair.publicKey.toBase58();

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: new PublicKey(recipient),
            lamports: BigInt(convertDisplayToRaw(amount, 9)),
          })
        );

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;
        transaction.sign(keypair);

        const signature = await connection.sendRawTransaction(
          transaction.serialize(),
          { maxRetries: 5, skipPreflight: false }
        );

        setLastTx(signature);
        await fetchBalance(address);
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [address, connection, fetchBalance]
  );

  const sendTokenTransaction = useCallback(
    async (
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number,
      mint: string,
      decimals: number
    ): Promise<string> => {
      setLoading(true);
      try {
        const privateKeyBase58 = decryptWithPIN(encryptedKey, pin);
        const secretKey = bs58.decode(privateKeyBase58);
        const keypair = Keypair.fromSecretKey(secretKey);
        const fromAddress = keypair.publicKey.toBase58();

        const mintPubkey = new PublicKey(mint);
        const recipientPubkey = new PublicKey(recipient);

        const fromAta = await getAssociatedTokenAddress(
          mintPubkey,
          keypair.publicKey
        );
        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey
        );

        const transaction = new Transaction();

        // Check if recipient ATA exists
        const toAtaInfo = await connection.getAccountInfo(toAta);
        if (!toAtaInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              toAta,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            fromAta,
            toAta,
            keypair.publicKey,
            BigInt(convertDisplayToRaw(amount, decimals))
          )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;
        transaction.sign(keypair);

        const signature = await connection.sendRawTransaction(
          transaction.serialize(),
          { maxRetries: 5, skipPreflight: false }
        );

        setLastTx(signature);
        await fetchBalance(address);
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [address, connection, fetchBalance]
  );

  return (
    <SolanaContext.Provider
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
    </SolanaContext.Provider>
  );
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (context === undefined) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}
