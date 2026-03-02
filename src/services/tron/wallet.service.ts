/**
 * Tron Wallet Service
 * 
 * Handles wallet operations including private key decryption
 */

import { decryptWithPIN } from "@/lib/wallet/encryption";

/**
 * Decrypt private key with PIN
 * Returns decrypted key in memory only - never store it
 */
export function decryptPrivateKey(encryptedKey: string, pin: string): string {
  try {
    const decrypted = decryptWithPIN(encryptedKey, pin);
    
    // Remove 0x prefix if present
    return decrypted.startsWith("0x") ? decrypted.slice(2) : decrypted;
  } catch (error) {
    console.error("[WalletService] Decryption failed:", error);
    throw new Error("Invalid PIN or corrupted key");
  }
}

/**
 * Clear sensitive data from memory
 * This is a best-effort approach - JS doesn't guarantee memory clearing
 */
export function clearSensitiveData(data: string): void {
  // Overwrite the string in memory (best effort)
  if (data) {
    // Create a new string of zeros
    const zeros = "0".repeat(data.length);
    data = zeros;
  }
}

/**
 * Validate PIN format
 */
export function validatePIN(pin: string): { valid: boolean; error?: string } {
  if (!pin || pin.length < 4) {
    return { valid: false, error: "PIN must be at least 4 characters" };
  }

  if (pin.length > 20) {
    return { valid: false, error: "PIN is too long" };
  }

  return { valid: true };
}

/**
 * Get Tron address from private key
 */
export async function getAddressFromPrivateKey(
  tronWeb: any,
  privateKey: string
): Promise<string> {
  try {
    const cleanKey = privateKey.startsWith("0x") 
      ? privateKey.slice(2) 
      : privateKey;
    
    return tronWeb.address.fromPrivateKey(cleanKey);
  } catch (error) {
    console.error("[WalletService] Failed to derive address:", error);
    throw new Error("Invalid private key");
  }
}
