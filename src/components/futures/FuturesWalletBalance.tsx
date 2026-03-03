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
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-white/5">
        <h3 className="text-sm font-bold text-dark dark:text-white uppercase tracking-wide">Wallet Balance</h3>
        <button
          onClick={fetchBalance}
          disabled={balance.loading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-200"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted dark:text-gray-400 ${balance.loading ? 'animate-spin' : ''}`} 
            height={16} 
          />
        </button>
      </div>

      <div className="p-6 space-y-3">
        {/* USDC Balance */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl border border-primary/20 dark:border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
              <img 
                src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" 
                alt="USDC" 
                className="w-6 h-6 rounded-full"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary/70 dark:text-primary/60 uppercase tracking-wide">USDC</span>
              <div className="text-sm font-bold text-dark dark:text-white font-mono tabular-nums">
                {balance.loading ? '...' : (Number(balance?.usdcBalance) || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* SOL Balance (Gas) */}
        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
          hasLowGas 
            ? 'bg-gradient-to-br from-error/5 to-error/10 dark:from-error/10 dark:to-error/5 border-error/20 dark:border-error/30' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border-gray-200/50 dark:border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
              <img 
                src="https://cryptologos.cc/logos/solana-sol-logo.png" 
                alt="SOL" 
                className="w-6 h-6 rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  hasLowGas ? 'text-error/70 dark:text-error/60' : 'text-muted dark:text-gray-400'
                }`}>SOL</span>
                <span className="text-[10px] text-muted dark:text-gray-500 font-medium">(Gas)</span>
              </div>
              <div className={`text-sm font-bold font-mono tabular-nums ${
                hasLowGas ? 'text-error' : 'text-dark dark:text-white'
              }`}>
                {balance.loading ? '...' : (Number(balance.solBalance) || 0).toFixed(4)}
              </div>
            </div>
          </div>
          {hasLowGas && !balance.loading && (
            <Icon icon="ph:warning-fill" className="text-error" height={20} />
          )}
        </div>

        {/* Low Gas Warning */}
        {hasLowGas && !balance.loading && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
            <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={18} />
            <div>
              <p className="text-xs font-bold text-error">Low SOL Balance</p>
              <p className="text-xs text-error/80 mt-1">
                Keep at least 0.01 SOL for transaction fees
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Address */}
      <div className="px-6 py-4 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
        <p className="text-xs font-semibold text-muted dark:text-gray-400 mb-2 uppercase tracking-wide">Wallet Address</p>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-dark dark:text-white bg-white dark:bg-black/20 px-3 py-2 rounded-lg flex-1 truncate border border-gray-200/50 dark:border-white/10">
            {balance.address}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(balance.address)}
            className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-all duration-200 border border-gray-200/50 dark:border-white/10"
            title="Copy address"
          >
            <Icon icon="ph:copy" className="text-muted dark:text-gray-400" height={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
