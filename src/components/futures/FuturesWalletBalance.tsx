"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useFuturesStore } from '@/store/futuresStore';

interface WalletBalance {
  address: string;
  usdcBalance: number;
  solBalance: number;
  loading: boolean;
}

export const FuturesWalletBalance: React.FC = () => {
  const { selectedChain, walletAddresses } = useFuturesStore();
  const [balance, setBalance] = useState<WalletBalance>({
    address: '',
    usdcBalance: 0,
    solBalance: 0,
    loading: true,
  });

  useEffect(() => {
    if (walletAddresses[selectedChain]) {
      fetchBalance();
    }
  }, [selectedChain, walletAddresses]);

  const fetchBalance = async () => {
    setBalance(prev => ({ ...prev, loading: true }));
    
    try {
      const address = walletAddresses[selectedChain];
      if (!address) {
        console.log('No wallet address found in store');
        setBalance({
          address: '',
          usdcBalance: 0,
          solBalance: 0,
          loading: false,
        });
        return;
      }

      // For Solana, fetch USDC balance directly from RPC via API
      if (selectedChain === 'solana') {
        const response = await fetch(`/api/futures/wallet/balance?address=${encodeURIComponent(address)}`);
        if (response.ok) {
          const data = await response.json();
          setBalance({
            address: data.walletAddress || address,
            usdcBalance: data.usdcBalance || data.usdtBalance || 0,
            solBalance: data.solBalance || 0,
            loading: false,
          });
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch balance:', errorData);
          // Show address but zero balances on error
          setBalance({
            address,
            usdcBalance: 0,
            solBalance: 0,
            loading: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch futures wallet balance:', error);
      setBalance(prev => ({ ...prev, loading: false }));
    }
  };

  if (!walletAddresses[selectedChain]) {
    return null;
  }

  const hasLowGas = selectedChain === 'solana' && balance.solBalance < 0.01;

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark dark:text-white">Futures Wallet Balance</h3>
        <button
          onClick={fetchBalance}
          disabled={balance.loading}
          className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-darklink ${balance.loading ? 'animate-spin' : ''}`} 
            height={16} 
          />
        </button>
      </div>

      <div className="space-y-2">
        {/* USDC Balance */}
        <div className="flex items-center justify-between p-3 bg-muted/20 dark:bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <img 
              src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" 
              alt="USDC" 
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium text-dark dark:text-white">USDC</span>
          </div>
          <span className="text-sm font-semibold text-dark dark:text-white font-mono">
            {balance.loading ? '...' : (balance?.usdcBalance ?? 0).toFixed(2)}
          </span>
        </div>

        {/* SOL Balance (Gas) */}
        <div className="flex items-center justify-between p-3 bg-muted/20 dark:bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <img 
              src="https://cryptologos.cc/logos/solana-sol-logo.png" 
              alt="SOL" 
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium text-dark dark:text-white">SOL</span>
            <span className="text-xs text-muted">(Gas)</span>
          </div>
          <span className={`text-sm font-semibold font-mono ${
            hasLowGas ? 'text-error' : 'text-dark dark:text-white'
          }`}>
            {balance.loading ? '...' : (balance.solBalance ?? 0).toFixed(4)}
          </span>
        </div>

        {/* Low Gas Warning */}
        {hasLowGas && !balance.loading && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
            <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={16} />
            <div>
              <p className="text-xs font-semibold text-error">Low SOL Balance</p>
              <p className="text-xs text-error/80 mt-0.5">
                Keep at least 0.01 SOL for transaction fees
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Address */}
      <div className="mt-3 pt-3 border-t border-border dark:border-darkborder">
        <p className="text-xs text-muted mb-1">Wallet Address</p>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-dark dark:text-white bg-muted/20 dark:bg-white/5 px-2 py-1 rounded flex-1 truncate">
            {balance.address}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(balance.address)}
            className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
            title="Copy address"
          >
            <Icon icon="ph:copy" className="text-muted dark:text-darklink" height={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
