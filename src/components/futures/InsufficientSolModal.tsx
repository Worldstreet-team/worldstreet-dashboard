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
import { AlertTriangle } from 'lucide-react';

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
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Insufficient SOL Balance</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <p>
              You need at least <span className="font-semibold text-foreground">{requiredSol} SOL</span> in your futures wallet to initialize your Drift account.
            </p>
            
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Balance:</p>
              <p className="text-lg font-semibold text-error">{currentSol.toFixed(4)} SOL</p>
            </div>

            <div className="bg-muted p-3 rounded-lg space-y-2">
              <p className="text-sm font-medium">Required Balance:</p>
              <p className="text-lg font-semibold text-success">{requiredSol} SOL</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Your Futures Wallet Address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                  {walletAddress}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAddress}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="bg-info/10 border border-info/20 p-3 rounded-lg">
              <p className="text-sm">
                Please transfer at least {requiredSol} SOL to your futures wallet address above, then try again.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose} variant="default">
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
