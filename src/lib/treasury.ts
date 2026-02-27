/**
 * Treasury Wallet Utility
 *
 * Server-side functions for sending USDT from the platform treasury
 * wallet to user wallets on Solana.
 */

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
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import bs58 from "bs58";

// ── Constants ──────────────────────────────────────────────────────────────

const SOLANA_RPC = process.env.SOLANA_RPC || process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // Mainnet USDT
const USDT_DECIMALS = 6;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Load the treasury keypair from the TREASURY_PRIVATE_KEY env var.
 * The key should be a Base58-encoded Solana secret key.
 */
function getTreasuryKeypair(): Keypair {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TREASURY_PRIVATE_KEY environment variable is not set");
  }

  try {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch {
    throw new Error("Invalid TREASURY_PRIVATE_KEY — must be a valid Base58-encoded Solana secret key");
  }
}

/**
 * Get the treasury wallet address from env or derive from private key.
 */
export function getTreasuryAddress(): string {
  const envAddress = process.env.TREASURY_WALLET_ADDRESS;
  if (envAddress) return envAddress;

  // Derive from private key if address not explicitly set
  const keypair = getTreasuryKeypair();
  return keypair.publicKey.toBase58();
}

// ── Main Transfer Function ─────────────────────────────────────────────────

export interface TreasuryTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Send USDT from the treasury wallet to a recipient's Solana address.
 *
 * @param recipientAddress - The recipient's Solana public key (base58)
 * @param usdtAmount - Amount of USDT to send (human-readable, e.g. 100.5)
 * @returns Transaction hash on success, error message on failure
 */
export async function sendUsdtFromTreasury(
  recipientAddress: string,
  usdtAmount: number
): Promise<TreasuryTransferResult> {
  try {
    // ── Load keypair ─────────────────────────────────────────────────────
    const treasuryKeypair = getTreasuryKeypair();
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const mintPubkey = new PublicKey(USDT_MINT);
    const recipientPubkey = new PublicKey(recipientAddress);

    // ── Convert amount to raw (with decimals) ────────────────────────────
    const rawAmount = BigInt(Math.round(usdtAmount * Math.pow(10, USDT_DECIMALS)));

    if (rawAmount <= 0n) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    // ── Get or create recipient's Associated Token Account (ATA) ─────────
    // This will create the ATA if it doesn't exist (treasury pays for it)
    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,       // payer (treasury pays for ATA creation if needed)
      mintPubkey,            // USDT mint
      recipientPubkey        // recipient
    );

    // ── Get treasury's ATA ───────────────────────────────────────────────
    const treasuryAta = await getAssociatedTokenAddress(
      mintPubkey,
      treasuryKeypair.publicKey
    );

    // ── Build transfer instruction ───────────────────────────────────────
    const transferIx = createTransferInstruction(
      treasuryAta,                // source (treasury's USDT token account)
      recipientAta.address,       // destination (recipient's USDT token account)
      treasuryKeypair.publicKey,  // owner (treasury)
      rawAmount,                  // amount in raw units
      [],                         // multi-signers (none)
      TOKEN_PROGRAM_ID
    );

    // ── Send transaction ─────────────────────────────────────────────────
    const transaction = new Transaction().add(transferIx);

    const txHash = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair],
      {
        commitment: "confirmed",
        maxRetries: 3,
      }
    );

    console.log(`[Treasury] Sent ${usdtAmount} USDT to ${recipientAddress} | tx: ${txHash}`);

    return { success: true, txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during treasury transfer";
    console.error(`[Treasury] Transfer failed: ${message}`, error);
    return { success: false, error: message };
  }
}

// ── Balance Check ──────────────────────────────────────────────────────────

export interface TreasuryBalance {
  address: string;
  usdtBalance: number;
  solBalance: number;
  isLowUsdt: boolean;
  isLowSol: boolean;
}

/**
 * Fetch the treasury wallet's USDT and SOL balances.
 */
export async function getTreasuryBalance(): Promise<TreasuryBalance> {
  const address = getTreasuryAddress();
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const pubkey = new PublicKey(address);
  const mintPubkey = new PublicKey(USDT_MINT);

  // Fetch SOL balance
  const solLamports = await connection.getBalance(pubkey);
  const solBalance = solLamports / 1e9;

  // Fetch USDT balance
  let usdtBalance = 0;
  try {
    const ata = await getAssociatedTokenAddress(mintPubkey, pubkey);
    const accountInfo = await connection.getTokenAccountBalance(ata);
    usdtBalance = accountInfo.value.uiAmount ?? 0;
  } catch {
    // ATA doesn't exist — balance is 0
    usdtBalance = 0;
  }

  return {
    address,
    usdtBalance,
    solBalance,
    isLowUsdt: usdtBalance < 100,   // Warning threshold: 100 USDT
    isLowSol: solBalance < 0.05,     // Warning threshold: 0.05 SOL (~$10)
  };
}
