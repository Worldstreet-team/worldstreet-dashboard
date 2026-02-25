"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore } from '@/store/futuresStore';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletCreated: (address: string) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onWalletCreated }) => {
  const { selectedChain } = useFuturesStore();
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/futures/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain: selectedChain }),
      });

      if (response.ok) {
        const data = await response.json();
        onWalletCreated(data.address);
        onClose();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create wallet');
      }
    } catch (error) {
      console.error('Wallet creation error:', error);
      alert('Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-darkgray rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-dark dark:text-white">Generate Futures Wallet</h3>
          <button
            onClick={onClose}
            className="text-muted dark:text-darklink hover:text-dark dark:hover:text-white"
          >
            <Icon icon="ph:x" height={24} />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Icon icon="ph:info-duotone" className="text-primary flex-shrink-0 mt-0.5" height={20} />
              <div>
                <p className="text-sm text-dark dark:text-white">
                  A dedicated futures trading wallet will be created for <span className="font-semibold">{selectedChain}</span>.
                </p>
                <p className="text-xs text-muted dark:text-darklink mt-2">
                  This wallet is managed securely and only the public address will be displayed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted dark:text-darklink">
            <div className="flex items-center gap-2">
              <Icon icon="ph:check-circle-duotone" className="text-success" height={18} />
              <span>Secure key management</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="ph:check-circle-duotone" className="text-success" height={18} />
              <span>Chain-specific wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="ph:check-circle-duotone" className="text-success" height={18} />
              <span>Instant activation</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};
