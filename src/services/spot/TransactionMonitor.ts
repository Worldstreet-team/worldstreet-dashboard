/**
 * Transaction Monitor Service
 * Monitors blockchain transactions and updates trade status
 */

import SpotTrade from '@/models/SpotTrade';
import dbConnect from '@/lib/mongodb';

const LIFI_API = 'https://li.quest/v1';

interface TransactionStatus {
  status: 'NOT_FOUND' | 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  substatusMessage?: string;
  receiving?: {
    txHash: string;
    chainId: number;
    amount: string;
  };
}

export class TransactionMonitor {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start monitoring a transaction
   */
  async startMonitoring(
    txHash: string,
    fromChainId: number,
    toChainId: number,
    userId: string
  ): Promise<void> {
    // Don't start if already monitoring
    if (this.pollingIntervals.has(txHash)) {
      return;
    }

    console.log(`[TxMonitor] Starting monitoring for ${txHash}`);

    // Poll every 10 seconds
    const interval = setInterval(async () => {
      try {
        const status = await this.checkStatus(txHash, fromChainId, toChainId);
        await this.updateTradeStatus(txHash, status, userId);

        // Stop monitoring if done or failed
        if (status.status === 'DONE' || status.status === 'FAILED') {
          this.stopMonitoring(txHash);
        }
      } catch (error) {
        console.error(`[TxMonitor] Error checking ${txHash}:`, error);
      }
    }, 10000);

    this.pollingIntervals.set(txHash, interval);

    // Stop after 10 minutes regardless
    setTimeout(() => {
      this.stopMonitoring(txHash);
    }, 600000);
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(txHash: string): void {
    const interval = this.pollingIntervals.get(txHash);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(txHash);
      console.log(`[TxMonitor] Stopped monitoring ${txHash}`);
    }
  }

  /**
   * Check transaction status via LI.FI
   */
  private async checkStatus(
    txHash: string,
    fromChainId: number,
    toChainId: number
  ): Promise<TransactionStatus> {
    try {
      const params = new URLSearchParams({
        txHash,
        fromChain: fromChainId.toString(),
        toChain: toChainId.toString(),
      });

      const response = await fetch(`${LIFI_API}/status?${params.toString()}`);
      const data = await response.json();

      return {
        status: data.status || 'NOT_FOUND',
        substatus: data.substatus,
        substatusMessage: data.substatusMessage,
        receiving: data.receiving,
      };
    } catch (error) {
      console.error('[TxMonitor] Status check error:', error);
      return { status: 'PENDING' };
    }
  }

  /**
   * Update trade status in database
   */
  private async updateTradeStatus(
    txHash: string,
    status: TransactionStatus,
    userId: string
  ): Promise<void> {
    try {
      await dbConnect();

      const trade = await SpotTrade.findOne({ txHash, userId });
      if (!trade) {
        console.warn(`[TxMonitor] Trade not found: ${txHash}`);
        return;
      }

      // Update status
      if (status.status === 'DONE') {
        trade.status = 'CONFIRMED';
        trade.confirmedAt = new Date();
        
        // Update received amount if available
        if (status.receiving?.amount) {
          trade.toAmount = status.receiving.amount;
        }
      } else if (status.status === 'FAILED') {
        trade.status = 'FAILED';
      }

      await trade.save();
      console.log(`[TxMonitor] Updated ${txHash} to ${trade.status}`);
    } catch (error) {
      console.error('[TxMonitor] Database update error:', error);
    }
  }

  /**
   * Get all monitored transactions
   */
  getMonitoredTransactions(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }
}

// Singleton instance
export const transactionMonitor = new TransactionMonitor();
