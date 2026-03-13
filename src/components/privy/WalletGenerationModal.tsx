"use client";

import React from 'react';
import { useWallet } from '@/app/context/walletContext';
import { Icon } from '@iconify/react';
import Image from 'next/image';

export function WalletGenerationModal() {
  const { isLoading, walletsGenerated, wallets } = useWallet();

  // Only show the modal if we are loading and wallets haven't been generated yet
  if (!isLoading || walletsGenerated || wallets) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b0e11]/90 backdrop-blur-lg transition-all duration-500 animate-in fade-in">
      <div className="max-w-md w-full p-8 text-center">
        {/* Animated specialized spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Pulsing glow effect */}
          <div className="absolute inset-0 bg-[#fcd535]/20 rounded-full blur-2xl animate-pulse"></div>

          {/* Main logo / icon */}
          <div className="relative z-10 w-full h-full flex items-center justify-center bg-[#161a1e] rounded-full border-2 border-[#fcd535]/30 shadow-[0_0_30px_rgba(252,213,53,0.15)] opacity-80">
            <Image
              src="/worldstreet-logo/WorldStreet4x.png"
              alt="WorldStreet"
              width={48}
              height={48}
              className="animate-pulse"
            />
          </div>

          {/* Spinning ring */}
          <div className="absolute inset-[-4px] border-t-2 border-r-2 border-[#fcd535] rounded-full animate-spin"></div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Initializing Secure Wallets</h2>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Icon icon="ph:shield-check-fill" className="text-[#0ecb81]" />
          <p className="text-sm font-medium">Securing your cross-chain infrastructure...</p>
        </div>

        {/* Progress indicator */}
        <div className="mt-8 space-y-3">
          <div className="w-full bg-[#161a1e] h-1.5 rounded-full overflow-hidden border border-[#2b3139]">
            <div className="bg-[#fcd535] h-full w-2/3 rounded-full animate-progress-indeterminate"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <span>WorldStreet Gold Cloud</span>
            <span className="animate-pulse">Syncing...</span>
          </div>
        </div>

        <p className="mt-12 text-[10px] text-slate-600 max-w-xs mx-auto">
          We are generating/fetching your unique crypto addresses.
        </p>
      </div>

      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(250%); width: 30%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
