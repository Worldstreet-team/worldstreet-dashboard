/**
 * Tron Wallet Generation Utilities
 * 
 * This module provides functions to generate Tron wallets using backend API.
 * Private keys are encrypted with the user's PIN before being sent to the server.
 */

import { encryptWithPIN } from "./encryption";

/**
 * Generate a new Tron wallet using backend API
 * 
 * @param pin - User's PIN for encrypting the private key
 * @returns Object containing address and encrypted private key
 */
export async function generateTronWallet(pin: string): Promise<{
  address: string;
  encryptedPrivateKey: string;
}> {
  try {
    console.log('[TronWallet] Calling backend API to generate Tron wallet...');
    
    // Call backend API to generate Tron wallet
    const response = await fetch('/api/wallet/generate-tron', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Wallet generation failed');
    }

    console.log('[TronWallet] Wallet generated successfully');
    console.log('[TronWallet] Address:', data.address);

    // Extract private key (without 0x prefix if present)
    const privateKey = data.privateKey.startsWith("0x") 
      ? data.privateKey.slice(2) 
      : data.privateKey;
    
    // Get address
    const address = data.address;

    // Encrypt private key with PIN
    const encryptedPrivateKey = encryptWithPIN(privateKey, pin);

    return {
      address,
      encryptedPrivateKey,
    };
  } catch (error) {
    console.error("Error generating Tron wallet:", error);
    throw new Error(`Failed to generate Tron wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Basic validation using regex
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  } catch {
    return false;
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

