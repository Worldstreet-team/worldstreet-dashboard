/**
 * Treasury Utility — Encryption, Solana/Ethereum balance, SPL/ERC-20 USDT transfers
 *
 * Requires env vars:
 *   TREASURY_ENCRYPTION_KEY — 32-byte hex string for AES-256-GCM
 *   NEXT_PUBLIC_SOL_RPC     — Solana RPC endpoint
 *   NEXT_PUBLIC_ETH_RPC     — Ethereum RPC endpoint
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
import { ethers } from "ethers";
import { connectDB } from "@/lib/mongodb";
import TreasuryWallet from "@/models/TreasuryWallet";

// ── Constants ──────────────────────────────────────────────────────────────

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com";

const ETH_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC || "https://cloudflare-eth.com";

/** Solana mainnet USDT mint */
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

/** Ethereum mainnet USDT contract */
const ETH_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ETH_USDT_DECIMALS = 6;

/** Minimal ERC-20 ABI for balanceOf + transfer */
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

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

/**
 * Generate a new Solana treasury wallet.
 * Encrypts the private key and stores it in MongoDB.
 */
export async function generateSolanaTreasuryWallet(): Promise<{ address: string; publicKey: string }> {
  await connectDB();

  // Deactivate existing SOL wallets
  await TreasuryWallet.updateMany(
    { network: "solana", isActive: true },
    { isActive: false }
  );

  const keypair = Keypair.generate();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  const encrypted = encryptPrivateKey(privateKeyBase58);

  await TreasuryWallet.create({
    address: keypair.publicKey.toBase58(),
    publicKey: keypair.publicKey.toBase58(),
    encryptedPrivateKey: encrypted.encryptedPrivateKey,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    network: "solana",
    isActive: true,
  });

  return {
    address: keypair.publicKey.toBase58(),
    publicKey: keypair.publicKey.toBase58(),
  };
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

/**
 * Send ERC-20 USDT from the Ethereum treasury wallet to a destination address.
 * @param destinationAddress - The user's Ethereum address
 * @param usdtAmount - Human-readable USDT amount (e.g. 50.25)
 */
export async function sendEthUsdtFromTreasury(
  destinationAddress: string,
  usdtAmount: number
): Promise<TransferResult> {
  try {
    const wallet = await getActiveEthTreasuryWallet();
    if (!wallet) {
      return {
        success: false,
        error: "Ethereum treasury wallet not configured or decryption failed",
      };
    }

    const contract = new ethers.Contract(ETH_USDT_CONTRACT, ERC20_ABI, wallet);

    // Convert human amount to raw (6 decimals for USDT)
    const rawAmount = ethers.parseUnits(usdtAmount.toString(), ETH_USDT_DECIMALS);

    const tx = await contract.transfer(destinationAddress, rawAmount);
    const receipt = await tx.wait();

    return { success: true, txHash: receipt.hash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ETH Treasury USDT transfer failed:", message);
    return { success: false, error: message };
  }
}

// ── Ethereum Treasury helpers ──────────────────────────────────────────────

/**
 * Load the active Ethereum treasury wallet from MongoDB.
 * Returns an ethers.Wallet instance connected to the ETH RPC, or null.
 */
export async function getActiveEthTreasuryWallet(): Promise<ethers.Wallet | null> {
  await connectDB();
  const wallet = await TreasuryWallet.findOne({
    isActive: true,
    network: "ethereum",
  }).lean();

  if (!wallet) return null;

  try {
    const privateKey = decryptPrivateKey(
      wallet.encryptedPrivateKey,
      wallet.iv,
      wallet.authTag
    );
    const provider = new ethers.JsonRpcProvider(ETH_RPC);
    return new ethers.Wallet(privateKey, provider);
  } catch (err) {
    console.error("Failed to decrypt ETH treasury key:", err);
    return null;
  }
}

/**
 * Get native ETH balance for an address.
 */
export async function getEthBalance(address: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const balance = await provider.getBalance(address);
  return parseFloat(ethers.formatEther(balance));
}

/**
 * Get ERC-20 USDT balance for an address on Ethereum.
 */
export async function getEthUsdtBalance(address: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const contract = new ethers.Contract(ETH_USDT_CONTRACT, ERC20_ABI, provider);
  const balance = await contract.balanceOf(address);
  return parseFloat(ethers.formatUnits(balance, ETH_USDT_DECIMALS));
}

/**
 * Generate a new Ethereum treasury wallet.
 * Encrypts the private key and stores it in MongoDB.
 */
export async function generateEthTreasuryWallet(
  createdBy?: string
): Promise<{ address: string; privateKey: string }> {
  await connectDB();

  // Deactivate existing ETH wallets
  await TreasuryWallet.updateMany(
    { network: "ethereum", isActive: true },
    { isActive: false }
  );

  const wallet = ethers.Wallet.createRandom();
  const privateKey = wallet.privateKey;

  const encrypted = encryptPrivateKey(privateKey);

  await TreasuryWallet.create({
    address: wallet.address,
    encryptedPrivateKey: encrypted.encryptedPrivateKey,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    network: "ethereum",
    isActive: true,
    createdBy,
  });

  return {
    address: wallet.address,
    privateKey,
  };
}

/**
 * Verify an on-chain Solana transaction by txHash.
 * Checks if the transaction is confirmed and if USDT was sent to the expected treasury.
 */
export async function verifySolanaTransaction(
  txHash: string,
  expectedTreasuryAddress: string,
  expectedAmount: number
): Promise<{ verified: boolean; error?: string }> {
  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const tx = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { verified: false, error: "Transaction not found" };
    }

    if (tx.meta?.err) {
      return { verified: false, error: "Transaction failed on-chain" };
    }

    // Check post-token balances for treasury address
    const postBalances = tx.meta?.postTokenBalances || [];
    const preBalances = tx.meta?.preTokenBalances || [];

    for (const post of postBalances) {
      if (
        post.mint === USDT_MINT &&
        post.owner === expectedTreasuryAddress
      ) {
        const pre = preBalances.find(
          (b) => b.accountIndex === post.accountIndex
        );
        const preAmount = pre?.uiTokenAmount?.uiAmount || 0;
        const postAmount = post.uiTokenAmount?.uiAmount || 0;
        const received = postAmount - preAmount;

        // Allow 0.1 USDT tolerance for rounding
        if (received >= expectedAmount - 0.1) {
          return { verified: true };
        }
      }
    }

    return { verified: false, error: "Could not verify USDT transfer to treasury" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { verified: false, error: message };
  }
}

/**
 * Verify an on-chain Ethereum ERC-20 USDT transaction by txHash.
 */
export async function verifyEthereumTransaction(
  txHash: string,
  expectedTreasuryAddress: string,
  expectedAmount: number
): Promise<{ verified: boolean; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(ETH_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { verified: false, error: "Transaction not found" };
    }

    if (receipt.status === 0) {
      return { verified: false, error: "Transaction failed on-chain" };
    }

    // Parse ERC-20 Transfer events
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== ETH_USDT_CONTRACT.toLowerCase()) continue;

      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed || parsed.name !== "Transfer") continue;

        const to = parsed.args.to.toLowerCase();
        const value = parseFloat(
          ethers.formatUnits(parsed.args.value, ETH_USDT_DECIMALS)
        );

        if (
          to === expectedTreasuryAddress.toLowerCase() &&
          value >= expectedAmount - 0.1
        ) {
          return { verified: true };
        }
      } catch {
        // Skip logs that don't match Transfer event
        continue;
      }
    }

    return { verified: false, error: "Could not verify USDT transfer to treasury" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { verified: false, error: message };
  }
}
