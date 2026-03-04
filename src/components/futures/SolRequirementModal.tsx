"use client";

import React, { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-darkgray rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-warning/20 to-error/20 p-4 sm:p-6 border-b border-border dark:border-darkborder flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Icon icon="ph:warning-duotone" className="text-warning" height={20} width={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-dark dark:text-white">
                  SOL Required
                </h3>
                <p className="text-xs sm:text-sm text-muted dark:text-darklink">
                  Initialization Fee
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted dark:text-darklink hover:text-dark dark:hover:text-white transition-colors flex-shrink-0 p-1 touch-manipulation"
            >
              <Icon icon="ph:x" height={20} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Info Box */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <Icon icon="ph:info" className="text-primary flex-shrink-0 mt-0.5" height={16} />
              <div className="text-xs sm:text-sm text-dark dark:text-white min-w-0">
                <p className="font-semibold mb-1">Why do I need SOL?</p>
                <p className="text-muted dark:text-darklink leading-relaxed">
                  Your Drift subaccount needs initialization on Solana. This one-time fee (~0.035-0.05 SOL or $5-6) covers rent-exempt balance and transaction fees.
                </p>
              </div>
            </div>
          </div>

          {/* Balance Display */}
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/20 dark:bg-white/5 rounded-lg">
              <span className="text-xs sm:text-sm text-muted dark:text-darklink">Required:</span>
              <div className="text-right">
                <span className="text-sm sm:text-base md:text-lg font-bold text-dark dark:text-white block">
                  {(Number(requiredSol) || 0).toFixed(4)} SOL
                </span>
                <span className="text-[10px] sm:text-xs text-muted dark:text-darklink">
                  ≈ ${((Number(requiredSol) || 0) * 150).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/20 dark:bg-white/5 rounded-lg">
              <span className="text-xs sm:text-sm text-muted dark:text-darklink">Your Balance:</span>
              <div className="text-right">
                <span className="text-sm sm:text-base md:text-lg font-bold text-error block">
                  {(Number(currentSol) || 0).toFixed(4)} SOL
                </span>
                <span className="text-[10px] sm:text-xs text-error/70">
                  ≈ ${((Number(currentSol) || 0) * 150).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 sm:p-4 bg-error/10 border border-error/20 rounded-lg">
              <span className="text-xs sm:text-sm font-semibold text-error">Shortfall:</span>
              <div className="text-right">
                <span className="text-sm sm:text-base md:text-lg font-bold text-error block">
                  {(Number(shortfall) || 0).toFixed(4)} SOL
                </span>
                <span className="text-[10px] sm:text-xs text-error/70">
                  ≈ ${((Number(shortfall) || 0) * 150).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-semibold text-dark dark:text-white flex items-center gap-1">
              <Icon icon="ph:wallet" height={16} />
              Send SOL to this address:
            </label>
            
            {/* Mobile-Optimized Address Display */}
            <div className="bg-muted/50 dark:bg-white/5 rounded-xl border border-border dark:border-darkborder p-3">
              <div className="flex items-start gap-2">
                <code className="text-[10px] sm:text-xs font-mono text-dark dark:text-white break-all leading-relaxed flex-1">
                  {walletAddress}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="flex-shrink-0 p-2 hover:bg-muted/50 dark:hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                  title="Copy address"
                >
                  {copied ? (
                    <Icon icon="ph:check-circle" className="text-success" height={18} />
                  ) : (
                    <Icon icon="ph:copy" className="text-primary" height={18} />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-[10px] text-success mt-2 flex items-center gap-1">
                  <Icon icon="ph:check" height={12} />
                  Address copied to clipboard!
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-dark dark:text-white">
              How to send SOL:
            </p>
            <ol className="space-y-2 text-xs sm:text-sm text-muted dark:text-darklink">
              {[
                'Copy the wallet address above',
                'Open Phantom, Solflare, or any Solana wallet',
                `Send at least ${(Number(shortfall) || 0).toFixed(4)} SOL`,
                'Wait for confirmation (1-2 seconds)',
                'Click "Check Balance Again" below'
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-2.5 sm:p-3 flex items-start gap-2">
            <Icon icon="ph:warning" className="text-warning flex-shrink-0 mt-0.5" height={14} />
            <p className="text-[10px] sm:text-xs text-warning leading-relaxed">
              One-time fee. You won't need to pay this again after initialization.
            </p>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 sm:p-6 bg-muted/10 dark:bg-white/5 border-t border-border dark:border-darkborder flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-3 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white hover:bg-muted/20 dark:hover:bg-white/5 transition-colors text-sm font-medium touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold text-sm flex items-center justify-center gap-2 touch-manipulation"
          >
            <Icon icon="ph:arrow-clockwise" height={16} />
            Check Balance Again
          </button>
        </div>
      </div>
    </div>
  );
};
