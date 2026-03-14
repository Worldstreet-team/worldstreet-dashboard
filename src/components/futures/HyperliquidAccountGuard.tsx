"use client";

import React from 'react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { Icon } from '@iconify/react';
import { HyperliquidAccountStatus } from './HyperliquidAccountStatus';

export const HyperliquidAccountGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized, isLoading, error, needsInitialization } = useHyperliquid();

  if (isLoading && !isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Icon icon="svg-spinners:ring-resize" className="text-[#fcd535] mb-4" width={48} />
        <p className="text-[#848e9c]">Connecting to Hyperliquid...</p>
      </div>
    );
  }

  if (error && !isInitialized) {
    return (
      <div className="p-6">
        <div className="bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-xl p-6 text-center">
          <Icon icon="ph:warning-circle" className="mx-auto text-[#f6465d] mb-4" width={48} />
          <h2 className="text-white font-bold text-lg mb-2">Connection Error</h2>
          <p className="text-[#848e9c] mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#f6465d] text-white rounded-lg font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="p-6">
        <HyperliquidAccountStatus />
      </div>
    );
  }

  return <>{children}</>;
};
