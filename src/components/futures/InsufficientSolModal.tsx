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
import { AlertTriangle, Copy, Check } from 'lucide-react';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-warning/20">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-warning/10 to-error/10 dark:from-warning/20 dark:to-error/20 p-6 border-b border-warning/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/20 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-dark dark:text-white">
                  Insufficient SOL Balance
                </DialogTitle>
                <DialogDescription className="text-sm text-muted dark:text-gray-400 mt-1">
                  You need more SOL to initialize your Drift account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Balance comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-error/10 dark:bg-error/20 p-4 rounded-xl border border-error/20">
              <p className="text-xs font-semibold text-error/70 dark:text-error/60 mb-2 uppercase tracking-wider">
                Current Balance
              </p>
              <p className="text-2xl font-bold text-error">
                {currentSol.toFixed(4)} SOL
              </p>
            </div>

            <div className="bg-success/10 dark:bg-success/20 p-4 rounded-xl border border-success/20">
              <p className="text-xs font-semibold text-success/70 dark:text-success/60 mb-2 uppercase tracking-wider">
                Required Balance
              </p>
              <p className="text-2xl font-bold text-success">
                {requiredSol} SOL
              </p>
            </div>
          </div>

          {/* Shortage amount */}
          <div className="bg-warning/10 dark:bg-warning/20 p-4 rounded-xl border border-warning/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-warning">
                You need to add:
              </span>
              <span className="text-lg font-bold text-warning">
                {(requiredSol - currentSol).toFixed(4)} SOL
              </span>
            </div>
          </div>

          {/* Wallet address */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-dark dark:text-white">
              Your Futures Wallet Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted dark:bg-white/5 p-3 rounded-xl border border-border dark:border-white/10">
                <code className="text-xs text-dark dark:text-white break-all font-mono">
                  {walletAddress}
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyAddress}
                className="px-3 h-[42px]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-xl border border-primary/20">
            <p className="text-sm text-dark dark:text-white leading-relaxed">
              <span className="font-semibold">Next steps:</span> Transfer at least {requiredSol} SOL to the address above, then click "Try Again" to initialize your Drift account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-muted/50 dark:bg-white/5 border-t border-border dark:border-white/10">
          <Button onClick={onClose} variant="default" className="px-6">
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
