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
import { Loader2 } from 'lucide-react';

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
        setTimeout(() => {
          handleClose();
        }, 2000);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit Collateral</DialogTitle>
          <DialogDescription>
            Deposit SOL to your Drift subaccount for trading. A {feePercentage}% platform fee will be deducted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (SOL)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDepositing || success}
            />
          </div>
          
          {amountNum > 0 && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">{amountNum.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee ({feePercentage}%):</span>
                <span className="font-medium text-red-600">-{feeAmount.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Net Collateral:</span>
                <span className="font-semibold text-green-600">{collateralAmount.toFixed(4)} SOL</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-sm text-green-600 p-2 bg-green-50 rounded">
              Deposit successful! Collateral has been added to your account.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDepositing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={isDepositing || success || amountNum <= 0}
          >
            {isDepositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
