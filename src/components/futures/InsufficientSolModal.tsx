"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

interface InsufficientSolModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredSol: number;
  currentSol: number;
  walletAddress: string;
}

export const InsufficientSolModal: React.FC<InsufficientSolModalProps> = ({
  isOpen,
  onClose,
  requiredSol,
  currentSol,
  walletAddress,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortfall = requiredSol - currentSol;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden border-warning/20 !bg-white dark:!bg-[#0d0d0d] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-warning/10 to-error/10 dark:from-warning/20 dark:to-error/20 p-4 sm:p-6 border-b border-warning/20 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 sm:p-3 bg-warning/20 rounded-xl flex-shrink-0">
                <Icon icon="ph:warning-duotone" className="text-warning" height={24} width={24} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl font-bold text-dark dark:text-white">
                  Insufficient SOL Balance
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted dark:text-gray-400 mt-1">
                  You need more SOL to initialize your Drift account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Balance Comparison */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-error/10 dark:bg-error/20 p-3 sm:p-4 rounded-xl border border-error/20">
              <p className="text-[10px] sm:text-xs font-semibold text-error/70 dark:text-error/60 mb-1 sm:mb-2 uppercase tracking-wider">
                Current Balance
              </p>
              <p className="text-lg sm:text-2xl font-bold text-error">
                {currentSol.toFixed(4)}
              </p>
              <p className="text-[10px] sm:text-xs text-error/70 mt-0.5">SOL</p>
            </div>

            <div className="bg-success/10 dark:bg-success/20 p-3 sm:p-4 rounded-xl border border-success/20">
              <p className="text-[10px] sm:text-xs font-semibold text-success/70 dark:text-success/60 mb-1 sm:mb-2 uppercase tracking-wider">
                Required
              </p>
              <p className="text-lg sm:text-2xl font-bold text-success">
                {requiredSol.toFixed(2)}
              </p>
              <p className="text-[10px] sm:text-xs text-success/70 mt-0.5">SOL</p>
            </div>
          </div>

          {/* Shortage Amount */}
          <div className="bg-warning/10 dark:bg-warning/20 p-3 sm:p-4 rounded-xl border border-warning/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-warning">
                You need to add:
              </span>
              <div className="text-right">
                <span className="text-base sm:text-lg font-bold text-warning block">
                  {shortfall.toFixed(4)} SOL
                </span>
                <span className="text-[10px] sm:text-xs text-warning/70">
                  ≈ ${(shortfall * 150).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-primary/10 dark:bg-primary/20 p-3 sm:p-4 rounded-xl border border-primary/20">
            <div className="flex items-start gap-2">
              <Icon icon="ph:info" className="text-primary flex-shrink-0 mt-0.5" height={16} />
              <div className="text-xs sm:text-sm text-dark dark:text-white min-w-0">
                <p className="font-semibold mb-1">Why do I need SOL?</p>
                <p className="text-muted dark:text-gray-400 leading-relaxed">
                  This one-time fee covers Solana network rent and transaction costs for initializing your Drift account.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-dark dark:text-white flex items-center gap-1">
              <Icon icon="ph:wallet" height={16} />
              Your Futures Wallet Address
            </label>
            
            {/* Address Display - Mobile Optimized */}
            <div className="bg-muted/50 dark:bg-white/5 p-3 rounded-xl border border-border dark:border-white/10">
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
                <p className="text-[10px] text-success mt-1 flex items-center gap-1">
                  <Icon icon="ph:check" height={12} />
                  Copied to clipboard!
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-dark dark:text-white">
              How to send SOL:
            </p>
            <ol className="space-y-2 text-xs sm:text-sm text-muted dark:text-gray-400">
              {[
                'Copy the wallet address above',
                'Open Phantom, Solflare, or any Solana wallet',
                `Send at least ${shortfall.toFixed(4)} SOL`,
                'Wait for confirmation (1-2 seconds)',
                'Click "Try Again" to initialize'
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
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

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 bg-muted/50 dark:bg-white/5 border-t border-border dark:border-white/10">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="w-full sm:w-auto px-6 touch-manipulation"
          >
            Cancel
          </Button>
          <Button 
            onClick={onClose} 
            variant="default" 
            className="w-full sm:w-auto px-6 touch-manipulation"
          >
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
