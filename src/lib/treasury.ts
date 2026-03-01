/**
 * Treasury Utility — Encryption, Solana balance, SPL USDT transfers
 *
 * Requires env vars:
 *   TREASURY_ENCRYPTION_KEY — 32-byte hex string for AES-256-GCM
 *   NEXT_PUBLIC_SOL_RPC     — Solana RPC endpoint
 */

import crypto from "crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { connectDB } from "@/lib/mongodb";
import TreasuryWallet from "@/models/TreasuryWallet";

// ── Constants ──────────────────────────────────────────────────────────────

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com";

/** Solana mainnet USDT mint */
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

// ── Encryption helpers ─────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.TREASURY_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TREASURY_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptPrivateKey(privateKeyBase58: string): {
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(privateKeyBase58, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return {
    encryptedPrivateKey: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptPrivateKey(
  encryptedPrivateKey: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedPrivateKey, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Treasury wallet helpers ────────────────────────────────────────────────

/**
 * Load the active treasury keypair from MongoDB.
 * Returns null if no active treasury wallet is configured.
 */
export async function getActiveTreasuryKeypair(): Promise<Keypair | null> {
  await connectDB();
  const wallet = await TreasuryWallet.findOne({
    isActive: true,
    network: "solana",
  }).lean();

  if (!wallet) return null;

  try {
    const privateKeyBase58 = decryptPrivateKey(
      wallet.encryptedPrivateKey,
      wallet.iv,
      wallet.authTag
    );
    const secretKey = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    console.error("Failed to decrypt treasury key:", err);
    return null;
  }
}

// ── Solana balance helpers ─────────────────────────────────────────────────

export async function getSolBalance(address: string): Promise<number> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);
  return lamports / 1e9; // SOL
}

export async function getUsdtBalance(address: string): Promise<number> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const owner = new PublicKey(address);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed;
    if (parsed?.info?.mint === USDT_MINT) {
      return parsed.info.tokenAmount.uiAmount ?? 0;
    }
  }

  return 0;
}

// ── USDT Transfer ──────────────────────────────────────────────────────────

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Send SPL USDT from the treasury wallet to a destination address.
 * @param destinationAddress - The user's Solana address (string)
 * @param usdtAmount - Human-readable USDT amount (e.g. 50.25)
 */
export async function sendUsdtFromTreasury(
  destinationAddress: string,
  usdtAmount: number
): Promise<TransferResult> {
  try {
    const treasuryKeypair = await getActiveTreasuryKeypair();
    if (!treasuryKeypair) {
      return {
        success: false,
        error: "Treasury wallet not configured or decryption failed",
      };
    }

    const connection = new Connection(SOLANA_RPC, "confirmed");
    const mintPubkey = new PublicKey(USDT_MINT);
    const destinationPubkey = new PublicKey(destinationAddress);

    // Convert human amount to raw (6 decimals)
    const rawAmount = BigInt(Math.round(usdtAmount * 10 ** USDT_DECIMALS));

    // Get or create the treasury's token account
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      mintPubkey,
      treasuryKeypair.publicKey
    );

    // Get or create the destination's token account (fee paid by treasury)
    const destinationATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      mintPubkey,
      destinationPubkey
    );

    // Build transfer instruction
    const transferIx = createTransferInstruction(
      treasuryATA.address,
      destinationATA.address,
      treasuryKeypair.publicKey,
      rawAmount
    );

    const tx = new Transaction().add(transferIx);

    const txHash = await sendAndConfirmTransaction(connection, tx, [
      treasuryKeypair,
    ]);

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Treasury USDT transfer failed:", message);
    return { success: false, error: message };
  }
}
