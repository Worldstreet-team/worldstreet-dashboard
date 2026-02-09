/**
 * PIN-based encryption utilities for wallet private keys.
 * Uses AES-256-CBC with PBKDF2 key derivation.
 * 
 * IMPORTANT: This runs CLIENT-SIDE only. The server never sees raw private keys.
 * 
 * ⚠️ WARNING: If the user loses their PIN, their funds are LOST FOREVER.
 * There is no recovery mechanism by design (self-custodial).
 */

import CryptoJS from "crypto-js";

// Master key adds a second layer of encryption (defense in depth)
// Even if an attacker gets the encrypted blob, they need both PIN and this key
const MASTER_KEY = process.env.NEXT_PUBLIC_WALLET_MASTER_KEY || "worldstreet-wallet-v1";

/**
 * Derive a 256-bit key from password using PBKDF2
 */
function deriveKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  });
}

export interface EncryptedPayload {
  data: string;
  salt1: string;
  salt2: string;
  iv1: string;
  iv2: string;
}

/**
 * Encrypt a string with double-layer AES-256-CBC encryption.
 * Layer 1: User's PIN
 * Layer 2: Master key
 * 
 * @param plaintext - The string to encrypt (e.g., private key)
 * @param pin - User's 4-6 digit PIN
 * @returns JSON string containing encrypted data and salts
 */
export function encryptWithPIN(plaintext: string, pin: string): string {
  if (!pin || pin.length < 4) {
    throw new Error("PIN must be at least 4 characters");
  }

  // Generate random salts and IVs (16 bytes each)
  const salt1 = CryptoJS.lib.WordArray.random(16);
  const salt2 = CryptoJS.lib.WordArray.random(16);
  const iv1 = CryptoJS.lib.WordArray.random(16);
  const iv2 = CryptoJS.lib.WordArray.random(16);

  // Derive keys from PIN and master key
  const key1 = deriveKey(pin, salt1);
  const key2 = deriveKey(MASTER_KEY, salt2);

  // First encryption layer (with user's PIN)
  const firstCipher = CryptoJS.AES.encrypt(plaintext, key1, {
    iv: iv1,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  // Second encryption layer (with master key)
  const secondCipher = CryptoJS.AES.encrypt(firstCipher, key2, {
    iv: iv2,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  const payload: EncryptedPayload = {
    data: secondCipher,
    salt1: salt1.toString(),
    salt2: salt2.toString(),
    iv1: iv1.toString(),
    iv2: iv2.toString(),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt a string that was encrypted with encryptWithPIN.
 * 
 * @param encryptedPayload - JSON string from encryptWithPIN
 * @param pin - User's PIN (must match the one used to encrypt)
 * @returns Original plaintext string
 * @throws Error if PIN is incorrect or data is corrupted
 */
export function decryptWithPIN(encryptedPayload: string, pin: string): string {
  if (!pin || pin.length < 4) {
    throw new Error("PIN must be at least 4 characters");
  }

  const payload: EncryptedPayload = JSON.parse(encryptedPayload);
  const { data, salt1, salt2, iv1, iv2 } = payload;

  // Parse salts and IVs from hex
  const salt1WA = CryptoJS.enc.Hex.parse(salt1);
  const salt2WA = CryptoJS.enc.Hex.parse(salt2);
  const iv1WA = CryptoJS.enc.Hex.parse(iv1);
  const iv2WA = CryptoJS.enc.Hex.parse(iv2);

  // Derive keys
  const key1 = deriveKey(pin, salt1WA);
  const key2 = deriveKey(MASTER_KEY, salt2WA);

  // Decrypt second layer (master key)
  let firstLayer: string;
  try {
    const decrypted = CryptoJS.AES.decrypt(data, key2, {
      iv: iv2WA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    firstLayer = decrypted.toString(CryptoJS.enc.Utf8);

    if (!firstLayer) {
      throw new Error("Decryption produced empty result");
    }
  } catch (e) {
    throw new Error("Failed to decrypt wallet data. Data may be corrupted.");
  }

  // Decrypt first layer (user's PIN)
  let plaintext: string;
  try {
    const decrypted = CryptoJS.AES.decrypt(firstLayer, key1, {
      iv: iv1WA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error("Incorrect PIN");
    }
  } catch (e) {
    throw new Error("Incorrect PIN. Please try again.");
  }

  return plaintext;
}

/**
 * Hash a PIN for storage (to verify PIN without decrypting wallets).
 * Uses bcrypt-style hashing with PBKDF2.
 */
export function hashPIN(pin: string): string {
  const salt = CryptoJS.lib.WordArray.random(16);
  const hash = CryptoJS.PBKDF2(pin, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  });
  return `${salt.toString()}:${hash.toString()}`;
}

/**
 * Verify a PIN against a stored hash.
 */
export function verifyPIN(pin: string, storedHash: string): boolean {
  const [saltHex, expectedHash] = storedHash.split(":");
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const hash = CryptoJS.PBKDF2(pin, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  });
  return hash.toString() === expectedHash;
}
