/**
 * Background Transaction Monitor for Drift Protocol
 * 
 * Monitors transaction confirmations in the background without blocking UI
 * Provides real-time status updates via callbacks
 */

import { Connection } from '@solana/web3.js';

export type TransactionStatus = 
  | 'pending'    // Transaction sent to blockchain
  | 'confirming' // WebSocket subscription active
  | 'confirmed'  // Transaction confirmed on-chain
  | 'failed'     // Transaction failed
  | 'timeout';   // Confirmation timeout

export interface TransactionUpdate {
  signature: string;
  status: TransactionStatus;
  slot?: number;
  error?: string;
  timestamp: number;
}

export type TransactionCallback = (update: TransactionUpdate) => void;

class DriftTransactionMonitor {
  private activeMonitors: Map<string, {
    subscriptionId: number | null;
    timeoutId: NodeJS.Timeout | null;
    callback: TransactionCallback;
  }> = new Map();

  /**
   * Start monitoring a transaction in the background
   * Returns immediately after starting the monitor
   */
  async monitorTransaction(
    connection: Connection,
    signature: string,
    callback: TransactionCallback,
    timeoutMs: number = 60000
  ): Promise<void> {
    console.log(`[TransactionMonitor] Starting background monitor for ${signature}`);

    // Immediately notify that transaction is pending
    callback({
      signature,
      status: 'pending',
      timestamp: Date.now(),
    });

    try {
      // Get latest blockhash for confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.cleanup(signature);
        callback({
          signature,
          status: 'timeout',
          error: 'Transaction confirmation timeout',
          timestamp: Date.now(),
        });
      }, timeoutMs);

      // Subscribe to transaction updates via WebSocket
      const subscriptionId = connection.onSignature(
        signature,
        (result: any, context: any) => {
          console.log(`[TransactionMonitor] WebSocket update for ${signature}:`, {
            slot: context.slot,
            err: result.err,
          });

          this.cleanup(signature);

          if (result.err) {
            callback({
              signature,
              status: 'failed',
              error: JSON.stringify(result.err),
              slot: context.slot,
              timestamp: Date.now(),
            });
          } else {
            callback({
              signature,
              status: 'confirmed',
              slot: context.slot,
              timestamp: Date.now(),
            });
          }
        },
        'confirmed'
      );

      // Store monitor info
      this.activeMonitors.set(signature, {
        subscriptionId,
        timeoutId,
        callback,
      });

      // Notify that we're actively confirming
      callback({
        signature,
        status: 'confirming',
        timestamp: Date.now(),
      });

      console.log(`[TransactionMonitor] WebSocket subscription active (ID: ${subscriptionId})`);

    } catch (err: any) {
      console.error(`[TransactionMonitor] Error setting up monitor:`, err);
      
      // Fallback to polling if WebSocket fails
      this.fallbackToPolling(connection, signature, callback, timeoutMs);
    }
  }

  /**
   * Fallback to polling if WebSocket fails
   */
  private async fallbackToPolling(
    connection: Connection,
    signature: string,
    callback: TransactionCallback,
    timeoutMs: number
  ): Promise<void> {
    console.log(`[TransactionMonitor] Falling back to polling for ${signature}`);

    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    const poll = async () => {
      try {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeoutMs) {
          callback({
            signature,
            status: 'timeout',
            error: 'Polling timeout',
            timestamp: Date.now(),
          });
          return;
        }

        // Check transaction status
        const status = await connection.getSignatureStatus(signature);

        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          callback({
            signature,
            status: 'confirmed',
            slot: status.value.slot,
            timestamp: Date.now(),
          });
        } else if (status?.value?.err) {
          callback({
            signature,
            status: 'failed',
            error: JSON.stringify(status.value.err),
            timestamp: Date.now(),
          });
        } else {
          // Continue polling
          setTimeout(poll, pollInterval);
        }
      } catch (err: any) {
        console.error(`[TransactionMonitor] Polling error:`, err);
        callback({
          signature,
          status: 'failed',
          error: err.message,
          timestamp: Date.now(),
        });
      }
    };

    // Start polling
    poll();
  }

  /**
   * Cancel monitoring for a specific transaction
   */
  cancelMonitor(signature: string): void {
    this.cleanup(signature);
  }

  /**
   * Clean up resources for a transaction monitor
   */
  private cleanup(signature: string): void {
    const monitor = this.activeMonitors.get(signature);
    if (monitor) {
      if (monitor.timeoutId) {
        clearTimeout(monitor.timeoutId);
      }
      // Note: subscriptionId cleanup is handled by Solana connection
      this.activeMonitors.delete(signature);
      console.log(`[TransactionMonitor] Cleaned up monitor for ${signature}`);
    }
  }

  /**
   * Get all active monitors
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  /**
   * Clean up all monitors
   */
  cleanupAll(): void {
    for (const signature of this.activeMonitors.keys()) {
      this.cleanup(signature);
    }
  }
}

// Singleton instance
export const transactionMonitor = new DriftTransactionMonitor();
