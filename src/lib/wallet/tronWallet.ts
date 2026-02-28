/**
 * Tron Wallet Generation Utilities
 * 
 * This module provides functions to generate Tron wallets client-side.
 * Private keys are encrypted with the user's PIN before being sent to the server.
 */

import { encryptWithPIN } from "./encryption";

// Tron RPC URL
const TRON_RPC =
  process.env.NEXT_PUBLIC_TRON_RPC ||
  "https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT";

// TronWeb types
interface TronWeb {
  createAccount: () => { privateKey: string; publicKey: string; address: { base58: string } };
  address: {
    fromPrivateKey: (privateKey: string) => string;
  };
}

/**
 * Wait for TronWeb to be available
 */
async function waitForTronWeb(maxAttempts = 20): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof window !== "undefined" && (window as any).TronWeb) {
      return (window as any).TronWeb;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("TronWeb library not loaded. Please refresh the page.");
}

/**
 * Generate a new Tron wallet
 * 
 * @param pin - User's PIN for encrypting the private key
 * @returns Object containing address and encrypted private key
 */
export async function generateTronWallet(pin: string): Promise<{
  address: string;
  encryptedPrivateKey: string;
}> {
  try {
    // Wait for TronWeb to be available
    const TronWebConstructor = await waitForTronWeb();
    
    // Create TronWeb instance
    const tronWeb: TronWeb = new TronWebConstructor({
      fullHost: TRON_RPC,
    });

    // Generate new account
    const account = tronWeb.createAccount();
    
    // Extract private key (without 0x prefix if present)
    const privateKey = account.privateKey.startsWith("0x") 
      ? account.privateKey.slice(2) 
      : account.privateKey;
    
    // Get address
    const address = account.address.base58;

    // Encrypt private key with PIN
    const encryptedPrivateKey = encryptWithPIN(privateKey, pin);

    return {
      address,
      encryptedPrivateKey,
    };
  } catch (error) {
    console.error("Error generating Tron wallet:", error);
    throw new Error("Failed to generate Tron wallet");
  }
}

/**
 * Validate a Tron address
 * 
 * @param address - Tron address to validate
 * @returns true if valid, false otherwise
 */
export function isValidTronAddress(address: string): boolean {
  try {
    // Tron addresses start with 'T' and are 34 characters long
    if (!address || typeof address !== "string") {
      return false;
    }
    
    if (!address.startsWith("T") || address.length !== 34) {
      return false;
    }

    // Check if TronWeb is available for validation
    if (typeof window !== "undefined" && (window as any).TronWeb) {
      const TronWebConstructor = (window as any).TronWeb;
      return TronWebConstructor.isAddress(address);
    }

    // Basic validation if TronWeb not available
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * Get Tron address from private key
 * 
 * @param privateKey - Private key (hex string)
 * @returns Tron address
 */
export async function getTronAddressFromPrivateKey(privateKey: string): Promise<string> {
  try {
    // Wait for TronWeb to be available
    const TronWebConstructor = await waitForTronWeb();
    
    const tronWeb: TronWeb = new TronWebConstructor({
      fullHost: TRON_RPC,
    });

    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith("0x") 
      ? privateKey.slice(2) 
      : privateKey;

    return tronWeb.address.fromPrivateKey(cleanPrivateKey);
  } catch (error) {
    console.error("Error getting Tron address from private key:", error);
    throw error;
  }
}

/**
 * Convert TRX to Sun (smallest unit)
 * 1 TRX = 1,000,000 Sun
 * 
 * @param trx - Amount in TRX
 * @returns Amount in Sun
 */
export function trxToSun(trx: number): number {
  return Math.floor(trx * 1_000_000);
}

/**
 * Convert Sun to TRX
 * 1 TRX = 1,000,000 Sun
 * 
 * @param sun - Amount in Sun
 * @returns Amount in TRX
 */
export function sunToTrx(sun: number): number {
  return sun / 1_000_000;
}

