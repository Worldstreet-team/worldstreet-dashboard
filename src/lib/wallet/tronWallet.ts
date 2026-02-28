/**
 * Tron Wallet Generation Utilities
 * 
 * This module provides functions to generate Tron wallets client-side.
 * Private keys are encrypted with the user's PIN before being sent to the server.
 */

import TronWeb from "tronweb";
import { encryptWithPIN } from "./encryption";

// Tron RPC URL
const TRON_RPC =
  process.env.NEXT_PUBLIC_TRON_RPC ||
  "https://api.trongrid.io";

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
    console.log('[TronWallet] Creating TronWeb instance...');
    
    // Create TronWeb instance using fullHost as per documentation
    const tronWeb = new TronWeb({
      fullHost: TRON_RPC,
    });

    console.log('[TronWallet] TronWeb instance created');

    // Generate new account
    const account = tronWeb.createAccount();
    
    console.log('[TronWallet] Account generated');
    
    // Extract private key (without 0x prefix if present)
    const privateKey = account.privateKey.startsWith("0x") 
      ? account.privateKey.slice(2) 
      : account.privateKey;
    
    // Get address
    const address = account.address.base58;

    console.log('[TronWallet] Address:', address);

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

    // Use TronWeb's built-in validation
    return TronWeb.isAddress(address);
  } catch {
    // Fallback to basic validation
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
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
    const tronWeb = new TronWeb({
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

