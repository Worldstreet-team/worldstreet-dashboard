/**
 * Wallet utilities for WorldStreet Dashboard
 * 
 * Self-custodial multi-chain wallet system supporting:
 * - Solana (SOL + SPL tokens)
 * - Ethereum (ETH + ERC-20 tokens)
 * - Bitcoin (BTC via SegWit)
 * 
 * ⚠️ CRITICAL WARNING ⚠️
 * This is a SELF-CUSTODIAL wallet system.
 * Private keys are encrypted with the user's PIN and stored on our servers.
 * The server NEVER has access to raw private keys.
 * 
 * IF THE USER LOSES THEIR PIN, THEIR FUNDS ARE LOST FOREVER.
 * There is NO recovery mechanism by design.
 */

// Encryption utilities
export { 
  encryptWithPIN, 
  decryptWithPIN, 
  hashPIN, 
  verifyPIN 
} from "./encryption";

// Wallet generation
export {
  generateSolanaWallet,
  generateEthereumWallet,
  generateBitcoinWallet,
  generateAllWallets,
  decryptSolanaWallet,
  decryptEthereumWallet,
  decryptBitcoinWallet,
} from "./generate";

// Types
export type { 
  EncryptedPayload 
} from "./encryption";

export type { 
  GeneratedWallet, 
  AllWallets 
} from "./generate";
