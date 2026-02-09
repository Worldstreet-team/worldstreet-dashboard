/**
 * Multi-chain wallet generation utilities.
 * Generates wallets for Solana, Ethereum, and Bitcoin.
 * 
 * ALL GENERATION HAPPENS CLIENT-SIDE - the server never sees raw private keys.
 * 
 * ⚠️ WARNING: If the user loses their PIN, their funds are LOST FOREVER.
 * There is no recovery mechanism by design (self-custodial).
 */

import { Keypair } from "@solana/web3.js";
import { Wallet } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory, ECPairInterface } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { encryptWithPIN } from "./encryption";

// Initialize Bitcoin ECPair with secp256k1
const ECPair = ECPairFactory(ecc);

// Ensure Buffer is available in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = require("buffer").Buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedWallet {
  chain: "solana" | "ethereum" | "bitcoin";
  address: string;
  encryptedPrivateKey: string;
}

export interface AllWallets {
  solana: GeneratedWallet;
  ethereum: GeneratedWallet;
  bitcoin: GeneratedWallet;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solana Wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new Solana wallet and encrypt the private key with PIN.
 */
export function generateSolanaWallet(pin: string): GeneratedWallet {
  // Generate random keypair
  const keypair = Keypair.generate();

  // Get public address (base58)
  const address = keypair.publicKey.toBase58();

  // Convert secret key to base64 for storage
  const privateKeyBase64 = Buffer.from(keypair.secretKey).toString("base64");

  // Encrypt with user's PIN
  const encryptedPrivateKey = encryptWithPIN(privateKeyBase64, pin);

  return {
    chain: "solana",
    address,
    encryptedPrivateKey,
  };
}

/**
 * Decrypt a Solana wallet and return the Keypair.
 */
export function decryptSolanaWallet(
  encryptedPrivateKey: string,
  pin: string
): { keypair: Keypair; address: string } {
  const { decryptWithPIN } = require("./encryption");
  const decryptedBase64 = decryptWithPIN(encryptedPrivateKey, pin);
  
  const secretKey = new Uint8Array(Buffer.from(decryptedBase64, "base64"));
  const keypair = Keypair.fromSecretKey(secretKey);

  return {
    keypair,
    address: keypair.publicKey.toBase58(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ethereum Wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new Ethereum wallet and encrypt the private key with PIN.
 */
export function generateEthereumWallet(pin: string): GeneratedWallet {
  // Generate random wallet
  const wallet = Wallet.createRandom();

  // Get address and private key (hex with 0x prefix)
  const address = wallet.address;
  const privateKey = wallet.privateKey;

  // Encrypt with user's PIN
  const encryptedPrivateKey = encryptWithPIN(privateKey, pin);

  return {
    chain: "ethereum",
    address,
    encryptedPrivateKey,
  };
}

/**
 * Decrypt an Ethereum wallet and return the Wallet instance.
 */
export function decryptEthereumWallet(
  encryptedPrivateKey: string,
  pin: string
): { wallet: Wallet; address: string; privateKey: string } {
  const { decryptWithPIN } = require("./encryption");
  const privateKey = decryptWithPIN(encryptedPrivateKey, pin);

  if (!privateKey.startsWith("0x")) {
    throw new Error("Invalid Ethereum private key format");
  }

  const wallet = new Wallet(privateKey);

  return {
    wallet,
    address: wallet.address,
    privateKey,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitcoin Wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new Bitcoin wallet (SegWit) and encrypt the private key with PIN.
 * Uses mainnet by default.
 */
export function generateBitcoinWallet(
  pin: string,
  network: "mainnet" | "testnet" = "mainnet"
): GeneratedWallet {
  const btcNetwork =
    network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  // Generate random keypair
  const keyPair = ECPair.makeRandom({ network: btcNetwork });

  // Derive SegWit (p2wpkh) address
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network: btcNetwork,
  });

  if (!address) {
    throw new Error("Failed to generate Bitcoin address");
  }

  // Export private key in WIF format
  const privateKeyWIF = keyPair.toWIF();

  // Encrypt with user's PIN
  const encryptedPrivateKey = encryptWithPIN(privateKeyWIF, pin);

  return {
    chain: "bitcoin",
    address,
    encryptedPrivateKey,
  };
}

/**
 * Decrypt a Bitcoin wallet and return the ECPair.
 */
export function decryptBitcoinWallet(
  encryptedPrivateKey: string,
  pin: string,
  network: "mainnet" | "testnet" = "mainnet"
): { keyPair: ECPairInterface; address: string; privateKeyWIF: string } {
  const { decryptWithPIN } = require("./encryption");
  const privateKeyWIF = decryptWithPIN(encryptedPrivateKey, pin);

  const btcNetwork =
    network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  const keyPair = ECPair.fromWIF(privateKeyWIF, btcNetwork);

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network: btcNetwork,
  });

  if (!address) {
    throw new Error("Failed to derive Bitcoin address");
  }

  return {
    keyPair,
    address,
    privateKeyWIF,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate All Wallets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate wallets for all supported chains at once.
 * This is called when a user first sets up their wallet PIN.
 * 
 * @param pin - User's chosen PIN (4-6 digits)
 * @returns Object containing all three wallet objects
 */
export function generateAllWallets(pin: string): AllWallets {
  if (!pin || pin.length < 4) {
    throw new Error("PIN must be at least 4 characters");
  }

  return {
    solana: generateSolanaWallet(pin),
    ethereum: generateEthereumWallet(pin),
    bitcoin: generateBitcoinWallet(pin),
  };
}
