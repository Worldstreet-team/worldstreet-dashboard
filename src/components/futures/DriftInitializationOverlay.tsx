'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface DriftInitializationOverlayProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export const DriftInitializationOverlay: React.FC<DriftInitializationOverlayProps> = ({
  isLoading,
  error,
  onRetry,
}) => {
  if (!isLoading && !error) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#181a20]/95 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-[#2b3139] rounded-lg p-8 shadow-2xl">
          {isLoading && !error ? (
            // Loading State
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 border-4 border-[#fcd535]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-[#fcd535] rounded-full animate-spin"></div>

                {/* Inner pulsing circle */}
                <div className="absolute inset-3 bg-[#fcd535]/10 rounded-full animate-pulse"></div>

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon icon="ph:rocket-launch" className="text-[#fcd535]" width={32} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                Initializing Drift Protocol
              </h3>

              <p className="text-sm text-[#848e9c] mb-4">
                Setting up your trading environment...
              </p>

              <div className="space-y-2 text-xs text-[#848e9c]">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fcd535] rounded-full animate-pulse"></div>
                  <span>Connecting to Solana network</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fcd535] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <span>Loading Drift client</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fcd535] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span>Fetching account data</span>
                </div>
              </div>

              <div className="mt-6 text-xs text-[#848e9c]/60">
                This may take a few moments...
              </div>
            </div>
          ) : error ? (
            // Error State
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#f6465d]/10 rounded-full flex items-center justify-center">
                <Icon icon="ph:warning" className="text-[#f6465d]" width={32} />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                Initialization Failed
              </h3>

              <p className="text-sm text-[#848e9c] mb-4">
                We encountered an issue while setting up your trading environment.
              </p>

              <div className="bg-[#1e2329] rounded-lg p-4 mb-6">
                <p className="text-xs text-[#f6465d] font-mono break-words">
                  {error}
                </p>
              </div>

              <div className="space-y-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="w-full py-3 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon icon="ph:arrow-clockwise" width={18} />
                    Try Again
                  </button>
                )}

                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-[#2b3139] hover:bg-[#2b3139]/80 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Icon icon="ph:arrow-clockwise" width={18} />
                  Reload Page
                </button>
              </div>

              <div className="mt-6 text-xs text-[#848e9c]">
                If the problem persists, please contact support or try again later.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
