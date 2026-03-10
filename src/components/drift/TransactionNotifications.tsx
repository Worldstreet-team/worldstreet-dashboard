'use client';

import React from 'react';
import { TransactionToast } from './TransactionToast';
import { useTransactionMonitor } from '@/hooks/useTransactionMonitor';

export const TransactionNotifications: React.FC = () => {
  const { transactions, cancelMonitor } = useTransactionMonitor();

  // Only show pending/confirming transactions
  const activeTransactions = transactions.filter(
    tx => tx.status === 'pending' || tx.status === 'confirming'
  );

  if (activeTransactions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {activeTransactions.map(tx => (
        <TransactionToast
          key={tx.signature}
          transaction={tx}
          onClose={() => cancelMonitor(tx.signature)}
        />
      ))}
    </div>
  );
};
