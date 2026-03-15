'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useUser } from '@clerk/nextjs';

interface FuturesWalletSetupProps {
  onWalletSetup?: (address: string) => void;
  className?: string;
}

export default function FuturesWalletSetup({ 
  onWalletSetup, 
  className = '' 
}: FuturesWalletSetupProps) {
  const { user, isLoaded } = useUser();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSetupWallet = async () => {
    if (!user) {
      setError('Please sign in to set up futures wallet');
      return;
    }

    try {
      setIsSettingUp(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/privy/setup-futures-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to setup futures wallet');
      }

      setSuccess(`Futures wallet ${data.source === 'created' ? 'created' : 'connected'} successfully!`);
      
      if (onWalletSetup) {
        onWalletSetup(data.wallet.address);
      }

      // Refresh the page after a short delay to update the balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error('Failed to setup futures wallet:', err);
      setError(err.message || 'Failed to setup futures wallet');
    } finally {
      setIsSettingUp(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <Icon icon="ph:spinner" width={24} className="text-[#848e9c] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <Icon icon="ph:wallet" width={48} className="mx-auto mb-3 text-[#848e9c]" />
        <h3 className="text-sm font-medium text-white mb-2">Sign In Required</h3>
        <p className="text-xs text-[#848e9c] mb-4">
          Please sign in to set up your futures trading wallet
        </p>
      </div>
    );
  }

  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="mb-4">
        <Icon icon="ph:rocket-launch" width={48} className="mx-auto mb-3 text-[#f0b90b]" />
        <h3 className="text-sm font-medium text-white mb-2">Setup Futures Wallet</h3>
        <p className="text-xs text-[#848e9c] mb-4">
          Create your Arbitrum wallet to start trading futures on Hyperliquid
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon icon="ph:warning" width={16} className="text-[#f6465d]" />
            <span className="text-xs text-[#f6465d]">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon icon="ph:check-circle" width={16} className="text-[#0ecb81]" />
            <span className="text-xs text-[#0ecb81]">{success}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSetupWallet}
        disabled={isSettingUp}
        className="w-full py-3 px-4 bg-[#f0b90b] hover:bg-[#f0b90b]/90 disabled:bg-[#f0b90b]/50 text-black font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSettingUp ? (
          <>
            <Icon icon="ph:spinner" width={16} className="animate-spin" />
            Setting up wallet...
          </>
        ) : (
          <>
            <Icon icon="ph:wallet" width={16} />
            Setup Futures Wallet
          </>
        )}
      </button>

      <div className="mt-4 text-xs text-[#848e9c]">
        <p>• Secure wallet creation via Privy</p>
        <p>• Arbitrum network for Hyperliquid trading</p>
        <p>• No private keys stored on our servers</p>
      </div>
    </div>
  );
}