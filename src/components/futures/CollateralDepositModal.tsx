"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@iconify/react';

interface CollateralDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number) => Promise<{
    success: boolean;
    feeAmount?: number;
    collateralAmount?: number;
    error?: string;
  }>;
  feePercentage?: number;
}

export const CollateralDepositModal: React.FC<CollateralDepositModalProps> = ({
  isOpen,
  onClose,
  onDeposit,
  feePercentage = 5
}) => {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = amountNum * (feePercentage / 100);
  const collateralAmount = amountNum - feeAmount;
  
  const handleDeposit = async () => {
    if (amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setIsDepositing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await onDeposit(amountNum);
      
      if (result.success) {
        setSuccess(true);
        setError(null);
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setError(result.error || 'Deposit failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDepositing(false);
    }
  };
  
  const handleClose = () => {
    setAmount('');
    setError(null);
    setSuccess(false);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#1e2329] border-[#2b3139]">
        <DialogHeader>
          <DialogTitle className="text-white">Deposit Collateral</DialogTitle>
          <DialogDescription className="text-[#848e9c]">
            Deposit USDC from your wallet to your Drift trading account. A {feePercentage}% platform fee will be deducted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[#848e9c]">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDepositing || success}
              className="bg-[#181a20] border-[#2b3139] text-white placeholder:text-[#848e9c]"
            />
          </div>
          
          {amountNum > 0 && (
            <div className="space-y-2 p-3 bg-[#181a20] border border-[#2b3139] rounded text-sm">
              <div className="flex justify-between">
                <span className="text-[#848e9c]">Total Amount:</span>
                <span className="font-medium text-white">{amountNum.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#848e9c]">Platform Fee ({feePercentage}%):</span>
                <span className="font-medium text-[#f6465d]">-{feeAmount.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between border-t border-[#2b3139] pt-2 mt-2">
                <span className="font-semibold text-white">Net Collateral:</span>
                <span className="font-semibold text-[#0ecb81]">{collateralAmount.toFixed(2)} USDC</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#2b3139]">
                <p className="text-xs text-[#848e9c]">
                  Note: SOL is used for transaction fees on Solana network
                </p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-sm text-[#f6465d] p-3 bg-[#181a20] border border-[#f6465d]/20 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-sm text-[#0ecb81] p-3 bg-[#181a20] border border-[#0ecb81]/20 rounded">
              Deposit successful! {collateralAmount.toFixed(2)} USDC added to your Drift account.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDepositing}
            className="bg-[#2b3139] border-[#3a4149] text-white hover:bg-[#3a4149]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={isDepositing || success || amountNum <= 0}
            className="bg-[#2b3139] border-[#3a4149] text-white hover:bg-[#3a4149] disabled:opacity-30"
          >
            {isDepositing && <Icon icon="svg-spinners:ring-resize" className="mr-2 h-4 w-4" />}
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
