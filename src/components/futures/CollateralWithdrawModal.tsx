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

interface CollateralWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw: (amount: number) => Promise<{
    success: boolean;
    error?: string;
  }>;
  availableBalance: number;
}

export const CollateralWithdrawModal: React.FC<CollateralWithdrawModalProps> = ({
  isOpen,
  onClose,
  onWithdraw,
  availableBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const amountNum = parseFloat(amount) || 0;
  
  const handleWithdraw = async () => {
    if (amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amountNum > availableBalance) {
      setError('Insufficient available balance');
      return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await onWithdraw(amountNum);
      
      if (result.success) {
        setSuccess(true);
        setError(null);
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setError(result.error || 'Withdrawal failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  const handleClose = () => {
    setAmount('');
    setError(null);
    setSuccess(false);
    onClose();
  };
  
  const handleMaxClick = () => {
    setAmount(availableBalance.toString());
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#1e2329] border-[#2b3139]">
        <DialogHeader>
          <DialogTitle className="text-white">Withdraw Collateral</DialogTitle>
          <DialogDescription className="text-[#848e9c]">
            Withdraw USDC from your Drift account back to your main wallet.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[#848e9c]">Amount (USDC)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={availableBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isWithdrawing || success}
                className="bg-[#181a20] border-[#2b3139] text-white placeholder:text-[#848e9c] pr-16"
              />
              <button
                type="button"
                onClick={handleMaxClick}
                disabled={isWithdrawing || success}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#848e9c] hover:text-white font-medium disabled:opacity-50 px-2 py-1 bg-[#2b3139] rounded"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-[#848e9c]">
              Available: {availableBalance.toFixed(2)} USDC
            </p>
          </div>
          
          {amountNum > 0 && (
            <div className="space-y-2 p-3 bg-[#181a20] border border-[#2b3139] rounded text-sm">
              <div className="flex justify-between">
                <span className="text-[#848e9c]">Withdrawal Amount:</span>
                <span className="font-medium text-white">{amountNum.toFixed(2)} USDC</span>
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
              Withdrawal successful! {amountNum.toFixed(2)} USDC will be returned to your wallet.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isWithdrawing}
            className="bg-[#2b3139] border-[#3a4149] text-white hover:bg-[#3a4149]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing || success || amountNum <= 0 || amountNum > availableBalance}
            className="bg-[#2b3139] border-[#3a4149] text-white hover:bg-[#3a4149] disabled:opacity-30"
          >
            {isWithdrawing && <Icon icon="svg-spinners:ring-resize" className="mr-2 h-4 w-4" />}
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
