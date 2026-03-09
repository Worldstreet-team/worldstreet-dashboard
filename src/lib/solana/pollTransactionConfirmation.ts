/**
 * Solana Transaction Confirmation via HTTP Polling
 *
 * Replaces connection.confirmTransaction() which uses WebSocket subscriptions
 * (signatureSubscribe). Many RPC providers (Alchemy free tier, etc.) do NOT
 * support WebSocket methods, causing "signatureSubscribe" errors.
 *
 * This utility polls getSignatureStatuses (a regular JSON-RPC call) instead.
 */

import type { Connection } from '@solana/web3.js';

export interface PollConfirmationOptions {
    /** How often to poll, in ms. Default: 2000 (2s) */
    intervalMs?: number;
    /** Maximum time to wait before giving up, in ms. Default: 90000 (90s) */
    timeoutMs?: number;
    /** Commitment level. Default: 'confirmed' */
    commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface PollConfirmationResult {
    /** Whether the transaction is confirmed (may have succeeded or failed on-chain) */
    confirmed: boolean;
    /** If confirmed, whether the transaction itself had an error */
    err: any | null;
    /** The slot in which the transaction was processed */
    slot?: number;
    /** Human-readable description */
    message: string;
}

/**
 * Poll getSignatureStatuses until the transaction reaches the desired
 * commitment level or the timeout is reached.
 *
 * @example
 * ```ts
 * const result = await pollTransactionConfirmation(connection, signature);
 * if (!result.confirmed) {
 *   console.warn('Timed out, TX may still land');
 * } else if (result.err) {
 *   throw new Error(`TX failed on-chain: ${JSON.stringify(result.err)}`);
 * }
 * ```
 */
export async function pollTransactionConfirmation(
    connection: Connection,
    signature: string,
    options: PollConfirmationOptions = {}
): Promise<PollConfirmationResult> {
    const {
        intervalMs = 2000,
        timeoutMs = 90_000,
        commitment = 'confirmed',
    } = options;

    const startTime = Date.now();
    const commitmentRank: Record<string, number> = {
        processed: 0,
        confirmed: 1,
        finalized: 2,
    };
    const desiredRank = commitmentRank[commitment] ?? 1;

    console.log(`[pollTxConfirm] Polling ${signature.slice(0, 12)}... (${commitment}, interval=${intervalMs}ms, timeout=${timeoutMs}ms)`);

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await connection.getSignatureStatuses([signature], {
                searchTransactionHistory: true,
            });

            const status = response?.value?.[0];

            if (status) {
                // Determine the tx's commitment level
                let txRank = -1;
                if (status.confirmationStatus === 'finalized') txRank = 2;
                else if (status.confirmationStatus === 'confirmed') txRank = 1;
                else if (status.confirmationStatus === 'processed') txRank = 0;

                if (txRank >= desiredRank) {
                    // Transaction reached desired commitment
                    if (status.err) {
                        console.error(`[pollTxConfirm] TX confirmed but FAILED on-chain:`, status.err);
                        return {
                            confirmed: true,
                            err: status.err,
                            slot: status.slot,
                            message: `Transaction confirmed but failed on-chain: ${JSON.stringify(status.err)}`,
                        };
                    }

                    console.log(`[pollTxConfirm] TX confirmed (${status.confirmationStatus}) in slot ${status.slot}`);
                    return {
                        confirmed: true,
                        err: null,
                        slot: status.slot,
                        message: `Transaction confirmed (${status.confirmationStatus})`,
                    };
                }

                // Not yet at desired commitment, keep polling
                console.log(`[pollTxConfirm] TX status: ${status.confirmationStatus}, waiting for ${commitment}...`);
            }
        } catch (pollError) {
            // Network hiccup — log and retry
            console.warn('[pollTxConfirm] Poll error (will retry):', pollError instanceof Error ? pollError.message : String(pollError));
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    // Timed out
    console.warn(`[pollTxConfirm] Timed out after ${timeoutMs}ms for ${signature.slice(0, 12)}...`);
    return {
        confirmed: false,
        err: null,
        message: `Transaction not confirmed within ${(timeoutMs / 1000).toFixed(0)}s — it may still land on-chain`,
    };
}
