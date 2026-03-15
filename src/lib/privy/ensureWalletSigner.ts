/**
 * Ensures a Privy wallet has the server authorization key registered
 * as an additional signer. Without this, server-side transactions
 * (using authorization_private_keys) will fail with:
 * "No valid authorization keys or user signing keys available"
 */

import { privyClient } from "@/lib/privy/client";

const walletAuthId = process.env.PRIVY_WALLET_AUTH_ID;

/**
 * Add the server auth key as an additional signer on a single wallet.
 * Safe to call multiple times — silently succeeds if already added.
 */
export async function ensureWalletHasSigner(walletId: string): Promise<void> {
  if (!walletAuthId) {
    throw new Error("PRIVY_WALLET_AUTH_ID is not configured");
  }

  try {
    await (privyClient.wallets() as any).update(walletId, {
      additional_signers: [{ signer_id: walletAuthId }],
    });
    console.log(`[ensureWalletSigner] Signer added to wallet ${walletId}`);
  } catch (error: any) {
    const msg = error?.message || String(error);
    // If signer already exists, that's fine
    if (
      msg.includes("already") ||
      msg.includes("duplicate") ||
      msg.includes("conflict")
    ) {
      console.log(`[ensureWalletSigner] Wallet ${walletId} already has signer`);
      return;
    }
    throw error;
  }
}

/**
 * Ensure all wallets for a Privy user have the server auth signer.
 */
export async function ensureAllWalletsHaveSigner(
  privyUserId: string
): Promise<void> {
  if (!walletAuthId) {
    throw new Error("PRIVY_WALLET_AUTH_ID is not configured");
  }

  for (const chainType of ["ethereum", "solana"] as const) {
    try {
      for await (const wallet of privyClient.wallets().list({
        user_id: privyUserId,
        chain_type: chainType,
      })) {
        await ensureWalletHasSigner(wallet.id);
      }
    } catch (error) {
      console.error(
        `[ensureWalletSigner] Failed for ${chainType} wallets of ${privyUserId}:`,
        error
      );
    }
  }
}
