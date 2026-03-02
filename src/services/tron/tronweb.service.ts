/**
 * TronWeb Initialization Service
 * 
 * Provides a singleton TronWeb instance for client-side operations
 */

let tronWebInstance: any = null;

const TRON_RPC = process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io";

/**
 * Get or create TronWeb instance
 */
export async function getTronWeb(): Promise<any> {
  if (tronWebInstance) {
    return tronWebInstance;
  }

  try {
    // Dynamically import TronWeb (client-side only)
    const TronWeb = (await import("tronweb")).default;

    // Initialize with fullHost
    tronWebInstance = new TronWeb({
      fullHost: TRON_RPC,
    });

    console.log("[TronWebService] TronWeb instance created");
    return tronWebInstance;
  } catch (error) {
    console.error("[TronWebService] Failed to initialize TronWeb:", error);
    throw new Error("Failed to initialize TronWeb");
  }
}

/**
 * Create a new TronWeb instance with a private key
 */
export async function getTronWebWithKey(privateKey: string): Promise<any> {
  try {
    const TronWeb = (await import("tronweb")).default;

    const instance = new TronWeb({
      fullHost: TRON_RPC,
      privateKey,
    });

    return instance;
  } catch (error) {
    console.error("[TronWebService] Failed to create TronWeb with key:", error);
    throw new Error("Failed to create TronWeb instance");
  }
}
