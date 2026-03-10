/**
 * React Hook for monitoring Drift transactions in the background
 * 
 * Provides real-time transaction status updates without blocking UI
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { transactionMonitor, TransactionStatus, TransactionUpdate } from '@/services/drift/TransactionMonitor';

export interface TransactionState {
  signature: string;
  status: TransactionStatus;
  slot?: number;
  error?: string;
  timestamp: number;
}

export function useTransactionMonitor() {
  const [transactions, setTransactions] = useState<Map<string, TransactionState>>(new Map());
  const callbacksRef = useRef<Map<string, (update: TransactionUpdate) => void>>(new Map());

  // Update transaction state
  const updateTransaction = useCallback((update: TransactionUpdate) => {
    setTransactions(prev => {
      const next = new Map(prev);
      next.set(update.signature, {
        signature: update.signature,
        status: update.status,
        slot: update.slot,
        error: update.error,
        timestamp: update.timestamp,
      });
      return next;
    });

    // Call custom callback if registered
    const customCallback = callbacksRef.current.get(update.signature);
    if (customCallback) {
      customCallback(update);
    }

    // Clean up completed transactions after 5 seconds
    if (update.status === 'confirmed' || update.status === 'failed' || update.status === 'timeout') {
      setTimeout(() => {
        setTransactions(prev => {
          const next = new Map(prev);
          next.delete(update.signature);
          return next;
        });
        callbacksRef.current.delete(update.signature);
      }, 5000);
    }
  }, []);

  // Start monitoring a transaction
  const monitorTransaction = useCallback((
    connection: any,
    signature: string,
    onUpdate?: (update: TransactionUpdate) => void
  ) => {
    console.log(`[useTransactionMonitor] Starting monitor for ${signature}`);

    // Register custom callback
    if (onUpdate) {
      callbacksRef.current.set(signature, onUpdate);
    }

    // Start monitoring
    transactionMonitor.monitorTransaction(
      connection,
      signature,
      updateTransaction
    );
  }, [updateTransaction]);

  // Get transaction state
  const getTransaction = useCallback((signature: string): TransactionState | undefined => {
    return transactions.get(signature);
  }, [transactions]);

  // Get all pending transactions
  const getPendingTransactions = useCallback((): TransactionState[] => {
    return Array.from(transactions.values()).filter(
      tx => tx.status === 'pending' || tx.status === 'confirming'
    );
  }, [transactions]);

  // Cancel monitoring
  const cancelMonitor = useCallback((signature: string) => {
    transactionMonitor.cancelMonitor(signature);
    callbacksRef.current.delete(signature);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      transactionMonitor.cleanupAll();
    };
  }, []);

  return {
    transactions: Array.from(transactions.values()),
    monitorTransaction,
    getTransaction,
    getPendingTransactions,
    cancelMonitor,
  };
}
