"use client";

import { SwapInterface, SwapHistory } from "@/components/swap";
import { Icon } from "@iconify/react";

export default function SwapPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Swap</h1>
        <p className="text-muted text-sm mt-1">
          Swap tokens across Ethereum and Solana with best rates
        </p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap interface - takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <SwapInterface />
        </div>

        {/* Sidebar - History and info */}
        <div className="space-y-6">
          {/* Recent Swaps */}
          <SwapHistory />

          {/* Info card */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="ph:info" className="text-primary" width={20} />
              <h3 className="font-semibold text-dark dark:text-white">How it works</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Select tokens</p>
                  <p className="text-xs text-muted">Choose what to swap and the destination token</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Review quote</p>
                  <p className="text-xs text-muted">Check the rates, fees, and estimated time</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Confirm with PIN</p>
                  <p className="text-xs text-muted">Enter your wallet PIN to sign and execute</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Track progress</p>
                  <p className="text-xs text-muted">Monitor your swap in real-time until complete</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supported chains card */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border dark:border-darkborder p-6">
            <h3 className="font-semibold text-dark dark:text-white mb-3">Supported Networks</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src="https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg" 
                  alt="Ethereum" 
                  className="w-6 h-6" 
                />
                <span className="text-sm text-dark dark:text-white">Ethereum</span>
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/solana.svg" 
                  alt="Solana" 
                  className="w-6 h-6" 
                />
                <span className="text-sm text-dark dark:text-white">Solana</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Cross-chain swaps powered by Li.Fi for best rates across 20+ DEXs and bridges
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
