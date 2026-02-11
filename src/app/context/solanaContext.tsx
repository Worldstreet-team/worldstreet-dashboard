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
import { SOLANA_TOKENS, getTokenByAddress } from "@/lib/wallet/tokenLists";

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
  mint: string;
  address: string;
  amount: number;
  decimals: number;
  symbol: string;
  name?: string;
  logoURI?: string;
  isCustom?: boolean;
  customTokenId?: string;
}

interface SolanaContextType {
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
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const connection = useMemo(() => new Connection(SOL_RPC), []);

  // Fetch user's custom tokens from API
  const refreshCustomTokens = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens/custom");
      if (response.ok) {
        const data = await response.json();
        // Filter only Solana tokens
        const solTokens = (data.tokens || []).filter(
          (t: CustomToken) => t.chain === "solana"
        );
        setCustomTokens(solTokens);
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
        const pubKey = new PublicKey(targetAddr);

        // 1. Fetch SOL Balance
        const lamports = await connection.getBalance(pubKey);
        setBalance(parseFloat(convertRawToDisplay(lamports, 9)));

        // 2. Fetch SPL Token Balances
        const processedTokens: TokenBalance[] = [];
        const foundMints = new Set<string>();

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

          allAccounts.forEach((account) => {
            const parsedData = account.account.data.parsed;
            if (!parsedData || parsedData.type !== "account") return;

            const info = parsedData.info;
            const mint = info.mint;
            const uiAmount = info.tokenAmount.uiAmount || 0;
            const decimals = info.tokenAmount.decimals;

            // Look up in our known token list
            const knownToken = getTokenByAddress(mint, "solana");
            
            // Check if this is a custom token
            const customToken = customTokens.find(
              (ct) => ct.address.toLowerCase() === mint.toLowerCase()
            );

            // Get symbol and name from known list, custom token, or use defaults
            const symbol = knownToken?.symbol || customToken?.symbol || "Unknown";
            const name = knownToken?.name || customToken?.name || "Unknown Token";
            const logoURI = knownToken?.logoURI || customToken?.logoURI;

            foundMints.add(mint);

            // Only include tokens with balance > 0, OR known tokens, OR custom tokens
            if (uiAmount > 0 || knownToken || customToken) {
              processedTokens.push({
                mint,
                address: mint,
                amount: uiAmount,
                decimals,
                symbol,
                name,
                logoURI,
                isCustom: !!customToken,
                customTokenId: customToken?._id,
              });
            }
          });
        } catch (e) {
          console.error("Token Balance fetch error:", e);
        }

        // Add custom tokens that weren't found (0 balance)
        customTokens.forEach((ct) => {
          if (!foundMints.has(ct.address)) {
            processedTokens.push({
              mint: ct.address,
              address: ct.address,
              amount: 0,
              decimals: ct.decimals,
              symbol: ct.symbol,
              name: ct.name,
              logoURI: ct.logoURI,
              isCustom: true,
              customTokenId: ct._id,
            });
          }
        });

        setTokenBalances(processedTokens);
      } catch (error) {
        console.error("Solana fetchBalance error:", error);
      }
    },
    [address, connection, customTokens]
  );

  // Fetch custom tokens on mount
  useEffect(() => {
    refreshCustomTokens();
  }, [refreshCustomTokens]);

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
        // Decrypt the private key with PIN (stored as Base64)
        const privateKeyBase64 = decryptWithPIN(encryptedKey, pin);
        const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
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
        await fetchBalance(fromAddress);
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [connection, fetchBalance]
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
        // Decrypt the private key with PIN (stored as Base64)
        const privateKeyBase64 = decryptWithPIN(encryptedKey, pin);
        const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
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
        await fetchBalance(fromAddress);
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [connection, fetchBalance]
  );

  return (
    <SolanaContext.Provider
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
