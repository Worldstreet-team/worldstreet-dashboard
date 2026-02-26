"use client";

import React from 'react';
import { Icon } from '@iconify/react';

interface SolRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredSol: number;
  currentSol: number;
  shortfall: number;
  walletAddress: string;
}

export const SolRequirementModal: React.FC<SolRequirementModalProps> = ({
  isOpen,
  onClose,
  requiredSol,
  currentSol,
  shortfall,
  walletAddress,
}) => {
  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    alert('Wallet address copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-darkgray rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-warning/20 to-error/20 p-4 sm:p-6 border-b border-border dark:border-darkborder flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Icon icon="ph:warning-duotone" className="text-warning" height={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-dark dark:text-white">SOL Required</h3>
                <p className="text-xs sm:text-sm text-muted dark:text-darklink">Initialization Fee</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted dark:text-darklink hover:text-dark dark:hover:text-white transition-colors flex-shrink-0"
            >
              <Icon icon="ph:x" height={20} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Info Box */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Icon icon="ph:info-duotone" className="text-primary flex-shrink-0 mt-0.5" height={18} />
              <div className="text-xs sm:text-sm text-dark dark:text-white min-w-0">
                <p className="font-semibold mb-1 sm:mb-2">Why do I need SOL?</p>
                <p className="text-muted dark:text-darklink">
                  Your Drift subaccount needs initialization on Solana. This one-time fee (~0.035-0.05 SOL or $5-6) covers rent-exempt balance and transaction fees.
                </p>
              </div>
            </div>
          </div>

          {/* Balance Display */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/20 dark:bg-white/5 rounded-lg">
              <span className="text-xs sm:text-sm text-muted dark:text-darklink">Required:</span>
              <span className="text-base sm:text-lg font-bold text-dark dark:text-white">{(requiredSol ?? 0).toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/20 dark:bg-white/5 rounded-lg">
              <span className="text-xs sm:text-sm text-muted dark:text-darklink">Your Balance:</span>
              <span className="text-base sm:text-lg font-bold text-error">{(currentSol ?? 0).toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-error/10 border border-error/20 rounded-lg">
              <span className="text-xs sm:text-sm font-semibold text-error">Shortfall:</span>
              <span className="text-base sm:text-lg font-bold text-error">{(shortfall ?? 0).toFixed(4)} SOL</span>
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-dark dark:text-white mb-2">
              Send SOL to this address:
            </label>
            <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/20 dark:bg-white/5 rounded-lg border border-border dark:border-darkborder">
              <code className="text-[10px] sm:text-xs font-mono text-dark dark:text-white flex-1 break-all leading-relaxed">
                {walletAddress}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 sm:p-2 hover:bg-muted/30 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                title="Copy address"
              >
                <Icon icon="ph:copy" className="text-primary" height={16} />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-dark dark:text-white">How to send SOL:</p>
            <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted dark:text-darklink">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs flex items-center justify-center font-semibold">1</span>
                <span>Copy the wallet address above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs flex items-center justify-center font-semibold">2</span>
                <span>Open Phantom, Solflare, or any Solana wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs flex items-center justify-center font-semibold">3</span>
                <span>Send at least {(shortfall ?? 0).toFixed(4)} SOL</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs flex items-center justify-center font-semibold">4</span>
                <span>Wait for confirmation (1-2 seconds)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs flex items-center justify-center font-semibold">5</span>
                <span>Click "Check Balance Again" below</span>
              </li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-2.5 sm:p-3 flex items-start gap-2">
            <Icon icon="ph:warning" className="text-warning flex-shrink-0 mt-0.5" height={14} />
            <p className="text-[10px] sm:text-xs text-warning">
              One-time fee. You won't need to pay this again after initialization.
            </p>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 sm:p-6 bg-muted/10 dark:bg-white/5 border-t border-border dark:border-darkborder flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2.5 sm:py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold text-sm"
          >
            <Icon icon="ph:arrow-clockwise" className="inline mr-2" height={16} />
            Check Balance Again
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 sm:py-3 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white hover:bg-muted/20 dark:hover:bg-white/5 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
