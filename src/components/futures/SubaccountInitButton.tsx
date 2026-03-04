"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SubaccountInitButtonProps {
  hasSubaccount: boolean;
  hasFuturesWallet: boolean;
  onInitialize: () => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
}

export const SubaccountInitButton: React.FC<SubaccountInitButtonProps> = ({
  hasSubaccount,
  hasFuturesWallet,
  onInitialize,
  onSuccess
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const result = await onInitialize();
      
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Initialization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsInitializing(false);
    }
  };
  
  const isDisabled = hasSubaccount || !hasFuturesWallet || isInitializing;
  
  let buttonText = 'Initialize Subaccount';
  if (hasSubaccount) {
    buttonText = 'Subaccount Active';
  } else if (!hasFuturesWallet) {
    buttonText = 'Futures Wallet Required';
  } else if (isInitializing) {
    buttonText = 'Initializing...';
  }
  
  return (
    <div className="space-y-2">
      <Button
        onClick={handleInitialize}
        disabled={isDisabled}
        className="w-full"
      >
        {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonText}
      </Button>
      
      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}
      
      {!hasFuturesWallet && (
        <div className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
          Please create a futures wallet first before initializing your subaccount.
        </div>
      )}
    </div>
  );
};
