'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { TransactionState } from '@/hooks/useTransactionMonitor';

interface TransactionToastProps {
  transaction: TransactionState;
  onClose: () => void;
}

export const TransactionToast: React.FC<TransactionToastProps> = ({ transaction, onClose }) => {
  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'pending':
      case 'confirming':
        return <Icon icon="ph:circle-notch" className="animate-spin text-[#fcd535]" width={20} />;
      case 'confirmed':
        return <Icon icon="ph:check-circle" className="text-[#0ecb81]" width={20} />;
      case 'failed':
      case 'timeout':
        return <Icon icon="ph:x-circle" className="text-[#f6465d]" width={20} />;
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case 'pending':
        return 'Transaction Sent';
      case 'confirming':
        return 'Confirming...';
      case 'confirmed':
        return 'Confirmed!';
      case 'failed':
        return 'Failed';
      case 'timeout':
        return 'Timeout';
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'pending':
      case 'confirming':
        return 'border-[#fcd535]/20 bg-[#fcd535]/10';
      case 'confirmed':
        return 'border-[#0ecb81]/20 bg-[#0ecb81]/10';
      case 'failed':
      case 'timeout':
        return 'border-[#f6465d]/20 bg-[#f6465d]/10';
    }
  };

  const shortSignature = `${transaction.signature.slice(0, 4)}...${transaction.signature.slice(-4)}`;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${getStatusColor()} backdrop-blur-sm`}>
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-white">
            {getStatusText()}
          </p>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icon icon="ph:x" width={16} className="text-[#848e9c]" />
          </button>
        </div>
        
        <p className="text-xs text-[#848e9c] font-mono mb-2">
          {shortSignature}
        </p>
        
        {transaction.error && (
          <p className="text-xs text-[#f6465d] mt-1">
            {transaction.error}
          </p>
        )}
        
        {transaction.slot && (
          <p className="text-xs text-[#848e9c] mt-1">
            Slot: {transaction.slot}
          </p>
        )}
        
        {(transaction.status === 'pending' || transaction.status === 'confirming') && (
          <a
            href={`https://solscan.io/tx/${transaction.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#fcd535] hover:text-[#fcd535]/80 transition-colors inline-flex items-center gap-1 mt-2"
          >
            View on Solscan
            <Icon icon="ph:arrow-square-out" width={12} />
          </a>
        )}
      </div>
    </div>
  );
};
